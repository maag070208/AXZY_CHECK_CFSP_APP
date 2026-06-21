import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { z } from 'zod';

import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import {
  ITButton,
  ITInput,
  ITText,
  SearchComponent,
} from '../../../shared/components';
import { getClientById, getClients } from '../../clients/service/client.service';
import {
  createLocation,
  updateLocation,
} from '../../locations/service/location.service';
import { ILocation } from '../../locations/type/location.types';
import { getZonesByClient } from '../../zones/service/zone.service';

import { theme } from '../../../shared/theme/theme';
import { IZone } from '../../zones/type/zone.types';
import { IClient } from '../../clients/type/client.types';

interface ClientLocationFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (keepOpen?: boolean) => void;
  clientId: string;
  editLocation?: ILocation | null;
  onDelete?: (id: string) => void;
  onPrintQR?: (item: ILocation) => void;
  preselectedZoneId?: string;
}

const validationSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  zoneId: z
    .string()
    .uuid('Debes seleccionar una zona válida')
    .or(z.string().min(1, 'Debes seleccionar una zona válida')),
});

export const ClientLocationFormModal = ({
  visible,
  onDismiss,
  onSuccess,
  clientId,
  editLocation,
  onDelete,
  onPrintQR,
  preselectedZoneId,
}: ClientLocationFormModalProps) => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<IZone[]>([]);
  const [client, setClient] = useState<IClient | null>(null);

  const [form, setForm] = useState({
    name: '',
    zoneId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const isValid = form.name.trim().length >= 3 && form.zoneId.length > 0;

  useEffect(() => {
    if (visible) {
      setForm({
        name: editLocation?.name || '',
        zoneId: editLocation?.zoneId || preselectedZoneId || '',
      });
      setErrors({});
      fetchZones();
      fetchClient();
    }
  }, [visible, editLocation, clientId]);

  const fetchClient = async () => {
    if (!clientId) return;
    try {
      const res = await getClientById(clientId);
      if (res.success && res.data) {
        setClient(res.data);
      }
    } catch (error) {
      console.log('Error fetching client', error);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await getZonesByClient(clientId);
      if (res.success && res.data) {
        setZones(res.data);
      }
    } catch (error) {
      console.log('Error fetching zones', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async (keepOpen = false) => {
    try {
      validationSchema.parse(form);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);
    try {
      const selectedZone = zones.find(z => z.id === form.zoneId);
      
      const composedName = editLocation 
        ? form.name 
        : `${client?.name || 'S/C'}-${selectedZone?.name || 'S/Z'}-${form.name}`;

      const payload = {
        ...form,
        name: composedName,
        zoneName: selectedZone?.name || '',
        clientId,
      };

      let res;
      if (editLocation) {
        res = await updateLocation(editLocation.id, payload);
      } else {
        res = await createLocation(payload);
      }

      if (res.success) {
        onSuccess(keepOpen);
        if (keepOpen) {
          setForm(prev => ({ ...prev, name: '' }));
          setSuccessMsg('¡Ubicación creada!');
          setTimeout(() => setSuccessMsg(''), 2000);
        }
      } else {
        dispatch(
          showToast({
            message: res.messages?.[0] || 'Error al guardar',
            type: 'error',
          }),
        );
      }
    } catch (err) {
      const result = err as TResult<void>;
      dispatch(
        showToast({
          message: result?.messages?.[0] || 'Ocurrió un error inesperado',
          type: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const zoneOptions = zones.map(z => ({ label: z.name, value: z.id }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <ITText variant="titleLarge" weight="700" style={styles.headerTitle}>
            {editLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
          </ITText>
          <IconButton icon="close" onPress={onDismiss} disabled={loading} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {successMsg ? (
            <View style={styles.successBanner}>
              <ITText style={{ color: '#065F46', fontWeight: '700', fontSize: 14 }}>
                {successMsg}
              </ITText>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <ITInput
              label="Nombre de Ubicación"
              value={form.name}
              onChangeText={val => handleChange('name', val)}
              placeholder="Ej. Entrada Principal"
              error={!!errors.name}
              leftIcon="map-marker-outline"
            />
            {errors.name && (
              <ITText style={styles.errorText}>{errors.name}</ITText>
            )}
          </View>

          <View style={styles.formGroup}>
            <SearchComponent
              label="Zona Asignada"
              value={form.zoneId}
              options={zoneOptions}
              onSelect={val => handleChange('zoneId', String(val))}
              placeholder="Seleccionar Zona"
              searchPlaceholder="Buscar zona..."
              error={!!errors.zoneId}
            />
            {errors.zoneId && (
              <ITText style={styles.errorText}>{errors.zoneId}</ITText>
            )}
          </View>

          {editLocation && (
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
              <ITButton
                label="Imprimir QR"
                onPress={() => {
                  onDismiss();
                  setTimeout(() => onPrintQR?.(editLocation), 600);
                }}
                mode="outlined"
                icon="qrcode"
                style={{ flex: 1, borderColor: '#CBD5E1' }}
                textColor="#334155"
              />
              <ITButton
                label="Eliminar"
                onPress={() => {
                  onDismiss();
                  setTimeout(() => onDelete?.(editLocation.id), 600);
                }}
                mode="outlined"
                icon="delete"
                textColor="#EF4444"
                style={{ flex: 1, borderColor: '#FCA5A5' }}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.actionButtonsRow}>
            <ITButton
              label="Cancelar"
              onPress={onDismiss}
              mode="outlined"
              style={[styles.saveButton, { flex: 1, marginRight: 8 }]}
              disabled={loading}
              textColor={theme.colors.slate500}
            />
            <ITButton
              label="Guardar"
              onPress={() => handleSave(false)}
              mode="contained"
              style={[
                styles.saveButton,
                { flex: 1, backgroundColor: theme.colors.primary },
              ]}
              disabled={loading || !isValid}
              loading={loading}
            />
          </View>
          {!editLocation && (
            <ITButton
              label="Guardar y Nueva"
              onPress={() => handleSave(true)}
              mode="contained"
              style={[
                styles.saveButton,
                { marginTop: 8, backgroundColor: '#EEF2FF' },
              ]}
              textColor={theme.colors.primary}
              disabled={loading || !isValid}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    color: theme.colors.slate900,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 14,
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  saveButton: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
});
