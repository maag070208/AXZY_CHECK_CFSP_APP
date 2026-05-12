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
import {
  ITText,
  ITButton,
  ITCard,
  ITScreenWrapper,
  ITAlert,
  LoaderComponent,
} from '../../../shared/components';

const { width } = Dimensions.get('window');

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
  const [roundLoading, setRoundLoading] = useState(false);

  const [activeRound, setActiveRound] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'alert' | 'check' | 'warning' | 'info';
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
      setActiveRound(roundRes?.success && roundRes.data ? roundRes.data : null);
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
      </View>
    );
  };

  return (
    <ITScreenWrapper
      scrollable={false}
      padding={false}
      style={[styles.container, { paddingTop: 10 }]}
      edges={['left', 'right']}
    >
      <LoaderComponent visible={loading} />
      <StatusBar barStyle="light-content" backgroundColor="#000" />

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
                  roundId: activeRound?.id,
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
            <ITText
              variant="labelSmall"
              weight="bold"
              style={styles.sectionTitle}
            >
              {isMyRound ? 'RUTA ACTUAL EN PROCESO' : 'RUTAS ASIGNADAS'}
            </ITText>
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
                  {(item.recurringLocations || []).map((rl: any) =>
                    renderLocationItem({
                      item: { ...rl.location, tasks: rl.tasks },
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
            <RefreshControl refreshing={loading} onRefresh={loadData} />
          }
        />
      </View>

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
