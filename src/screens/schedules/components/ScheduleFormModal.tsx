import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, IconButton, Switch } from 'react-native-paper';
import { TimePickerModal } from 'react-native-paper-dates';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITButton,
  ITInput,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import {
  createSchedule,
  ISchedule,
  updateSchedule,
} from '../service/schedules.service';
import { theme } from '../../../shared/theme/theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  initialData?: ISchedule | null;
  loading?: boolean;
}

export const ScheduleFormModal = ({
  visible,
  onDismiss,
  onSuccess,
  initialData,
  loading: externalLoading,
}: Props) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [isActive, setIsActive] = useState(true);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>(
    'start',
  );

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setStartTime(initialData.startTime);
        setEndTime(initialData.endTime);
        setIsActive(initialData.active);
      } else {
        setName('');
        setStartTime('07:00');
        setEndTime('15:00');
        setIsActive(true);
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!name.trim()) {
      dispatch(
        showToast({ message: 'El nombre es obligatorio', type: 'error' }),
      );
      return;
    }

    setLoading(true);
    try {
      const payload = { name, startTime, endTime, active: isActive };
      const res = initialData
        ? await updateSchedule(initialData.id, payload)
        : await createSchedule(payload);

      if (res.success) {
        dispatch(
          showToast({ message: 'Horario guardado con éxito', type: 'success' }),
        );
        onSuccess();
        onDismiss();
      } else {
        dispatch(
          showToast({
            message: res.messages?.[0] || 'Error al guardar',
            type: 'error',
          }),
        );
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error inesperado', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RNModal
      visible={visible}
      onRequestClose={onDismiss}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ITText variant="headlineSmall" weight="bold" color="#0F172A">
              {initialData ? 'Editar Horario' : 'Nuevo Horario'}
            </ITText>
            <ITText variant="bodySmall" color="#64748B">
              Configura los límites de tiempo del turno
            </ITText>
          </View>
          <IconButton
            icon="close"
            containerColor="#F1F5F9"
            iconColor="#64748B"
            size={24}
            onPress={onDismiss}
            disabled={loading || externalLoading}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Info */}
          <View style={styles.section}>
            <ITInput
              label="Nombre del Horario"
              placeholder="Ej. Matutino, Nocturno B"
              value={name}
              onChangeText={setName}
              leftIcon="clock-edit-outline"
              disabled={loading || externalLoading}
            />
          </View>

          {/* Time Selection */}
          <View style={styles.timePickerContainer}>
            <ITText
              variant="labelMedium"
              weight="bold"
              color="#64748B"
              style={styles.sectionLabel}
            >
              INTERVALO DE TIEMPO
            </ITText>
            <View style={styles.timePickerRow}>
              <ITTouchableOpacity
                style={styles.timeField}
                onPress={() => {
                  setTimePickerTarget('start');
                  setTimePickerVisible(true);
                }}
                disabled={loading || externalLoading}
              >
                <ITText
                  variant="labelSmall"
                  weight="bold"
                  color={theme.colors.primary}
                >
                  ENTRADA
                </ITText>
                <View style={styles.timeValueBox}>
                  <Icon
                    source="clock-start"
                    size={22}
                    color={theme.colors.primary}
                  />
                  <ITText variant="headlineSmall" weight="bold" color="#0F172A">
                    {startTime}
                  </ITText>
                </View>
              </ITTouchableOpacity>

              <ITTouchableOpacity
                style={styles.timeField}
                onPress={() => {
                  setTimePickerTarget('end');
                  setTimePickerVisible(true);
                }}
                disabled={loading || externalLoading}
              >
                <ITText variant="labelSmall" weight="bold" color="#94A3B8">
                  SALIDA
                </ITText>
                <View style={styles.timeValueBox}>
                  <Icon source="clock-end" size={22} color="#64748B" />
                  <ITText variant="headlineSmall" weight="bold" color="#0F172A">
                    {endTime}
                  </ITText>
                </View>
              </ITTouchableOpacity>
            </View>
          </View>

          {/* Status Switch */}
          <View style={styles.statusCard}>
            <View style={styles.statusInfo}>
              <ITText variant="bodyLarge" weight="bold" color="#0F172A">
                Horario Operacional
              </ITText>
              <ITText variant="bodySmall" color="#64748B">
                {isActive
                  ? 'Actualmente visible en asignaciones'
                  : 'Oculto para nuevas asignaciones'}
              </ITText>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              color={theme.colors.primary}
              disabled={loading || externalLoading}
            />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <ITButton
            label="Cancelar"
            mode="outlined"
            onPress={onDismiss}
            style={styles.footerBtn}
            disabled={loading || externalLoading}
            textColor="#64748B"
          />
          <ITButton
            label={initialData ? 'Actualizar' : 'Crear Horario'}
            onPress={handleSave}
            loading={loading}
            disabled={loading || externalLoading}
            style={[
              styles.footerBtn,
              { backgroundColor: theme.colors.primary },
            ]}
          />
        </View>

        <TimePickerModal
          locale="es"
          visible={timePickerVisible}
          onDismiss={() => setTimePickerVisible(false)}
          onConfirm={({ hours, minutes }) => {
            const formatted = `${hours.toString().padStart(2, '0')}:${minutes
              .toString()
              .padStart(2, '0')}`;
            if (timePickerTarget === 'start') setStartTime(formatted);
            else setEndTime(formatted);
            setTimePickerVisible(false);
          }}
          hours={parseInt(
            (timePickerTarget === 'start' ? startTime : endTime).split(':')[0],
          )}
          minutes={parseInt(
            (timePickerTarget === 'start' ? startTime : endTime).split(':')[1],
          )}
        />
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 24,
    gap: 32,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginBottom: 12,
  },
  timePickerContainer: {
    gap: 4,
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeField: {
    flex: 1,
    gap: 8,
  },
  timeValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    height: 80,
    gap: 12,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusInfo: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerBtn: {
    flex: 1,
    borderRadius: 16,
    height: 52,
  },
});
