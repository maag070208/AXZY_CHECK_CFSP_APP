import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import * as Yup from 'yup';
import { ITButton, ITInput, ITText } from '../../../shared/components';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { theme } from '../../../shared/theme/theme';
import { getClients } from '../../clients/service/client.service';
import { IClient } from '../../clients/type/client.types';

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
    <RNModal
      visible={visible}
      onRequestClose={onDismiss}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <ITText variant="headlineSmall" weight="800" style={styles.title}>
              {initialData ? 'Editar Zona' : 'Nueva Zona'}
            </ITText>
            <ITText variant="bodySmall" color={theme.colors.slate500}>
              {initialData
                ? `Actualizando ${initialData.name}`
                : 'Configuración de nuevo sector'}
            </ITText>
          </View>
          <IconButton
            icon="close"
            onPress={onDismiss}
            disabled={loading}
            containerColor="#F1F5F9"
            iconColor={theme.colors.slate500}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
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
              isValid,
            }) => (
              <View style={{ flex: 1 }}>
                <ScrollView
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  <View style={styles.formContent}>
                    <View style={styles.section}>
                      <ITText
                        variant="labelSmall"
                        weight="bold"
                        color={theme.colors.slate500}
                        style={styles.sectionLabel}
                      >
                        ASIGNACIÓN DE CLIENTE
                      </ITText>
                      <View style={styles.inputGroup}>
                        <SearchComponent
                          label="CLIENTE *"
                          placeholder="Selecciona un cliente"
                          options={clients.map(c => ({
                            label: c.name,
                            value: c.id,
                          }))}
                          value={values.clientId}
                          onSelect={val => setFieldValue('clientId', val)}
                          error={touched.clientId && errors.clientId}
                        />
                      </View>
                    </View>

                    <View style={styles.section}>
                      <ITText
                        variant="labelSmall"
                        weight="bold"
                        color={theme.colors.slate500}
                        style={styles.sectionLabel}
                      >
                        DETALLES DE LA ZONA
                      </ITText>
                      <View style={styles.inputGroup}>
                        <ITInput
                          label="NOMBRE DE LA ZONA *"
                          placeholder="Ej. Nivel 1, Estacionamiento, etc."
                          value={values.name}
                          onChangeText={handleChange('name')}
                          onBlur={handleBlur('name')}
                          error={touched.name ? errors.name : ''}
                          leftIcon="map-marker-outline"
                        />
                      </View>
                    </View>

                    <View style={styles.infoBox}>
                      <Icon
                        source="information-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <ITText
                        variant="labelSmall"
                        color={theme.colors.primary}
                        style={{ flex: 1 }}
                      >
                        Las zonas permiten organizar los puntos de escaneo por
                        secciones dentro de una propiedad.
                      </ITText>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.footer}>
                  <View style={styles.actionButtonsRow}>
                    <ITButton
                      label="Cancelar"
                      onPress={onDismiss}
                      mode="outlined"
                      style={styles.footerBtn}
                      disabled={loading}
                      textColor={theme.colors.slate500}
                    />
                    <View style={{ width: 12 }} />
                    <ITButton
                      label={initialData ? 'Actualizar' : 'Guardar'}
                      onPress={() => handleSubmit()}
                      mode="contained"
                      style={[
                        styles.footerBtn,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      loading={loading}
                      disabled={loading || !isValid}
                    />
                  </View>
                </View>
              </View>
            )}
          </Formik>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontWeight: '800',
    color: '#1E293B',
    fontSize: 22,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContent: {
    padding: 20,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    marginBottom: 16,
    letterSpacing: 1.5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  footerBtn: {
    flex: 1,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
  },
});
