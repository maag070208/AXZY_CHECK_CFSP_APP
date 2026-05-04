import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Modal, Portal, Surface, Text } from 'react-native-paper';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { theme } from '../../../shared/theme/theme';
import { COLORS } from '../../../shared/utils/constants';
import { getMyAssignments } from '../../assignments/service/assignment.service';
import {
  endRound,
  getActiveRounds,
  getCurrentRound,
  startRound,
} from '../../home/service/round.service';
import { getRecurringByGuard } from '../service/recurring.service';

const { width } = Dimensions.get('window');

export const GuardDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();

  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);

  const [activeRound, setActiveRound] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'warning' | 'info';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
  });

  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isMyRound = isRoundActive && activeRound.guardId === user.id;

  const loadData = async () => {
    setLoading(true);
    try {
      const [recurringRes, roundRes, activeRoundsRes] = await Promise.all([
        getRecurringByGuard(user.id).catch(() => ({
          success: false,
          data: [],
        })),
        getCurrentRound().catch(() => ({ success: false, data: null })),
        getActiveRounds().catch(() => ({ success: false, data: [] })),
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
      if (roundRes?.success && roundRes.data) {
        setActiveRound(roundRes.data);
      } else {
        setActiveRound(null);
      }
    } catch (e) {
      dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRound = async () => {
    if (!isRoundActive) {
      if (clients.length === 0) {
        setAlertConfig({
          visible: true,
          title: 'Sin Rutas',
          message: 'No tienes rutas asignadas.',
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
        dispatch(showToast({ message: 'Ronda iniciada', type: 'success' }));
      }
    } catch (e) {
      dispatch(showToast({ message: 'Error al iniciar', type: 'error' }));
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
      dispatch(showToast({ message: 'Error de red', type: 'error' }));
    } finally {
      setRoundLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
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
    let scannedId: string | null = null;
    try {
      const parsed = JSON.parse(code);
      if (parsed?.id) scannedId = String(parsed.id);
    } catch (e) {
      scannedId = code;
    }

    const locations =
      activeRound?.recurringConfiguration?.recurringLocations?.map(
        (rl: any) => ({ ...rl.location, tasks: rl.tasks }),
      );
    const foundLocation = locations?.find(
      (l: any) => String(l.id) === String(scannedId) || l.name === code,
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
          title: 'Completado',
          message: 'Este punto ya fue verificado.',
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
        title: 'No encontrado',
        message: 'El código no pertenece a esta ruta.',
        type: 'error',
        onConfirm: () => setScanned(false),
      });
    }
  };

  const renderLocationItem = ({ item }: { item: any }) => {
    const checks =
      activeRound?.kardex?.filter(
        (c: any) => String(c.locationId) === String(item.id),
      ) || [];
    const isCompleted = checks.some(
      (c: any) => Array.isArray(c.media) && c.media.length > 0,
    );
    const isIncomplete = !isCompleted && checks.length > 0;

    return (
      <View style={[styles.locCard, isCompleted && styles.completedCard]}>
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
          <Text style={styles.locName}>{item.name}</Text>
          <Text style={styles.locSub}>
            {isCompleted ? 'Verificado' : `${item.tasks?.length || 0} tareas`}
          </Text>
        </View>
        <Icon
          source={isCompleted ? 'check-circle' : 'chevron-right'}
          size={20}
          color={isCompleted ? COLORS.emerald : '#CBD5E1'}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* Header Compacto y Dinámico */}
          <View
            style={[
              styles.headerContainer,
              isMyRound && cameraActive ? { height: '40%' } : { height: '25%' },
            ]}
          >
            {!isMyRound ? (
              <View style={styles.lockedCamera}>
                <Surface style={styles.lockCircle} elevation={0}>
                  <Icon source="shield-lock" size={30} color="#555" />
                </Surface>
                <Text style={styles.lockedText}>
                  Inicia una ruta para escanear
                </Text>
              </View>
            ) : !cameraActive ? (
              <TouchableOpacity
                style={styles.activateCameraBtn}
                onPress={() => {
                  setScanned(false);
                  setCameraActive(true);
                }}
              >
                <Surface style={styles.cameraIconCircle} elevation={2}>
                  <Icon
                    source="qrcode-scan"
                    size={28}
                    color={theme.colors.primary}
                  />
                </Surface>
                <Text style={styles.activateText}>
                  PRESIONA AQUI PARA ESCANEAR CÓDIGO
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={StyleSheet.absoluteFill}>
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
                  <Button
                    mode="text"
                    textColor="#fff"
                    onPress={() => setCameraActive(false)}
                    style={styles.closeCamBtn}
                  >
                    Cancelar
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* Panel Principal */}
          <View style={styles.contentSheet}>
            <View style={styles.dragIndicator} />

            <View style={styles.actionSection}>
              <Button
                mode="contained"
                onPress={handleToggleRound}
                loading={roundLoading}
                style={[
                  styles.mainActionBtn,
                  isRoundActive
                    ? isMyRound
                      ? styles.btnDanger
                      : styles.btnDisabled
                    : styles.btnSuccess,
                ]}
                contentStyle={styles.mainActionBtnContent}
                labelStyle={styles.mainActionLabel}
                icon={isRoundActive ? 'stop-circle' : 'play'}
              >
                {isRoundActive
                  ? isMyRound
                    ? 'FINALIZAR RUTA'
                    : 'RONDA EN CURSO'
                  : 'INICIAR RUTA'}
              </Button>

              <View style={styles.secondaryActions}>
                <QuickAction
                  icon="alert-octagon"
                  label="Incidencia"
                  color={COLORS.red}
                  bg="#FEF2F2"
                  onPress={() =>
                    navigation.navigate('INCIDENT_REPORT', {
                      initialCategory: 'FALTAS',
                      roundId: activeRound?.id,
                    })
                  }
                />
                {(user.role === UserRole.MAINT ||
                  user.role === UserRole.ADMIN) && (
                  <QuickAction
                    icon="wrench"
                    label="Mantenimiento"
                    color={COLORS.orange}
                    bg="#FFFBEB"
                    onPress={() => navigation.navigate('MAINTENANCE_REPORT', { roundId: activeRound?.id })}
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
                <Text style={styles.sectionTitle}>
                  {isMyRound ? 'RUTA EN CURSO' : 'RUTAS ASIGNADAS'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.routeCard}>
                  <View style={styles.routeHeader}>
                    <Icon
                      source="map-marker-distance"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.routeName}>{item.title}</Text>
                    <View style={styles.ptsBadge}>
                      <Text style={styles.ptsText}>
                        {item.recurringLocations?.length || 0} pts
                      </Text>
                    </View>
                  </View>

                  {isMyRound && (
                    <View style={styles.locationList}>
                      {(item.recurringLocations || []).map((rl: any) =>
                        renderLocationItem({
                          item: { ...rl.location, tasks: rl.tasks },
                        }),
                      )}
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon
                    source="clipboard-text-outline"
                    size={40}
                    color="#E2E8F0"
                  />
                  <Text style={styles.emptyText}>Sin rutas para hoy</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 30 }}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadData} />
              }
            />
          </View>
        </>
      )}

      {/* Modales Optimizados */}
      <Portal>
        <CustomModal
          visible={routeSelectionVisible}
          onDismiss={() => setRouteSelectionVisible(false)}
          title="Seleccionar Ruta"
        >
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
              <Text style={styles.modalOptionText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </CustomModal>

        <CustomModal
          visible={endRoundVisible}
          onDismiss={() => setEndRoundVisible(false)}
          title="¿Finalizar Ruta?"
        >
          <Text style={styles.modalSubText}>
            Asegúrate de haber completado todos los puntos de control.
          </Text>
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setEndRoundVisible(false)}
              style={styles.modalBtn}
            >
              No, volver
            </Button>
            <Button
              mode="contained"
              onPress={onEndRoundConfirmed}
              style={[styles.modalBtn, { backgroundColor: COLORS.red }]}
            >
              Sí, terminar
            </Button>
          </View>
        </CustomModal>

        <CustomModal
          visible={alertConfig.visible}
          onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
          title={alertConfig.title}
        >
          <Text style={styles.modalSubText}>{alertConfig.message}</Text>
          <Button
            mode="contained"
            onPress={() => {
              setAlertConfig({ ...alertConfig, visible: false });
              alertConfig.onConfirm?.();
            }}
          >
            Entendido
          </Button>
        </CustomModal>
      </Portal>
    </View>
  );
};

// Componentes Pequeños para Limpieza de Código
const QuickAction = ({ icon, label, color, bg, onPress }: any) => (
  <TouchableOpacity
    style={[styles.quickBtn, { backgroundColor: bg }]}
    onPress={onPress}
  >
    <Icon source={icon} size={22} color={color} />
    <Text style={[styles.quickLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const CustomModal = ({ visible, onDismiss, title, children }: any) => (
  <Modal
    visible={visible}
    onDismiss={onDismiss}
    contentContainerStyle={styles.modalBase}
  >
    <Text style={styles.modalTitle}>{title}</Text>
    {children}
  </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerContainer: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lockedCamera: { alignItems: 'center', opacity: 0.6 },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockedText: { color: '#888', fontSize: 13, fontWeight: '500' },
  activateCameraBtn: { alignItems: 'center' },
  cameraIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  activateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  targetFrame: {
    width: 220,
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
  },
  closeCamBtn: { position: 'absolute', bottom: 20 },

  // Content Sheet
  contentSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },

  // Actions
  actionSection: { marginBottom: 20 },
  mainActionBtn: { borderRadius: 16, elevation: 0 },
  mainActionBtnContent: { height: 56 },
  mainActionLabel: { fontSize: 15, fontWeight: 'bold' },
  btnSuccess: { backgroundColor: theme.colors.primary }, // Dark Blue / Black
  btnDanger: { backgroundColor: COLORS.red },
  btnDisabled: { backgroundColor: '#E2E8F0' },

  secondaryActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickLabel: { fontSize: 13, fontWeight: '600' },

  // List & Cards
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 12,
    letterSpacing: 1,
  },
  routeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B' },
  ptsBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ptsText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  locationList: { marginTop: 15, gap: 8 },
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  completedCard: { opacity: 0.6 },
  statusIndicator: { width: 4, height: 24, borderRadius: 2 },
  bgPending: { backgroundColor: '#CBD5E1' },
  bgIncomplete: { backgroundColor: COLORS.orange },
  bgSuccess: { backgroundColor: COLORS.emerald },
  locMainInfo: { flex: 1 },
  locName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  locSub: { fontSize: 11, color: '#94A3B8' },

  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#94A3B8', marginTop: 10, fontSize: 14 },

  // Modals
  modalBase: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  modalOptionText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, borderRadius: 12 },
});
