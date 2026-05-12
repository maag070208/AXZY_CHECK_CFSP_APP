import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ITButton,
  ITInput,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import ModernStyles from '../../../shared/theme/app.styles';
import { getClients } from '../../clients/service/client.service';
import { getUsers } from '../../kardex/service/kardex.service';
import { getLocations } from '../../locations/service/location.service';
import { getPaginatedZones } from '../../zones/service/zone.service';
import {
  createRecurring,
  getRecurringById,
  updateRecurring,
} from '../service/recurring.service';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { theme } from '../../../shared/theme/theme';
import { Icon, Card, Divider, IconButton, Avatar } from 'react-native-paper';
import { showToast } from '../../../core/store/slices/toast.slice';

export const RecurringFormScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const editConfig = route.params?.route;
  const isEditing = !!editConfig;

  // Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { title: 'Info', icon: 'information-outline' },
    { title: 'Recorrido', icon: 'map-marker-path' },
    { title: 'Asignación', icon: 'account-group-outline' },
    { title: 'Resumen', icon: 'clipboard-check-outline' },
  ];

  // Form State
  const [title, setTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<number | string>('');
  const [addedLocations, setAddedLocations] = useState<any[]>([]);
  const [selectedGuards, setSelectedGuards] = useState<number[]>([]);

  // Catalog State
  const [clients, setClients] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      const [clientRes, locRes, usersRes] = await Promise.all([
        getClients(),
        getLocations(),
        getUsers(),
      ]);

      if (clientRes.success) setClients(clientRes.data || []);
      if (locRes.success) setLocations(locRes.data || []);

      let filteredGuards: any[] = [];
      if (usersRes.success) {
        filteredGuards = (usersRes.data || []).filter((u: any) => {
          const role = typeof u.role === 'object' ? u.role.name : u.role;
          return ['GUARD', 'SHIFT', 'MAINT'].includes(role) && u.active;
        });
        setGuards(filteredGuards);
      }

      if (isEditing) {
        const fullRes = await getRecurringById(editConfig.id);
        if (fullRes && fullRes.success && fullRes.data) {
          const data = fullRes.data;
          setTitle(data.title);
          setSelectedGuards((data.guards || []).map((g: any) => g.id));

          const mappedLocs = (data.recurringLocations || []).map((rl: any) => ({
            locationId: rl.location?.id,
            locationName: rl.location?.name,
            tasks: (rl.tasks || []).map((t: any) => ({
              description: t.description,
              reqPhoto: t.reqPhoto,
            })),
          }));
          setAddedLocations(mappedLocs);

          if (data.clientId) {
            setSelectedClientId(data.clientId);
          } else if (data.recurringLocations?.[0]?.location?.clientId) {
            setSelectedClientId(data.recurringLocations[0].location.clientId);
          }
        }
      } else {
        // Default: todos los guardias asignados
        if (filteredGuards.length > 0) {
          setSelectedGuards(filteredGuards.map(g => g.id));
        }
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      dispatch(
        showToast({ message: 'Error al cargar catálogos', type: 'error' }),
      );
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchZones(String(selectedClientId));
    } else {
      setZones([]);
      setSelectedZoneId('');
    }
  }, [selectedClientId]);

  const fetchZones = async (clientId: string) => {
    try {
      const res = await getPaginatedZones({ filters: { clientId } });
      if (res.success && res.data) {
        setZones(res.data.rows || []);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleAddLocation = (locId: number) => {
    if (addedLocations.find(l => l.locationId === locId)) {
      dispatch(
        showToast({ message: 'Ubicación ya agregada', type: 'warning' }),
      );
      return;
    }
    const loc = locations.find(l => l.id === locId);
    if (loc) {
      setAddedLocations([
        ...addedLocations,
        {
          locationId: loc.id,
          locationName: loc.name,
          tasks: [],
        },
      ]);
    }
  };

  const handleAddAllFromZone = () => {
    if (!selectedZoneId) return;
    const zoneLocs = locations.filter(
      l =>
        String(l.zoneId) === String(selectedZoneId) &&
        !addedLocations.find(al => al.locationId === l.id),
    );

    if (zoneLocs.length === 0) {
      dispatch(
        showToast({
          message: 'No hay nuevas ubicaciones en esta zona',
          type: 'info',
        }),
      );
      return;
    }

    const newLocs = zoneLocs.map(l => ({
      locationId: l.id,
      locationName: l.name,
      tasks: [],
    }));

    setAddedLocations([...addedLocations, ...newLocs]);
    dispatch(
      showToast({
        message: `${newLocs.length} ubicaciones añadidas`,
        type: 'success',
      }),
    );
    setSelectedZoneId('');
  };

  const handleRemoveLocation = (index: number) => {
    const copy = [...addedLocations];
    copy.splice(index, 1);
    setAddedLocations(copy);
  };

  const handleAddTask = (locIndex: number) => {
    const copy = [...addedLocations];
    copy[locIndex].tasks.push({ description: '', reqPhoto: false });
    setAddedLocations(copy);
  };

  const handleRemoveTask = (locIndex: number, taskIndex: number) => {
    const copy = [...addedLocations];
    copy[locIndex].tasks.splice(taskIndex, 1);
    setAddedLocations(copy);
  };

  const handleTaskChange = (
    locIndex: number,
    taskIndex: number,
    text: string,
  ) => {
    const copy = [...addedLocations];
    copy[locIndex].tasks[taskIndex].description = text;
    setAddedLocations(copy);
  };

  const toggleGuard = (guardId: number) => {
    setSelectedGuards(prev =>
      prev.includes(guardId)
        ? prev.filter(id => id !== guardId)
        : [...prev, guardId],
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        title,
        clientId: selectedClientId || undefined,
        locations: addedLocations,
        guardIds: selectedGuards,
      };

      const res = isEditing
        ? await updateRecurring(editConfig.id, payload)
        : await createRecurring(payload);

      if (res && res.success) {
        dispatch(showToast({ message: 'Ruta guardada', type: 'success' }));
        navigation.goBack();
      } else {
        dispatch(showToast({ message: 'Error al guardar', type: 'error' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = () => {
    if (currentStep === 0) {
      if (!title.trim() || !selectedClientId) {
        dispatch(
          showToast({
            message: 'Completa el título y selecciona un cliente',
            type: 'warning',
          }),
        );
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (addedLocations.length === 0) {
        dispatch(
          showToast({
            message: 'Agrega al menos una ubicación',
            type: 'warning',
          }),
        );
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedGuards.length === 0) {
        dispatch(
          showToast({ message: 'Asigna al menos un guardia', type: 'warning' }),
        );
        return;
      }
      setCurrentStep(3);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loadingFull}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Sincronizando información...</Text>
      </View>
    );
  }

  const availableLocations = locations.filter(l => {
    const alreadyAdded = addedLocations.find(al => al.locationId === l.id);
    if (alreadyAdded) return false;
    if (selectedClientId && String(l.clientId) !== String(selectedClientId))
      return false;
    if (selectedZoneId && String(l.zoneId) !== String(selectedZoneId))
      return false;
    return true;
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ModernStyles.flexContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Icon
              source="map-marker-path"
              size={32}
              color={theme.colors.primary}
            />
          </View>
          <ITText
            variant="headlineSmall"
            weight="bold"
            color={theme.colors.primary}
            textAlign="center"
          >
            {isEditing ? 'Editar Ruta' : 'Nueva Ruta'}
          </ITText>
          <ITText
            variant="bodySmall"
            color={theme.colors.slate500}
            textAlign="center"
          >
            Configura el recorrido recurrente y las tareas de inspección
          </ITText>
        </View>

        <Card style={styles.formCard} elevation={2}>
          <Card.Content>
            {/* Stepper */}
            <View style={styles.stepperContainer}>
              {steps.map((step, idx) => {
                const isActive = idx <= currentStep;
                const isCompleted = idx < currentStep;
                return (
                  <ITTouchableOpacity
                    key={idx}
                    style={styles.stepItem}
                    onPress={() => {
                      if (idx <= currentStep) setCurrentStep(idx);
                    }}
                    disabled={idx > currentStep}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        isActive && styles.stepCircleActive,
                        isCompleted && styles.stepCircleCompleted,
                      ]}
                    >
                      {isCompleted ? (
                        <Icon source="check" size={16} color="#FFFFFF" />
                      ) : (
                        <Icon
                          source={step.icon}
                          size={16}
                          color={isActive ? '#FFFFFF' : '#94A3B8'}
                        />
                      )}
                    </View>
                    <ITText
                      variant="labelSmall"
                      weight={isActive ? 'bold' : 'medium'}
                      color={isActive ? theme.colors.primary : '#94A3B8'}
                      numberOfLines={1}
                    >
                      {step.title}
                    </ITText>
                    {idx < steps.length - 1 && <View style={styles.stepLine} />}
                  </ITTouchableOpacity>
                );
              })}
            </View>

            <Divider style={styles.divider} />

            {/* Step 0 - Identificación */}
            {currentStep === 0 && (
              <View>
                <View style={styles.inputGroup}>
                  <ITInput
                    label="Nombre de la ruta"
                    placeholder="Ej: Ronda Perimetral Nocturna"
                    value={title}
                    onChangeText={setTitle}
                    leftIcon="alphabetical"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <SearchComponent
                    label="Cliente Operativo"
                    placeholder="Selecciona cliente..."
                    options={clients.map(c => ({ label: c.name, value: c.id }))}
                    value={selectedClientId}
                    onSelect={val => {
                      setSelectedClientId(val);
                      setSelectedZoneId('');
                      setAddedLocations([]);
                      setSelectedGuards([]);
                    }}
                  />
                </View>
              </View>
            )}

            {/* Step 1 - Recorrido */}
            {currentStep === 1 && (
              <View>
                <View style={styles.inputGroup}>
                  <ITText
                    variant="labelMedium"
                    weight="bold"
                    color={theme.colors.slate700}
                    style={{ marginBottom: 12 }}
                  >
                    Vincular Puntos
                  </ITText>
                  <View style={styles.filtersWrapper}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <SearchComponent
                          label="Por Zona"
                          placeholder="Selecciona zona..."
                          options={zones.map(z => ({
                            label: z.name,
                            value: z.id,
                          }))}
                          value={selectedZoneId}
                          onSelect={setSelectedZoneId}
                          disabled={!selectedClientId}
                        />
                      </View>
                      <IconButton
                        icon="plus-box-multiple"
                        mode="contained"
                        containerColor="#D1FAE5"
                        iconColor={theme.colors.primary}
                        onPress={handleAddAllFromZone}
                        disabled={!selectedZoneId}
                        style={{ marginTop: 24, borderRadius: 12 }}
                      />
                    </View>
                    <View style={{ marginTop: 12 }}>
                      <SearchComponent
                        label="Ubicación Individual"
                        placeholder="Añadir individual..."
                        options={availableLocations.map(l => ({
                          label: l.name,
                          value: l.id,
                        }))}
                        value=""
                        onSelect={val => handleAddLocation(val as any)}
                        disabled={!selectedClientId}
                      />
                    </View>
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Hoja de Ruta ({addedLocations.length})
                  </Text>
                  {addedLocations.map((loc, idx) => (
                    <View
                      key={`${loc.locationId}-${idx}`}
                      style={styles.taskLocationGroup}
                    >
                      <View style={styles.taskLocationHeader}>
                        <View style={styles.locIndexSmallActive}>
                          <Text style={styles.locIndexTextActive}>
                            {idx + 1}
                          </Text>
                        </View>
                        <Text style={styles.taskLocationTitle}>
                          {loc.locationName}
                        </Text>
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center' }}
                        >
                          <TouchableOpacity
                            onPress={() => handleAddTask(idx)}
                            style={{ marginRight: 10 }}
                          >
                            <ITText
                              variant="labelSmall"
                              weight="black"
                              color={theme.colors.primary}
                            >
                              + TAREA
                            </ITText>
                          </TouchableOpacity>
                          <IconButton
                            icon="trash-can-outline"
                            iconColor="#EF4444"
                            size={18}
                            onPress={() => handleRemoveLocation(idx)}
                            style={{ margin: 0 }}
                          />
                        </View>
                      </View>

                      {loc.tasks.map((task: any, tIdx: number) => (
                        <View key={tIdx} style={styles.taskInputRow}>
                          <TextInput
                            mode="flat"
                            placeholder="Describa la consigna..."
                            value={task.description}
                            onChangeText={text =>
                              handleTaskChange(idx, tIdx, text)
                            }
                            style={styles.taskFlatInput}
                            dense
                          />
                          <IconButton
                            icon="close"
                            iconColor="#EF4444"
                            size={16}
                            onPress={() => handleRemoveTask(idx, tIdx)}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                  {addedLocations.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Icon source="map-marker-off" size={32} color="#94A3B8" />
                      <Text style={styles.emptyText}>
                        Sin puntos vinculados
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Step 2 - Asignación */}
            {currentStep === 2 && (
              <View>
                <View style={styles.inputGroup}>
                  <View style={styles.infoBox}>
                    <Icon
                      source="shield-account"
                      size={24}
                      color={PRIMARY_COLOR}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoBoxTitle}>
                        Personal Responsable
                      </Text>
                      <Text style={styles.infoBoxText}>
                        Selecciona los guardias habilitados para esta ruta.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.guardsGrid}>
                    {guards
                      .filter(
                        g =>
                          !selectedClientId ||
                          String(g.clientId) === String(selectedClientId),
                      )
                      .map(guard => (
                        <ITTouchableOpacity
                          key={guard.id}
                          onPress={() => toggleGuard(guard.id)}
                          style={[
                            styles.roleCard,
                            selectedGuards.includes(guard.id) &&
                              styles.roleCardActive,
                          ]}
                        >
                          <Avatar.Text
                            size={24}
                            label={`${guard.name[0]}${
                              guard.lastName?.[0] || ''
                            }`}
                            color={
                              selectedGuards.includes(guard.id)
                                ? theme.colors.primary
                                : '#64748B'
                            }
                            style={{
                              backgroundColor: selectedGuards.includes(guard.id)
                                ? '#fff'
                                : '#F1F5F9',
                            }}
                          />
                          <ITText
                            variant="labelSmall"
                            weight="bold"
                            color={
                              selectedGuards.includes(guard.id)
                                ? '#fff'
                                : '#475569'
                            }
                            style={{ flex: 1 }}
                            numberOfLines={1}
                          >
                            {guard.name} {guard.lastName}
                          </ITText>
                          {selectedGuards.includes(guard.id) && (
                            <Icon source="check" size={16} color="#fff" />
                          )}
                        </ITTouchableOpacity>
                      ))}
                  </View>
                </View>
              </View>
            )}

            {/* Step 3 - Resumen */}
            {currentStep === 3 && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryHeader}>
                  <Icon
                    source="calendar-clock"
                    size={40}
                    color={PRIMARY_COLOR}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.summaryTitle}>{title}</Text>
                    <Text style={styles.summarySubtitle}>
                      Resumen de Configuración
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>CLIENTE</Text>
                      <Text style={styles.summaryValue}>
                        {clients.find(
                          c => String(c.id) === String(selectedClientId),
                        )?.name || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>PARADAS</Text>
                      <Text style={styles.summaryValue}>
                        {addedLocations.length} Ubicaciones
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summarySection}>
                    <Text style={styles.summaryLabel}>PERSONAL ASIGNADO</Text>
                    <View style={styles.summaryBadges}>
                      {selectedGuards.map(id => {
                        const g = guards.find(guard => guard.id === id);
                        return (
                          <View key={id} style={styles.summaryBadge}>
                            <Text style={styles.summaryBadgeText}>
                              {g?.name} {g?.lastName}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.navigationButtons}>
              {currentStep > 0 && (
                <ITButton
                  mode="outlined"
                  onPress={() => setCurrentStep(prev => prev - 1)}
                  style={styles.navButton}
                >
                  Atrás
                </ITButton>
              )}

              {currentStep < steps.length - 1 ? (
                <ITButton
                  mode="contained"
                  onPress={validateCurrentStep}
                  style={[styles.navButton, styles.nextButton]}
                >
                  Continuar
                </ITButton>
              ) : (
                <ITButton
                  mode="contained"
                  onPress={handleSave}
                  loading={loading}
                  disabled={loading}
                  style={[styles.navButton, styles.submitButton]}
                >
                  {isEditing ? 'Actualizar' : 'Finalizar'}
                </ITButton>
              )}
            </View>

            <ITButton
              mode="text"
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancelar
            </ITButton>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  headerCard: {
    marginBottom: 24,
    alignItems: 'center',
    paddingTop: 10,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    top: 18,
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 20,
  },
  guardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleCardActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filtersWrapper: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  taskLocationGroup: {
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  locIndexSmallActive: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locIndexTextActive: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  taskLocationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  taskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    paddingLeft: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskFlatInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 13,
    height: 44,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  navButton: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    marginTop: 12,
  },
  loadingFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    gap: 12,
    alignItems: 'center',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
  },
  infoBoxText: {
    fontSize: 12,
    color: '#0EA5E9',
  },
  summaryContainer: {
    gap: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryContent: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  summarySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  summaryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
});
