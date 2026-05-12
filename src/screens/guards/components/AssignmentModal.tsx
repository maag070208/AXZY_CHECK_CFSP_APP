import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Modal } from 'react-native';
import {
  ActivityIndicator,
  HelperText,
  useTheme,
  IconButton,
  Divider,
  Icon,
} from 'react-native-paper';
import {
  createAssignment,
  getAllAssignments,
} from '../../assignments/service/assignment.service';
import { getLocations } from '../../locations/service/location.service';
import { getClients } from '../../clients/service/client.service';
import { updateUser } from '../../users/service/user.service';
import {
  SearchComponent,
  ITButton,
  ITText,
  ITInput,
  ITBadge,
  ITScreenWrapper,
} from '../../../shared/components';
import { AssignmentStatus } from '../../assignments/service/assignment.types';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { COLORS } from '../../../shared/utils/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  guardId: string;
  clientId?: string | number;
  onSuccess: () => void;
}

export const AssignmentModal = ({
  visible,
  onDismiss,
  guardId,
  clientId: initialClientId,
  onSuccess,
}: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id: currentUserId } = useSelector(
    (state: RootState) => state.userState,
  );

  // Data Loading
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [locationOptions, setLocationOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [clientOptions, setClientOptions] = useState<
    { label: string; value: string }[]
  >([]);

  // State
  const [activeClientId, setActiveClientId] = useState<
    string | number | undefined
  >(initialClientId);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [error, setError] = useState('');

  // Tasks State
  const [tasks, setTasks] = useState<
    { description: string; reqPhoto: boolean }[]
  >([]);
  const [tempTaskDesc, setTempTaskDesc] = useState('');
  const [tempTaskPhoto, setTempTaskPhoto] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveClientId(initialClientId);
      loadData(initialClientId);
      // Reset Form
      setSelectedLocationId(null);
      setSelectedClientId(null);
      setNotes('');
      setError('');
      setTasks([]);
      setTempTaskDesc('');
      setTempTaskPhoto(false);
    }
  }, [visible, initialClientId]);

  const loadData = async (cId?: string | number) => {
    if (!cId) {
      loadClients();
      return;
    }

    setLoadingLocations(true);
    try {
      const [locRes, assignRes] = await Promise.all([
        getLocations(),
        getAllAssignments({ guardId }),
      ]);

      const allLocations = (locRes.data as any[]) ?? [];
      const activeAssignments = (assignRes.data as any[]) ?? [];

      const busyLocationIds = activeAssignments
        .filter((a: any) =>
          [
            AssignmentStatus.PENDING,
            AssignmentStatus.CHECKING,
            AssignmentStatus.UNDER_REVIEW,
            AssignmentStatus.ANOMALY,
          ].includes(a.status),
        )
        .map((a: any) => a.locationId);

      const availableLocations = allLocations.filter(
        l => l.clientId === cId && !busyLocationIds.includes(l.id),
      );

      const formatted = availableLocations.map(l => ({
        label: l.name,
        value: l.id,
      }));
      setLocationOptions(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const res = await getClients();
      if (res.success && res.data) {
        setClientOptions(
          res.data.map((c: any) => ({ label: c.name, value: c.id })),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleReassignClient = async () => {
    if (!selectedClientId) return;

    setReassigning(true);
    dispatch(showLoader(true));
    try {
      const res = await updateUser(guardId, { clientId: selectedClientId });
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Cliente Asignado' });
        setActiveClientId(selectedClientId);
        loadData(selectedClientId);
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error al asignar cliente' });
    } finally {
      setReassigning(false);
      dispatch(showLoader(false));
    }
  };

  const addTask = () => {
    if (!tempTaskDesc.trim()) return;
    setTasks([
      ...tasks,
      { description: tempTaskDesc, reqPhoto: tempTaskPhoto },
    ]);
    setTempTaskDesc('');
    setTempTaskPhoto(false);
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleSubmit = async () => {
    if (!selectedLocationId) {
      setError('Debe seleccionar una ubicación');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        guardId,
        locationId: selectedLocationId,
        notes,
        tasks: tasks.length > 0 ? tasks : undefined,
        assignedBy: currentUserId?.toString() || guardId,
      };

      await createAssignment(payload);
      onSuccess();
    } catch (err: any) {
      console.log(err);
      const backendMsgs = err.response?.data?.messages;
      const backendMsg = Array.isArray(backendMsgs)
        ? backendMsgs[0]
        : backendMsgs;
      const finalError =
        backendMsg || err.message || 'Error al crear asignación';

      if (finalError.includes('asignación activa')) {
        setError(
          'El guardia ya tiene una asignación activa para esta ubicación.',
        );
      } else {
        setError(finalError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onDismiss} animationType="slide">
      <ITScreenWrapper
        padding={false}
        scrollable={false}
        style={styles.container}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={COLORS.textPrimary}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <ITText
              variant="titleLarge"
              weight="bold"
              color={COLORS.textPrimary}
            >
              Asignar Inspección
            </ITText>
            <ITText variant="labelSmall" color={COLORS.textSecondary}>
              Nueva asignación para el guardia
            </ITText>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!activeClientId ? (
            <View style={styles.noClientContainer}>
              <View style={styles.warningCircle}>
                <Icon source="domain-plus" size={48} color={COLORS.primary} />
              </View>
              <ITText
                variant="titleMedium"
                weight="bold"
                color={COLORS.textPrimary}
                style={{ textAlign: 'center' }}
              >
                Asignar Cliente Primero
              </ITText>
              <ITText
                variant="bodyMedium"
                color={COLORS.textSecondary}
                style={{ textAlign: 'center', marginTop: 8, marginBottom: 24 }}
              >
                Este guardia no tiene un cliente asignado. Seleccione uno para
                ver sus ubicaciones disponibles.
              </ITText>

              <View style={{ width: '100%' }}>
                <SearchComponent
                  label="Seleccionar Cliente"
                  placeholder="Buscar cliente..."
                  options={clientOptions}
                  value={selectedClientId || ''}
                  onSelect={val => setSelectedClientId(val)}
                  loading={loadingClients}
                />
                <ITButton
                  label="ASIGNAR CLIENTE"
                  onPress={handleReassignClient}
                  disabled={!selectedClientId || reassigning}
                  loading={reassigning}
                  style={{ marginTop: 24 }}
                />
                <ITButton
                  label="CANCELAR"
                  mode="text"
                  onPress={onDismiss}
                  style={{ marginTop: 8 }}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ITText weight="bold" color={COLORS.textPrimary}>
                    Ubicación
                  </ITText>
                  <ITBadge
                    label="Filtrado por Cliente"
                    variant="surface"
                    size="small"
                  />
                </View>
                {loadingLocations ? (
                  <ActivityIndicator
                    color={COLORS.primary}
                    style={{ marginVertical: 20 }}
                  />
                ) : (
                  <>
                    <SearchComponent
                      label="Seleccionar Ubicación"
                      placeholder="Buscar ubicación..."
                      options={locationOptions}
                      value={selectedLocationId || ''}
                      onSelect={val => {
                        setSelectedLocationId(val);
                        setError('');
                      }}
                      error={error}
                    />
                    {locationOptions.length === 0 && !loadingLocations && (
                      <ITText
                        variant="labelSmall"
                        color="#F59E0B"
                        style={{ marginTop: 8, fontStyle: 'italic' }}
                      >
                        No hay ubicaciones disponibles para este cliente.
                      </ITText>
                    )}
                  </>
                )}
              </View>

              <Divider style={styles.divider} />

              <View style={styles.section}>
                <ITText
                  weight="bold"
                  color={COLORS.textPrimary}
                  style={{ marginBottom: 16 }}
                >
                  Tareas Adicionales
                </ITText>
                <View style={styles.addTaskRow}>
                  <View style={{ flex: 1 }}>
                    <ITInput
                      placeholder="Tarea..."
                      value={tempTaskDesc}
                      onChangeText={setTempTaskDesc}
                      inputStyle={{
                        height: 40,
                      }}
                      label={''}
                    />
                  </View>
                  <IconButton
                    icon="plus"
                    mode="contained"
                    containerColor={COLORS.primary}
                    iconColor="#fff"
                    size={25}
                    onPress={addTask}
                    disabled={!tempTaskDesc.trim()}
                    style={{
                      marginLeft: 8,
                      marginVertical: 0,
                      marginBottom: 18,
                      borderRadius: 10,
                    }}
                  />
                </View>

                {tasks.length > 0 && (
                  <View style={styles.taskList}>
                    {tasks.map((task, index) => (
                      <View key={index} style={styles.taskItem}>
                        <View style={{ flex: 1 }}>
                          <ITText weight="medium" color={COLORS.textPrimary}>
                            {task.description}
                          </ITText>
                        </View>
                        <IconButton
                          icon="close-circle-outline"
                          size={20}
                          iconColor={COLORS.error}
                          onPress={() => removeTask(index)}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Divider style={styles.divider} />

              <View style={styles.section}>
                <ITText
                  weight="bold"
                  color={COLORS.textPrimary}
                  style={{ marginBottom: 16 }}
                >
                  Observaciones
                </ITText>
                <ITInput
                  placeholder="Notas generales para el guardia..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 100 }}
                />
                {error ? (
                  <HelperText type="error" visible>
                    {error}
                  </HelperText>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>

        {activeClientId && (
          <View style={[styles.footer, { paddingBottom: 10 }]}>
            <ITButton
              label="CANCELAR"
              mode="outlined"
              onPress={onDismiss}
              style={{ flex: 1, marginRight: 8 }}
              labelStyle={{ fontSize: 13 }}
            />
            <ITButton
              label="CREAR ASIGNACIÓN"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !selectedLocationId}
              style={{ flex: 1.5 }}
              labelStyle={{ fontSize: 13 }}
            />
          </View>
        )}
      </ITScreenWrapper>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 8,
    marginTop: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  noClientContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  warningCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});
