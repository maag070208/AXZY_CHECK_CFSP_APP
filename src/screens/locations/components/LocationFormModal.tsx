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
import { IconButton, Icon } from 'react-native-paper';
import * as Yup from 'yup';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getClients } from '../../clients/service/client.service';
import { getPaginatedZones } from '../../zones/service/zone.service';
import { ILocation, ILocationCreate } from '../type/location.types';
import { ITButton, ITInput, ITText, ITCard } from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';

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
          <View style={styles.headerInfo}>
            <ITText variant="headlineSmall" weight="800" style={styles.title}>
              {initialData ? 'Editar Ubicación' : 'Nuevo Punto'}
            </ITText>
            <ITText variant="bodySmall" color={theme.colors.slate500}>
              Configuración de punto de control
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
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={() => {}}
          >
            {({
              handleChange,
              handleBlur,
              setFieldValue,
              values,
              errors,
              touched,
              isValid,
            }) => {
              useEffect(() => {
                if (values.clientId) loadZones(values.clientId);
              }, [values.clientId]);

              const handleSaveAndNew = async () => {
                const success = await onSubmit(values, true);
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
                const success = await onSubmit(values, false);
                if (success) {
                  onDismiss();
                }
              };

              return (
                <View style={{ flex: 1 }}>
                  <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                  >
                    <View style={styles.formContent}>
                      {showSuccess && (
                        <ITCard style={styles.successBanner}>
                          <Icon
                            source="check-circle"
                            color="#059669"
                            size={20}
                          />
                          <ITText
                            variant="bodySmall"
                            weight="700"
                            style={{ color: '#065F46', marginLeft: 8 }}
                          >
                            ¡Punto creado! Puedes agregar otro.
                          </ITText>
                        </ITCard>
                      )}

                      <View style={styles.section}>
                        <ITText
                          variant="labelSmall"
                          weight="bold"
                          color={theme.colors.slate500}
                          style={styles.sectionLabel}
                        >
                          ASIGNACIÓN PRINCIPAL
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
                            onSelect={val => {
                              setFieldValue('clientId', val);
                              setFieldValue('zoneId', '');
                            }}
                            error={touched.clientId && errors.clientId}
                            disabled={!!initialData || loading}
                          />
                        </View>

                        <View style={styles.inputGroup}>
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
                      </View>

                      <View style={styles.section}>
                        <ITText
                          variant="labelSmall"
                          weight="bold"
                          color={theme.colors.slate500}
                          style={styles.sectionLabel}
                        >
                          DETALLES DEL PUNTO
                        </ITText>

                        <ITInput
                          label="NOMBRE DEL PUNTO *"
                          placeholder="Ej: Recepción, Oficina 101"
                          value={values.name}
                          onChangeText={handleChange('name')}
                          onBlur={handleBlur('name')}
                          error={touched.name && errors.name}
                          disabled={loading}
                          containerStyle={styles.inputGroup}
                          ref={nameInputRef}
                        />
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.footer}>
                    <View style={styles.actionButtonsRow}>
                      <ITButton
                        label="Cancelar"
                        onPress={onDismiss}
                        mode="outlined"
                        style={[styles.footerBtn, { flex: 1 }]}
                        disabled={loading}
                        textColor={theme.colors.slate500}
                      />
                      <View style={{ width: 12 }} />
                      <ITButton
                        label={initialData ? 'Actualizar' : 'Guardar'}
                        onPress={handleNormalSubmit}
                        mode="contained"
                        style={[
                          styles.footerBtn,
                          { flex: 1, backgroundColor: theme.colors.primary },
                        ]}
                        disabled={loading || !isValid}
                        loading={loading}
                      />
                    </View>
                    {!initialData && (
                      <ITButton
                        label="Guardar y Nueva"
                        onPress={handleSaveAndNew}
                        mode="contained"
                        style={[
                          styles.footerBtn,
                          { marginTop: 12, backgroundColor: '#EEF2FF' },
                        ]}
                        textColor={theme.colors.primary}
                        disabled={loading || !isValid}
                        icon="plus"
                      />
                    )}
                  </View>
                </View>
              );
            }}
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
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
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
});
