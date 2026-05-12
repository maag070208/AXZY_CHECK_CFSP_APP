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
import { ITButton, ITInput, ITText } from '../../../shared/components';
import { createZone, updateZone } from '../../zones/service/zone.service';
import { IZone } from '../../zones/type/zone.types';

import { theme } from '../../../shared/theme/theme';

interface ClientZoneFormModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  clientId: string;
  editZone?: IZone | null;
  onDelete?: (id: string) => void;
}

const validationSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
});

export const ClientZoneFormModal = ({
  visible,
  onDismiss,
  onSuccess,
  clientId,
  editZone,
  onDelete,
}: ClientZoneFormModalProps) => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setForm({
        name: editZone?.name || '',
      });
      setErrors({});
    }
  }, [visible, editZone]);

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
      const payload = {
        ...form,
        clientId,
      };

      let res;
      if (editZone) {
        res = await updateZone(editZone.id, payload);
      } else {
        res = await createZone(payload);
      }

      if (res.success) {
        dispatch(
          showToast({
            message: `Zona ${
              editZone ? 'actualizada' : 'creada'
            } correctamente`,
            type: 'success',
          }),
        );
        onSuccess();
        if (!keepOpen) {
          onDismiss();
        } else {
          setForm({
            name: '',
          });
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
            {editZone ? 'Editar Zona' : 'Nueva Zona'}
          </ITText>
          <IconButton icon="close" onPress={onDismiss} disabled={loading} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ITText variant="bodyMedium" style={styles.subtitle}>
            Define las zonas operativas para este cliente para organizar mejor
            las rondas y servicios.
          </ITText>

          <View style={styles.formGroup}>
            <ITInput
              label="Nombre de la Zona"
              value={form.name}
              onChangeText={val => handleChange('name', val)}
              placeholder="Ej. Zona Norte / Sector A"
              error={!!errors.name}
              leftIcon="map-marker-outline"
            />
            {errors.name && (
              <ITText style={styles.errorText}>{errors.name}</ITText>
            )}
          </View>

          {editZone && (
            <View style={styles.deleteSection}>
              <ITButton
                label="Eliminar Zona"
                onPress={() => {
                  onDismiss();
                  setTimeout(() => onDelete?.(editZone.id), 600);
                }}
                mode="outlined"
                icon="delete-outline"
                textColor="#EF4444"
                style={{ borderColor: '#FEE2E2' }}
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
              disabled={loading}
              loading={loading}
            />
          </View>
          {!editZone && (
            <ITButton
              label="Guardar y Crear Otra"
              onPress={() => handleSave(true)}
              mode="contained"
              style={[
                styles.saveButton,
                { marginTop: 8, backgroundColor: '#EEF2FF' },
              ]}
              textColor={theme.colors.primary}
              disabled={loading}
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
  subtitle: {
    color: theme.colors.slate500,
    marginBottom: 24,
    lineHeight: 20,
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
  deleteSection: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 24,
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
