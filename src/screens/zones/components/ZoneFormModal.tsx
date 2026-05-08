import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  IconButton,
  Surface,
  Divider,
  HelperText,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { getClients } from '../../clients/service/client.service';
import { IClient } from '../../clients/type/client.types';
import { SearchComponent } from '../../../shared/components/SearchComponent';

const ZoneSchema = Yup.object().shape({
  name: Yup.string().required('El nombre de la zona es requerido'),
  clientId: Yup.string().required('Debes seleccionar un cliente'),
});

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
  initialData?: any;
}

export const ZoneFormModal = ({
  visible,
  onDismiss,
  onSubmit,
  loading,
  initialData,
}: Props) => {
  const [clients, setClients] = useState<IClient[]>([]);
  const [fetchingClients, setFetchingClients] = useState(false);

  useEffect(() => {
    if (visible) {
      loadClients();
    }
  }, [visible]);

  const loadClients = async () => {
    setFetchingClients(true);
    try {
      const res = await getClients();
      if (res.success) {
        setClients(res.data || []);
      }
    } catch (error) {
      console.error('Error loading clients for zone modal:', error);
    } finally {
      setFetchingClients(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Surface style={styles.surface} elevation={5}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {initialData ? 'Editar Zona' : 'Nueva Zona'}
                </Text>
                <Text style={styles.subtitle}>
                  {initialData
                    ? `Actualizando ${initialData.name}`
                    : 'Agrega un nuevo sector para inspecciones'}
                </Text>
              </View>
              <IconButton icon="close" onPress={onDismiss} size={20} />
            </View>

            <Divider />

            <Formik
              initialValues={{
                name: initialData?.name || '',
                clientId: initialData?.clientId || '',
              }}
              enableReinitialize
              validationSchema={ZoneSchema}
              onSubmit={onSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                setFieldValue,
              }) => (
                <View style={styles.form}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Nombre de la Zona</Text>
                      <TextInput
                        mode="outlined"
                        placeholder="Ej. Nivel 1, Estacionamiento, etc."
                        value={values.name}
                        onChangeText={handleChange('name')}
                        onBlur={handleBlur('name')}
                        error={touched.name && !!errors.name}
                        outlineStyle={styles.inputOutline}
                        left={<TextInput.Icon icon="map-marker-outline" />}
                      />
                      {touched.name && errors.name && (
                        <HelperText type="error">{errors.name}</HelperText>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <SearchComponent
                        label="Asignar a Cliente"
                        placeholder="Selecciona un cliente..."
                        options={clients.map(c => ({
                          label: c.name,
                          value: c.id,
                        }))}
                        value={values.clientId}
                        onSelect={val => setFieldValue('clientId', val)}
                        error={touched.clientId && errors.clientId}
                      />
                    </View>

                    <View style={styles.infoBox}>
                      <IconButton
                        icon="information-outline"
                        size={20}
                        iconColor="#065911"
                      />
                      <Text style={styles.infoText}>
                        Las zonas permiten organizar los puntos de escaneo por
                        secciones dentro de una propiedad.
                      </Text>
                    </View>
                  </ScrollView>

                  <View style={styles.footer}>
                    <Button
                      mode="outlined"
                      onPress={onDismiss}
                      style={styles.button}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => handleSubmit()}
                      style={[styles.button, styles.submitButton]}
                      loading={loading}
                      disabled={loading}
                      buttonColor="#065911"
                    >
                      {initialData ? 'Guardar' : 'Crear'}
                    </Button>
                  </View>
                </View>
              )}
            </Formik>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    padding: 20,
  },
  surface: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  form: {
    marginTop: 20,
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputOutline: {
    borderRadius: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#065911',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    borderRadius: 12,
    flex: 1,
  },
  submitButton: {
    elevation: 2,
  },
});
