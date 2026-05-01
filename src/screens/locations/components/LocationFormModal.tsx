import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Button,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { ILocation, ILocationCreate } from '../type/location.types';
import { getClients } from '../../clients/service/client.service';
import { getPaginatedZones } from '../../zones/service/zone.service';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: ILocationCreate) => void;
  initialData?: ILocation | null;
  loading?: boolean;
}

const validationSchema = Yup.object().shape({
  clientId: Yup.number().required('El cliente es obligatorio'),
  zoneId: Yup.number().required('El recurrente (zona) es obligatorio'),
  name: Yup.string().required('El nombre de ubicación es obligatorio'),
  reference: Yup.string().optional(),
});

export const LocationFormModal = ({
  visible,
  onDismiss,
  onSubmit,
  initialData,
  loading,
}: Props) => {
  const [clients, setClients] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorType, setSelectorType] = useState<'CLIENT' | 'ZONE'>('CLIENT');

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

  const loadZones = async (clientId: number) => {
    setLoadingZones(true);
    const res = await getPaginatedZones({ filters: { clientId } });
    if (res.success) setZones(res.data.rows || []);
    setLoadingZones(false);
  };

  const initialValues = {
    clientId: initialData?.clientId || '',
    zoneId: initialData?.zoneId || '',
    name: initialData?.name || '',
    reference: initialData?.reference || '',
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {initialData ? 'Editar Ubicación' : 'Nueva Ubicación'}
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Sincronizado con el catálogo de clientes y zonas
          </Text>
        </View>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={validationSchema}
          onSubmit={values => {
            onSubmit({
              clientId: Number(values.clientId),
              zoneId: Number(values.zoneId),
              name: values.name,
              reference: values.reference,
            });
          }}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            values,
            errors,
            touched,
          }) => {
            // Trigger zone load when client changes
            useEffect(() => {
              if (values.clientId) loadZones(Number(values.clientId));
            }, [values.clientId]);

            const selectedClientName = clients.find(c => c.id === values.clientId)?.name || 'Selecciona un cliente';
            const selectedZoneName = zones.find(z => z.id === values.zoneId)?.name || 'Selecciona una zona';

            return (
              <View style={styles.formContent}>
                {/* Selector de Cliente */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>CLIENTE *</Text>
                  <TouchableOpacity 
                    style={[styles.selector, touched.clientId && errors.clientId && styles.errorBorder]}
                    onPress={() => {
                        setSelectorType('CLIENT');
                        setSelectorVisible(true);
                    }}
                  >
                    <Text style={values.clientId ? styles.selectorText : styles.placeholderText}>{selectedClientName}</Text>
                    <IconButton icon="chevron-down" size={20} />
                  </TouchableOpacity>
                  {touched.clientId && errors.clientId && (
                    <HelperText type="error" visible={true}>{errors.clientId}</HelperText>
                  )}
                </View>

                {/* Selector de Zona */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>RECURRENTE (ZONA) *</Text>
                  <TouchableOpacity 
                    style={[styles.selector, touched.zoneId && errors.zoneId && styles.errorBorder, !values.clientId && styles.disabledSelector]}
                    disabled={!values.clientId}
                    onPress={() => {
                        setSelectorType('ZONE');
                        setSelectorVisible(true);
                    }}
                  >
                    <Text style={values.zoneId ? styles.selectorText : styles.placeholderText}>
                        {loadingZones ? 'Cargando...' : selectedZoneName}
                    </Text>
                    <IconButton icon="chevron-down" size={20} />
                  </TouchableOpacity>
                  {touched.zoneId && errors.zoneId && (
                    <HelperText type="error" visible={true}>{errors.zoneId}</HelperText>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>NOMBRE UBICACIÓN *</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Ej: Recepción, Oficina 101"
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                    error={touched.name && !!errors.name}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />
                  {touched.name && errors.name && (
                    <HelperText type="error" visible={true}>{errors.name}</HelperText>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>REFERENCIA (OPCIONAL)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Ej: A un lado del elevador"
                    value={values.reference}
                    onChangeText={handleChange('reference')}
                    onBlur={handleBlur('reference')}
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                  />
                </View>

                <View style={styles.actions}>
                  <Button mode="text" onPress={onDismiss} textColor="#64748b">Cancelar</Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleSubmit()} 
                    loading={loading} 
                    disabled={loading}
                    buttonColor="#059669"
                    style={styles.saveButton}
                  >
                    Guardar Ubicación
                  </Button>
                </View>

                {/* Sub-modal para selección de ítems */}
                <Portal>
                  <Modal
                    visible={selectorVisible}
                    onDismiss={() => setSelectorVisible(false)}
                    contentContainerStyle={styles.selectorModal}
                  >
                    <Text style={styles.selectorTitle}>
                        {selectorType === 'CLIENT' ? 'Seleccionar Cliente' : 'Seleccionar Zona'}
                    </Text>
                    <FlatList
                        data={selectorType === 'CLIENT' ? clients : zones}
                        keyExtractor={item => String(item.id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.optionItem}
                                onPress={() => {
                                    if (selectorType === 'CLIENT') {
                                        setFieldValue('clientId', item.id);
                                        setFieldValue('zoneId', ''); // Reset zone when client changes
                                    } else {
                                        setFieldValue('zoneId', item.id);
                                    }
                                    setSelectorVisible(false);
                                }}
                            >
                                <Text style={styles.optionText}>{item.name}</Text>
                                {(selectorType === 'CLIENT' ? values.clientId : values.zoneId) === item.id && (
                                    <Icon name="check" size={20} color="#059669" />
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptySelector}>
                                {loadingClients || loadingZones ? <ActivityIndicator color="#059669" /> : <Text>No se encontraron resultados</Text>}
                            </View>
                        )}
                    />
                  </Modal>
                </Portal>
              </View>
            );
          }}
        </Formik>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontWeight: '800',
    color: '#1e293b',
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
  },
  formContent: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 1,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingLeft: 16,
    height: 52,
    backgroundColor: '#f8fafc',
  },
  disabledSelector: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  errorBorder: {
    borderColor: '#ef4444',
  },
  selectorText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#f8fafc',
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  saveButton: {
    borderRadius: 12,
  },
  selectorModal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 30,
    borderRadius: 20,
    maxHeight: '70%',
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize: 15,
    color: '#334155',
  },
  emptySelector: {
    padding: 40,
    alignItems: 'center',
  }
});

// Mock Icon component if not available
const Icon = ({ name, size, color }: any) => (
    <IconButton icon={name} size={size} iconColor={color} style={{ margin: 0 }} />
);