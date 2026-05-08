import { Formik } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import * as Yup from 'yup';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getClients } from '../../clients/service/client.service';
import { getPaginatedZones } from '../../zones/service/zone.service';
import { ILocation, ILocationCreate } from '../type/location.types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: ILocationCreate, keepOpen?: boolean) => Promise<boolean>;
  initialData?: ILocation | null;
  loading?: boolean;
  preselectedClientId?: string | number;
}

const validationSchema = Yup.object().shape({
  clientId: Yup.string().required('El cliente es obligatorio'),
  zoneId: Yup.string().required('El recurrente (zona) es obligatorio'),
  name: Yup.string().required('El nombre de ubicación es obligatorio'),
});

export const LocationFormModal = ({
  visible,
  onDismiss,
  onSubmit,
  initialData,
  loading,
  preselectedClientId,
}: Props) => {
  const [clients, setClients] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const nameInputRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      loadClients();
    }
  }, [visible]);

  const loadClients = async () => {
    setLoadingClients(true);
    const res = await getClients();
    if (res.success) setClients(res.data || []);
    setLoadingClients(false);
  };

  const loadZones = async (clientId: string) => {
    setLoadingZones(true);
    const res = await getPaginatedZones({ filters: { clientId } });
    if (res.success) setZones(res.data.rows || []);
    setLoadingZones(false);
  };

  const initialValues = {
    clientId: initialData?.clientId || preselectedClientId || '',
    zoneId: initialData?.zoneId || '',
    name: initialData?.name || '',
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
            <Text variant="headlineSmall" style={styles.title}>
              {initialData ? 'Editar Ubicación' : 'Nueva Ubicación'}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Sincronizado con el catálogo de clientes y zonas
            </Text>
          </View>
          <IconButton icon="close" onPress={onDismiss} disabled={loading} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Formik
              initialValues={initialValues}
              enableReinitialize
              validationSchema={validationSchema}
              onSubmit={() => {}} // Not used as we use custom buttons
            >
              {({
                handleChange,
                handleBlur,
                setFieldValue,
                values,
                errors,
                touched,
              }) => {
                useEffect(() => {
                  if (values.clientId) loadZones(values.clientId);
                }, [values.clientId]);

                const handleSaveAndNew = async () => {
                  const selectedClient = clients.find(c => String(c.id) === String(values.clientId));
                  const selectedZone = zones.find(z => String(z.id) === String(values.zoneId));
                  
                  const clientName = selectedClient?.name || 'S/C';
                  const zoneName = selectedZone?.name || 'S/Z';
                  const prefix = `${clientName}-${zoneName}-`;
                  
                  let finalName = values.name;
                  if (!finalName.startsWith(prefix)) {
                    finalName = `${prefix}${finalName}`;
                  }

                  const success = await onSubmit({ ...values, name: finalName }, true);
                  if (success) {
                    setShowSuccess(true);
                    setFieldValue('name', '');
                    setTimeout(() => {
                      setShowSuccess(false);
                      nameInputRef.current?.focus();
                    }, 1000);
                  }
                };

                const handleNormalSubmit = async () => {
                  const selectedClient = clients.find(c => String(c.id) === String(values.clientId));
                  const selectedZone = zones.find(z => String(z.id) === String(values.zoneId));
                  
                  const clientName = selectedClient?.name || 'S/C';
                  const zoneName = selectedZone?.name || 'S/Z';
                  const prefix = `${clientName}-${zoneName}-`;
                  
                  let finalName = values.name;
                  if (!finalName.startsWith(prefix)) {
                    finalName = `${prefix}${finalName}`;
                  }

                  const success = await onSubmit({ ...values, name: finalName }, false);
                  if (success) {
                    onDismiss();
                  }
                };

                return (
                  <View style={styles.formContent}>
                    {showSuccess && (
                      <View style={styles.successBanner}>
                        <IconButton
                          icon="check-circle"
                          iconColor="#059669"
                          size={20}
                          style={{ margin: 0 }}
                        />
                        <Text style={styles.successText}>
                          ¡Ubicación creada!
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.inputContainer,
                        loading && { opacity: 0.6 },
                      ]}
                      pointerEvents={loading ? 'none' : 'auto'}
                    >
                      <SearchComponent
                        label="CLIENTE *"
                        placeholder="Selecciona un cliente"
                        options={clients.map(c => ({
                          label: c.name,
                          value: c.id,
                        }))}
                        value={values.clientId}
                        onSelect={val => {
                          setFieldValue('clientId', val);
                          setFieldValue('zoneId', '');
                        }}
                        error={touched.clientId && errors.clientId}
                        disabled={!!initialData || loading}
                      />
                    </View>

                    <View
                      style={[
                        styles.inputContainer,
                        loading && { opacity: 0.6 },
                      ]}
                      pointerEvents={loading ? 'none' : 'auto'}
                    >
                      <SearchComponent
                        label="RECURRENTE (ZONA) *"
                        placeholder={
                          values.clientId
                            ? 'Selecciona una zona'
                            : 'Primero selecciona un cliente'
                        }
                        disabled={
                          !!initialData ||
                          !values.clientId ||
                          loadingZones ||
                          loading
                        }
                        options={zones.map(z => ({
                          label: z.name,
                          value: z.id,
                        }))}
                        value={values.zoneId}
                        onSelect={val => setFieldValue('zoneId', val)}
                        error={touched.zoneId && errors.zoneId}
                        helperText={
                          loadingZones ? 'Cargando zonas...' : undefined
                        }
                      />
                    </View>

                    <View
                      style={[
                        styles.inputContainer,
                        loading && { opacity: 0.6 },
                      ]}
                      pointerEvents={loading ? 'none' : 'auto'}
                    >
                      <Text style={styles.label}>NOMBRE UBICACIÓN *</Text>
                      <TextInput
                        ref={nameInputRef}
                        mode="outlined"
                        placeholder="Ej: Recepción, Oficina 101"
                        value={values.name}
                        onChangeText={handleChange('name')}
                        onBlur={handleBlur('name')}
                        error={touched.name && !!errors.name}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        disabled={loading}
                      />
                      {touched.name && errors.name && (
                        <HelperText type="error" visible={true}>
                          {errors.name}
                        </HelperText>
                      )}
                    </View>

                    <View style={styles.actions}>
                      {!initialData && (
                        <Button
                          mode="outlined"
                          onPress={handleSaveAndNew}
                          style={styles.button}
                          loading={loading}
                          disabled={
                            loading ||
                            !values.name ||
                            !values.clientId ||
                            !values.zoneId
                          }
                          textColor="#059669"
                        >
                          Guardar y Nueva
                        </Button>
                      )}
                      <Button
                        mode="contained"
                        onPress={handleNormalSubmit}
                        loading={loading}
                        disabled={loading}
                        buttonColor="#059669"
                        style={[styles.button, styles.saveButton]}
                      >
                        {initialData ? 'Actualizar' : 'Guardar'}
                      </Button>
                    </View>
                  </View>
                );
              }}
            </Formik>
          </ScrollView>
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
  subtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContent: {
    padding: 20,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingVertical: 20,
  },
  button: {
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    borderColor: '#059669',
  },
  saveButton: {
    borderRadius: 12,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 13,
  },
});
