import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Icon,
  Modal,
  Portal,
  ProgressBar,
  Surface,
  Text,
} from 'react-native-paper';
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
  const [specialAssignments, setSpecialAssignments] = useState<any[]>([]);
  const [routeSelectionVisible, setRouteSelectionVisible] = useState(false);
  const [endRoundVisible, setEndRoundVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'success' | 'warning'; onConfirm?: () => void }>({ 
    visible: false, title: '', message: '', type: 'warning' 
  });

  const isRoundActive = activeRound && activeRound.status === 'IN_PROGRESS';
  const isRoundCompleted = activeRound && activeRound.status === 'COMPLETED';
  const isMyRound = isRoundActive && Number(activeRound.guardId) === Number(user.id);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recurringRes, assignRes, roundRes, activeRoundsRes] = await Promise.all([
        getRecurringByGuard(Number(user.id)).catch(() => ({ success: false, data: [] })),
        getMyAssignments().catch(() => ({ success: false, data: [] })),
        getCurrentRound().catch(() => ({ success: false, data: null })),
        getActiveRounds().catch(() => ({ success: false, data: [] })),
      ]);

      const allRecurring = recurringRes?.data || [];
      const activeGlobalRounds = activeRoundsRes?.data || [];

      const filteredRecurring = allRecurring.filter((config: any) => {
          const activeForThisConfig = activeGlobalRounds.find((r: any) => r.recurringConfigurationId === config.id && r.status === 'IN_PROGRESS');
          if (!activeForThisConfig) return true;
          return Number(activeForThisConfig.guardId) === Number(user.id);
      });

      setClients(filteredRecurring);
      setSpecialAssignments(assignRes?.data || []);
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

  const onStartRoundConfirmed = async (configId?: number) => {
      setRouteSelectionVisible(false);
      setRoundLoading(true);
      try {
        const res = await startRound(Number(user.id), undefined, configId);
        if (res.success) {
          setActiveRound(res.data);
          loadData();
          dispatch(showToast({ message: 'Ronda iniciada correctamente', type: 'success' }));
        } else {
          setAlertConfig({
            visible: true,
            title: 'Atención',
            message: res.messages?.[0] || 'No se pudo iniciar la ronda',
            type: 'warning'
          });
          loadData();
        }
      } catch (e: any) {
        dispatch(showToast({ message: 'Error al iniciar ronda', type: 'error' }));
      } finally {
        setRoundLoading(false);
      }
  };

  const handleToggleRound = async () => {
    if (!activeRound || activeRound.status === 'COMPLETED') {
        if (clients.length === 0) {
            setAlertConfig({
                visible: true,
                title: 'Sin Rutas',
                message: 'No tienes rutas asignadas para hoy.',
                type: 'warning'
            });
            return;
        }
        if (clients.length === 1) {
            onStartRoundConfirmed(clients[0].id);
        } else {
            setRouteSelectionVisible(true);
        }
    } else {
        setEndRoundVisible(true);
    }
  };

  const onEndRoundConfirmed = async () => {
    setEndRoundVisible(false);
    setRoundLoading(true);
    try {
        const res = await endRound(activeRound.id);
        if (res.success) {
            setActiveRound(res.data);
            dispatch(showToast({ message: 'Ronda finalizada con éxito', type: 'success' }));
        } else {
            dispatch(showToast({ message: 'No se pudo finalizar', type: 'error' }));
        }
    } catch (error: any) {
        dispatch(showToast({ message: 'Error de red', type: 'error' }));
    } finally {
        setRoundLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkPermission();
      loadData();
      setCameraActive(false);
      return () => setCameraActive(false);
    }, []),
  );

  const checkPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setHasPermission(status === 'granted');
  };

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

    let scannedId: number | null = null;
    try {
        const parsed = JSON.parse(code);
        if (parsed?.id) scannedId = Number(parsed.id);
    } catch (e) {}

    const locations = activeRound?.recurringConfiguration 
        ? activeRound.recurringConfiguration.recurringLocations?.map((rl: any) => ({ ...rl.location, tasks: rl.tasks }))
        : activeRound?.client?.locations;

    const foundLocation = locations?.find((l: any) => scannedId ? Number(l.id) === Number(scannedId) : l.name === code);

    if (foundLocation) {
      const locationChecks = activeRound?.kardex?.filter((c: any) => Number(c.locationId) === Number(foundLocation.id)) || [];
      const isAlreadyCompleted = locationChecks.some((c: any) => Array.isArray(c.media) && c.media.length > 0);

      if (isAlreadyCompleted) {
        setAlertConfig({
            visible: true,
            title: 'Punto Verificado',
            message: 'Este punto ya ha sido escaneado y completado con evidencia. No es necesario repetirlo.',
            type: 'info',
            onConfirm: () => setScanned(false)
        });
        return;
      }

      navigation.navigate('CHECK_STACK', {
        screen: 'CHECK_MAIN',
        params: { 
            location: foundLocation, 
            recurringTasks: foundLocation.tasks
        },
      });
    } else {
      setAlertConfig({
          visible: true,
          title: 'No reconocido',
          message: 'Este código no pertenece a tu ruta activa.',
          type: 'error',
          onConfirm: () => setScanned(false)
      });
    }
  };

  const renderLocationItem = ({ item }: { item: any }) => {
    // Buscar todos los escaneos de este punto
    const checks = activeRound?.kardex?.filter((c: any) => Number(c.locationId) === Number(item.id)) || [];
    
    // Un punto está completado si AL MENOS UNO de los escaneos tiene evidencia
    const isCompleted = checks.some((c: any) => Array.isArray(c.media) && c.media.length > 0);
    
    // Un punto está incompleto si NO está completado pero tiene AL MENOS UN escaneo
    const isIncomplete = !isCompleted && checks.length > 0;

    return (
      <Surface style={[styles.locCard, isCompleted && styles.completedCard]} elevation={1}>
        <View style={styles.locContent}>
          <View style={[
              styles.statusIndicator, 
              isCompleted ? styles.bgSuccess : (isIncomplete ? styles.bgIncomplete : styles.bgPending)
          ]} />
          <View style={styles.locMainInfo}>
            <Text style={styles.locName}>{item.name}</Text>
            <Text style={styles.locSub}>
                {isCompleted ? 'Punto verificado' : (isIncomplete ? 'Reporte incompleto' : `${item.tasks?.length || 0} tareas pendientes`)}
            </Text>
          </View>
          <Icon 
            source={isCompleted ? "check-circle" : (isIncomplete ? "alert-circle" : "qrcode-scan")} 
            size={24} 
            color={isCompleted ? "#10B981" : (isIncomplete ? "#F59E0B" : "#CBD5E1")} 
          />
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      ) : (
        <>
          {/* Header / Cámara */}
          <View style={styles.headerContainer}>
            {!isMyRound ? (
              <View style={styles.lockedCamera}>
                <Icon source="camera-off" size={48} color="#444" />
                <Text style={styles.lockedText}>Inicia una ronda para usar el escáner</Text>
              </View>
            ) : !cameraActive ? (
              <TouchableOpacity style={styles.activateCameraBtn} onPress={() => { setScanned(false); setCameraActive(true); }}>
                <Surface style={styles.cameraIconCircle} elevation={4}>
                  <Icon source="qrcode-scan" size={32} color={theme.colors.primary} />
                </Surface>
                <Text style={styles.activateText}>TOCA PARA ESCANEAR PUNTO</Text>
              </TouchableOpacity>
            ) : (
              <View style={StyleSheet.absoluteFill}>
                {isFocused && device && (
                  <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={cameraActive && isFocused && !scanned}
                    codeScanner={codeScanner}
                  />
                )}
                <View style={styles.scanOverlay}>
                  <View style={styles.targetFrame} />
                  <Button mode="contained" onPress={() => setCameraActive(false)} style={styles.closeCamBtn}>Cerrar Cámara</Button>
                </View>
              </View>
            )}
          </View>

          {/* Contenido Inferior */}
          <View style={styles.contentSheet}>
            <View style={styles.dragIndicator} />
            
            <View style={styles.actionSection}>
              <Button
                mode="contained"
                onPress={handleToggleRound}
                loading={roundLoading}
                disabled={clients.length === 0 || (isRoundActive && !isMyRound)}
                style={[
                  styles.mainActionBtn,
                  isRoundActive && isMyRound ? styles.btnDanger : styles.btnSuccess
                ]}
                contentStyle={styles.mainActionBtnContent}
                labelStyle={styles.mainActionLabel}
                icon={isRoundActive && isMyRound ? 'stop-circle' : 'play-circle'}
              >
                {isRoundActive 
                  ? isMyRound ? 'FINALIZAR MI RONDA' : `EN CURSO: ${activeRound.guard?.name || 'OTRO'}`
                  : 'INICIAR NUEVA RONDA'}
              </Button>

              <View style={styles.secondaryActions}>
                <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => navigation.navigate('INCIDENT_REPORT', { initialCategory: 'FALTAS' })}
                >
                    <Icon source="alert-octagon" size={24} color="#DC2626" />
                    <Text style={[styles.smallActionText, { color: '#DC2626' }]}>Reportar Incidencia</Text>
                </TouchableOpacity>

                {(user.role === UserRole.MAINT || user.role === UserRole.ADMIN) && (
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: '#FFEDD5' }]}
                    onPress={() => navigation.navigate('MAINTENANCE_REPORT')}
                  >
                    <Icon source="wrench" size={24} color="#EA580C" />
                    <Text style={[styles.smallActionText, { color: '#EA580C' }]}>Mantenimiento</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <FlatList
              data={isMyRound ? clients.filter(c => c.id === activeRound.recurringConfigurationId) : clients}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={styles.sectionTitle}>
                  {isMyRound ? '📍 TU RUTA ACTUAL' : '📋 RUTAS DISPONIBLES'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.routeContainer}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => !isRoundActive && onStartRoundConfirmed(item.id)}
                  >
                    <View style={styles.routeHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeName}>{item.title}</Text>
                      </View>
                      <View style={styles.routeBadge}>
                        <Text style={styles.badgeText}>{item.recurringLocations?.length || 0} PTS</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  {isMyRound && (
                    <View style={styles.locationList}>
                        {(item.recurringLocations || []).map((rl: any) => renderLocationItem({ item: { ...rl.location, tasks: rl.tasks } }))}
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyRoutes}>
                    <Icon source="clipboard-off-outline" size={40} color="#CBD5E1" />
                    <Text style={styles.emptyText}>No hay rutas asignadas para hoy</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            />
          </View>
        </>
      )}

      {/* Modales rediseñados para ser más claros */}
      <Portal>
        <Modal visible={routeSelectionVisible} onDismiss={() => setRouteSelectionVisible(false)} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Qué ruta iniciarás?</Text>
            {clients.map(item => (
                <TouchableOpacity key={item.id} style={styles.routeOption} onPress={() => onStartRoundConfirmed(item.id)}>
                    <Icon source="map-marker-path" size={28} color={theme.colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.optionTitle}>{item.title}</Text>
                        <Text style={styles.optionSub}>{item.client?.name}</Text>
                    </View>
                </TouchableOpacity>
            ))}
            <Button onPress={() => setRouteSelectionVisible(false)} textColor="#64748B">Cerrar</Button>
        </Modal>

        <Modal visible={endRoundVisible} onDismiss={() => setEndRoundVisible(false)} contentContainerStyle={styles.modalContent}>
            <View style={styles.center}><Icon source="alert-circle" size={50} color="#EF4444" /></View>
            <Text style={styles.modalTitle}>¿Terminar recorrido?</Text>
            <Text style={styles.modalSubtitle}>Asegúrate de haber escaneado todos los puntos antes de finalizar.</Text>
            <View style={styles.modalButtons}>
                <Button mode="outlined" onPress={() => setEndRoundVisible(false)} style={styles.flex1}>Volver</Button>
                <Button mode="contained" onPress={onEndRoundConfirmed} style={[styles.flex1, { backgroundColor: '#EF4444' }]}>Sí, Terminar</Button>
            </View>
        </Modal>

        {/* Modal Genérico para Alertas */}
        <Modal 
            visible={alertConfig.visible} 
            onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })} 
            contentContainerStyle={styles.modalContent}
        >
            <View style={styles.center}>
                <Icon 
                    source={alertConfig.type === 'error' ? 'close-circle' : 'alert-circle'} 
                    size={50} 
                    color={alertConfig.type === 'error' ? '#EF4444' : '#F59E0B'} 
                />
            </View>
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalSubtitle}>{alertConfig.message}</Text>
            <Button 
                mode="contained" 
                onPress={() => {
                    setAlertConfig({ ...alertConfig, visible: false });
                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                }} 
                style={{ backgroundColor: alertConfig.type === 'error' ? '#EF4444' : theme.colors.primary, borderRadius: 12 }}
            >
                Entendido
            </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  flex1: { flex: 1 },
  loadingText: { color: '#666', marginTop: 10, fontSize: 16 },
  
  // Header & Camera
  headerContainer: { height: '30%', backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  lockedCamera: { alignItems: 'center' },
  lockedText: { color: '#666', marginTop: 12, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 40 },
  activateCameraBtn: { alignItems: 'center' },
  cameraIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  activateText: { color: '#fff', fontWeight: '900', letterSpacing: 1, fontSize: 14 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  targetFrame: { width: 200, height: 200, borderWidth: 2, borderColor: '#fff', borderStyle: 'dashed', borderRadius: 20 },
  closeCamBtn: { position: 'absolute', bottom: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Content
  contentSheet: { flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20 },
  dragIndicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginVertical: 15 },
  
  // Buttons
  actionSection: { marginBottom: 20 },
  mainActionBtn: { borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  mainActionBtnContent: { height: 60 },
  mainActionLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  btnSuccess: { backgroundColor: '#059669' }, // Emerald 600
  btnDanger: { backgroundColor: '#DC2626' }, // Red 600
  
  secondaryActions: { flexDirection: 'row', gap: 12, marginTop: 15 },
  smallActionBtn: { flex: 1, height: 75, borderRadius: 16, justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  smallActionText: { fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'center', color: '#B91C1C' },

  // List & Cards
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#64748B', marginBottom: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  routeContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  routeInfo: { flexDirection: 'row', alignItems: 'center' },
  routeName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  routeDetail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  routeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6},
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  
  emptyRoutes: { alignItems: 'center', marginTop: 40, opacity: 0.6 },
  emptyText: { color: '#64748B', fontSize: 12, marginTop: 10, fontWeight: '500' },
  routeHeader: { marginBottom: 10 },
  routeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  routeClient: { fontSize: 14, color: '#64748B' },
  locationList: { marginTop: 10 },

  
  locCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  locContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  statusIndicator: { width: 6, height: 35, borderRadius: 3, marginRight: 12 },
  bgPending: { backgroundColor: '#E2E8F0' }, // Gris
  bgIncomplete: { backgroundColor: '#F59E0B' }, // Naranja/Amarillo
  bgSuccess: { backgroundColor: '#10B981' }, // Verde
  locMainInfo: { flex: 1 },
  locName: { fontSize: 15, fontWeight: 'bold', color: '#334155' },
  locSub: { fontSize: 12, color: '#94A3B8' },
  completedCard: { opacity: 0.8, backgroundColor: '#F8FAFC' },

  // Modals
  modalContent: { backgroundColor: '#fff', margin: 20, borderRadius: 24, padding: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#1E293B', marginBottom: 10 },
  modalSubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  routeOption: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F1F5F9', borderRadius: 15, marginBottom: 10 },
  optionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  optionSub: { fontSize: 12, color: '#64748B' }
});