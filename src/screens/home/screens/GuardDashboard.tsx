import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Portal, Surface, useTheme } from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { COLORS } from '../../../shared/utils/constants';
import {
  endRound,
  getActiveRounds,
  getCurrentRound,
  startRound,
} from '../../home/service/round.service';
import { getRecurringByGuard } from '../service/recurring.service';
import { getMyAssignments } from '../../assignments/service/assignment.service';
import { IAssignment, AssignmentStatus } from '../../assignments/service/assignment.types';
import {
  ITText,
  ITButton,
  ITCard,
  ITScreenWrapper,
  ITAlert,
  LoaderComponent,
} from '../../../shared/components';

import Skeleton from 'react-native-reanimated-skeleton';
import { SKELETON_CONFIG } from '../../../shared/utils/skeleton.constants';

const { width } = Dimensions.get('window');

const DashboardSkeleton = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 10 }}>
      <Skeleton
        isLoading={true}
        duration={SKELETON_CONFIG.DURATION}
        boneColor="#1E293B"
        highlightColor="#334155"
        layout={[
          {
            width: width - 24,
            height: 180,
            borderRadius: 32,
            marginHorizontal: 12,
            marginBottom: 20,
          },
        ]}
      />
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 30 }}>
        <Skeleton
          isLoading={true}
          duration={SKELETON_CONFIG.DURATION}
          boneColor={SKELETON_CONFIG.BONE_COLOR}
          highlightColor={SKELETON_CONFIG.HIGHLIGHT_COLOR}
          layout={[
            {
              width: width - 40,
              height: 56,
              borderRadius: 16,
              marginHorizontal: 20,
              marginBottom: 14,
            },
            {
              flexDirection: 'row',
              marginHorizontal: 20,
              justifyContent: 'space-between',
              marginBottom: 24,
              children: [
                { width: (width - 52) / 2, height: 54, borderRadius: 14 },
                { width: (width - 52) / 2, height: 54, borderRadius: 14 },
              ],
            },
            {
              width: 140,
              height: 16,
              borderRadius: 4,
              marginHorizontal: 20,
              marginBottom: 14,
            },
            {
              width: width - 40,
              height: 110,
              borderRadius: 24,
              marginHorizontal: 20,
              marginBottom: 16,
            },
            {
              width: width - 40,
              height: 110,
              borderRadius: 24,
              marginHorizontal: 20,
            },
          ]}
        />
      </View>
    </View>
  );
};

export const GuardDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();
  const theme = useTheme();

  const device = useCameraDevice('back');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [roundLoading, setRoundLoading] = useState(false);

  const [activeRound, setActiveRound] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'alert' | 'check' | 'warning' | 'info' | 'error';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
  });

  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isMyRound = isRoundActive && activeRound.guardId === user.id;

  const loadData = async (isSilent = false) => {
    if (!isSilent) {
      setInitialLoading(true);
    }
    setLoading(true);
    const start = Date.now();
    try {
      const [recurringRes, roundRes, activeRoundsRes, assignmentsRes] = await Promise.all([
        getRecurringByGuard(user.id).catch(() => ({
          success: false,
          data: [],
        })),
        getCurrentRound().catch(() => ({ success: false, data: null })),
        getActiveRounds().catch(() => ({ success: false, data: [] })),
        getMyAssignments(user.id?.toString() ?? '').catch(() => ({
          success: false,
          data: [],
        })),
      ]);

      const allRecurring = recurringRes?.data || [];
      const activeGlobalRounds = activeRoundsRes?.data || [];

      const filteredRecurring = allRecurring.filter((config: any) => {
        const activeForThisConfig = activeGlobalRounds.find(
          (r: any) =>
            r.recurringConfigurationId === config.id &&
            r.status === 'IN_PROGRESS',
        );
        if (!activeForThisConfig) return true;
        return activeForThisConfig.guardId === user.id;
      });

      setClients(filteredRecurring);
      setActiveRound(roundRes?.success && roundRes.data ? roundRes.data : null);
      setAssignments(assignmentsRes?.data || []);
    } catch (e) {
      dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
    } finally {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 800 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleToggleRound = async () => {
    if (!isRoundActive) {
      if (clients.length === 0) {
        setAlertConfig({
          visible: true,
          title: 'Sin Rutas',
          message: 'No tienes rutas asignadas para hoy.',
          type: 'warning',
        });
        return;
      }
      clients.length === 1
        ? onStartRoundConfirmed(clients[0].id)
        : setRouteSelectionVisible(true);
    } else {
      setEndRoundVisible(true);
    }
  };

  const onStartRoundConfirmed = async (configId?: number) => {
    setRouteSelectionVisible(false);
    setRoundLoading(true);
    try {
      const res = await startRound(user.id, undefined, configId);
      if (res.success) {
        setActiveRound(res.data);
        loadData();
        dispatch(
          showToast({ message: 'Ronda iniciada con éxito', type: 'success' }),
        );
      }
    } catch (e) {
      dispatch(showToast({ message: 'Error al iniciar ronda', type: 'error' }));
    } finally {
      setRoundLoading(false);
    }
  };

  const onEndRoundConfirmed = async () => {
    setEndRoundVisible(false);
    setRoundLoading(true);
    try {
      const res = await endRound(activeRound.id);
      if (res.success) {
        setActiveRound(null);
        loadData();
        dispatch(showToast({ message: 'Ronda finalizada', type: 'success' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error al finalizar', type: 'error' }));
    } finally {
      setRoundLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(false);
      return () => setCameraActive(false);
    }, []),
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (scanned || codes.length === 0 || !codes[0].value) return;
      handleCodeScanned(codes[0].value);
    },
  });

  const handleCodeScanned = (code: string) => {
    setScanned(true);
    setCameraActive(false);
    let scannedName: string | null = null;
    let scannedId: string | null = null;
    try {
      const parsed = JSON.parse(code);
      if (parsed?.name) scannedName = String(parsed.name);
      if (parsed?.id) scannedId = String(parsed.id);
    } catch (e) {
      scannedName = code;
    }

    const locations =
      activeRound?.recurringConfiguration?.recurringLocations?.map(
        (rl: any) => ({ ...rl.location, tasks: rl.tasks }),
      );
    const foundLocation = locations?.find(
      (l: any) =>
        (scannedName && l.name.toUpperCase() === scannedName.toUpperCase()) ||
        (scannedId && String(l.id) === String(scannedId)),
    );

    if (foundLocation) {
      const checks =
        activeRound?.kardex?.filter(
          (c: any) => String(c.locationId) === String(foundLocation.id),
        ) || [];
      const isCompleted = checks.some(
        (c: any) => Array.isArray(c.media) && c.media.length > 0,
      );

      if (isCompleted) {
        setAlertConfig({
          visible: true,
          title: 'Ya Verificado',
          message: 'Este punto de control ya fue completado.',
          type: 'info',
          onConfirm: () => setScanned(false),
        });
        return;
      }
      setScanned(false);
      navigation.navigate('CHECK_STACK', {
        screen: 'CHECK_MAIN',
        params: {
          location: foundLocation,
          recurringTasks: foundLocation.tasks,
          roundId: activeRound?.id,
        },
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Código Inválido',
        message: 'Este código no pertenece a la ruta actual.',
        type: 'error',
        onConfirm: () => setScanned(false),
      });
    }
  };

  const renderLocationItem = ({ item, index }: { item: any; index: number }) => {
    const checks =
      activeRound?.kardex?.filter(
        (c: any) => String(c.locationId) === String(item.id),
      ) || [];
    const isCompleted = checks.some(
      (c: any) => Array.isArray(c.media) && c.media.length > 0,
    );
    const isIncomplete = !isCompleted && checks.length > 0;

    const handleLocationTap = () => {
      if (__DEV__ && isMyRound && !isCompleted) {
        navigation.navigate('CHECK_STACK', {
          screen: 'CHECK_MAIN',
          params: {
            location: item,
            recurringTasks: item.tasks,
            roundId: activeRound?.id,
          },
        });
      }
    };

    return (
      <TouchableOpacity
        key={item.id || String(index)}
        style={[styles.locCard, isCompleted && styles.completedCard]}
        onPress={handleLocationTap}
        disabled={!__DEV__ || !isMyRound || isCompleted}
        testID={`loc-card-${item.id}`}
      >
        <View
          style={[
            styles.statusIndicator,
            isCompleted
              ? styles.bgSuccess
              : isIncomplete
              ? styles.bgIncomplete
              : styles.bgPending,
          ]}
        />
        <View style={styles.locMainInfo}>
          <ITText variant="bodyMedium" weight="bold">
            {item.name}
          </ITText>
          <ITText variant="bodySmall" style={{ opacity: 0.6 }}>
            {isCompleted
              ? 'Verificado'
              : `${item.tasks?.length || 0} tareas pendientes`}
          </ITText>
        </View>
        <Icon
          source={isCompleted ? 'check-circle' : 'chevron-right'}
          size={20}
          color={isCompleted ? COLORS.emerald : '#CBD5E1'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <ITScreenWrapper
      scrollable={false}
      padding={false}
      style={[styles.container, { paddingTop: 10 }]}
      edges={['left', 'right']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {initialLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <LoaderComponent visible={loading} />

          <View
            style={[
              styles.headerContainer,
              isMyRound && cameraActive ? { height: '45%' } : { height: '25%' },
            ]}
          >
            {/* Decorative Background QR */}
            <View style={styles.bgIconWrapper}>
              <Icon source="qrcode" size={280} color="rgba(255,255,255,0.04)" />
            </View>

            {!isMyRound ? (
              <View style={styles.lockedCamera}>
                <Surface style={styles.lockCircle} elevation={0}>
                  <Icon source="shield-lock" size={30} color="#555" />
                </Surface>
                <ITText variant="bodySmall" center color="#888">
                  Inicia una ruta para habilitar escáner
                </ITText>
              </View>
            ) : !cameraActive ? (
              <TouchableOpacity
                style={styles.activateCameraBtn}
                onPress={() => {
                  setScanned(false);
                  setCameraActive(true);
                }}
              >
                <Surface style={styles.cameraIconCircle} elevation={4}>
                  <Icon
                    source="qrcode-scan"
                    size={32}
                    color={theme.colors.primary}
                  />
                </Surface>
                <ITText
                  variant="labelLarge"
                  weight="bold"
                  color="#FFF"
                  style={{ letterSpacing: 1 }}
                >
                  TOCA PARA ESCANEAR CÓDIGO
                </ITText>
              </TouchableOpacity>
            ) : (
              <View style={[StyleSheet.absoluteFill]}>
                {isFocused && device && (
                  <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={!scanned}
                    codeScanner={codeScanner}
                  />
                )}
                <View style={styles.scanOverlay}>
                  <View style={styles.targetFrame} />
                  <ITButton
                    mode="text"
                    label="Cancelar"
                    onPress={() => setCameraActive(false)}
                    style={styles.closeCamBtn}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Panel de Contenido */}
          <View style={styles.contentSheet}>
            <View style={styles.dragIndicator} />

            <View style={styles.actionSection}>
              <ITButton
                label={
                  isRoundActive
                    ? isMyRound
                      ? 'FINALIZAR RUTA'
                      : 'RONDA EN CURSO'
                    : 'INICIAR RUTA'
                }
                onPress={handleToggleRound}
                loading={roundLoading}
                icon={isRoundActive ? 'stop-circle' : 'play'}
                color={
                  isRoundActive
                    ? isMyRound
                      ? COLORS.red
                      : '#94A3B8'
                    : theme.colors.primary
                }
                style={styles.mainActionBtn}
                testID="toggle-round-button"
              />

              <View style={styles.secondaryActions}>
                <QuickAction
                  icon="alert-octagon"
                  label="Incidencia"
                  color={COLORS.red}
                  bg="#FEF2F2"
                  onPress={() =>
                    navigation.navigate('INCIDENT_REPORT', {
                      initialCategory: 'FALTAS',
                    })
                  }
                />
                <QuickAction
                  icon="clipboard-list"
                  label={
                    assignments.filter(a => a.status !== AssignmentStatus.REVIEWED).length > 0
                      ? `Tareas (${assignments.filter(a => a.status !== AssignmentStatus.REVIEWED).length})`
                      : 'Tareas'
                  }
                  color="#0EA5E9"
                  bg="#F0F9FF"
                  onPress={() =>
                    navigation.navigate('ASSIGNMENTS_STACK', {
                      screen: 'MY_ASSIGNMENTS_MAIN',
                    })
                  }
                />
                {(user.role === UserRole.MAINT || user.role === UserRole.ADMIN) && (
                  <QuickAction
                    icon="wrench"
                    label="Mantenimiento"
                    color={COLORS.orange}
                    bg="#FFFBEB"
                    onPress={() =>
                      navigation.navigate('MAINTENANCE_REPORT', {
                        roundId: activeRound?.id,
                      })
                    }
                  />
                )}
              </View>
            </View>

            <FlatList
              data={
                isMyRound
                  ? clients.filter(
                      c => c.id === activeRound.recurringConfigurationId,
                    )
                  : clients
              }
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <ITText
                    variant="labelSmall"
                    weight="bold"
                    style={{ color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' }}
                  >
                    {isMyRound ? 'RUTA ACTUAL EN PROCESO' : 'RUTAS ASIGNADAS'}
                  </ITText>
                  <ITButton
                    mode="text"
                    icon="sync"
                    onPress={() => navigation.navigate('SYNC_SCREEN')}
                    label="Sincronizar"
                    compact
                  />
                </View>
              }
              renderItem={({ item, index }) => (
                <ITCard style={styles.routeCard} mode="contained" key={index}>
                  <View style={styles.routeHeader}>
                    <Icon
                      source="map-marker-distance"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <ITText variant="titleMedium" weight="bold" style={{ flex: 1 }}>
                      {item.title}
                    </ITText>
                    <View style={styles.ptsBadge}>
                      <ITText variant="labelSmall" weight="bold" color="#475569">
                        {item.recurringLocations?.length || 0} pts
                      </ITText>
                    </View>
                  </View>

                  {isMyRound && (
                    <View style={styles.locationList}>
                      {(item.recurringLocations || []).map((rl: any, idx: number) =>
                        renderLocationItem({
                          item: { ...rl.location, tasks: rl.tasks },
                          index: idx,
                        }),
                      )}
                    </View>
                  )}
                </ITCard>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon source="clipboard-text-outline" size={48} color="#E2E8F0" />
                  <ITText variant="bodyMedium" color="#94A3B8">
                    No hay rutas programadas
                  </ITText>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={() => loadData(true)} />
              }
            />
          </View>
        </>
      )}

      {/* Diálogos / Modales */}
      <Portal>
        <Modal
          visible={routeSelectionVisible}
          onDismiss={() => setRouteSelectionVisible(false)}
          contentContainerStyle={styles.modalBase}
        >
          <ITText
            variant="headlineSmall"
            weight="bold"
            center
            style={{ marginBottom: 16 }}
          >
            Seleccionar Ruta
          </ITText>
          {clients.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.modalOption}
              onPress={() => onStartRoundConfirmed(item.id)}
            >
              <Icon
                source="arrow-right-circle"
                size={24}
                color={theme.colors.primary}
              />
              <ITText variant="bodyLarge" weight="bold">
                {item.title}
              </ITText>
            </TouchableOpacity>
          ))}
        </Modal>

        <ITAlert
          visible={endRoundVisible}
          onDismiss={() => setEndRoundVisible(false)}
          onConfirm={onEndRoundConfirmed}
          title="¿Finalizar Ruta?"
          description="Asegúrate de haber verificado todos los puntos antes de concluir."
          confirmLabel="Sí, terminar"
          cancelLabel="Cancelar"
          type="warning"
        />
        <ITAlert
          visible={alertConfig.visible}
          onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
          onConfirm={() => {
            setAlertConfig({ ...alertConfig, visible: false });
            alertConfig.onConfirm?.();
          }}
          title={alertConfig.title}
          description={alertConfig.message}
          type={alertConfig.type}
          confirmLabel="Entendido"
        />
      </Portal>
    </ITScreenWrapper>
  );
};

const QuickAction = ({ icon, label, color, bg, onPress }: any) => (
  <TouchableOpacity
    style={[styles.quickBtn, { backgroundColor: bg }]}
    onPress={onPress}
  >
    <Icon source={icon} size={22} color={color} />
    <ITText variant="labelMedium" weight="bold" style={{ color }}>
      {label}
    </ITText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#000',
    borderRadius: 32,
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  bgIconWrapper: {
    position: 'absolute',
    opacity: 0.4,
    transform: [{ rotate: '-15deg' }],
    right: -40,
    bottom: -40,
  },
  lockedCamera: { alignItems: 'center', opacity: 0.6, padding: 20 },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activateCameraBtn: { alignItems: 'center' },
  cameraIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  targetFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 40,
    backgroundColor: 'transparent',
  },
  closeCamBtn: { position: 'absolute', bottom: 30 },
  contentSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 14,
  },
  actionSection: { marginBottom: 20 },
  mainActionBtn: { borderRadius: 16, height: 56, justifyContent: 'center' },
  secondaryActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quickBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#94A3B8',
    marginBottom: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  routeCard: { borderRadius: 24, padding: 16, marginBottom: 16 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ptsBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationList: { marginTop: 18, gap: 10 },
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  completedCard: { opacity: 0.5, backgroundColor: '#F8FAFC' },
  statusIndicator: { width: 4, height: 28, borderRadius: 2 },
  bgPending: { backgroundColor: '#CBD5E1' },
  bgIncomplete: { backgroundColor: COLORS.orange },
  bgSuccess: { backgroundColor: COLORS.emerald },
  locMainInfo: { flex: 1 },
  emptyContainer: { alignItems: 'center', padding: 50 },
  modalBase: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 28,
    padding: 28,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 10,
    gap: 14,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
});
