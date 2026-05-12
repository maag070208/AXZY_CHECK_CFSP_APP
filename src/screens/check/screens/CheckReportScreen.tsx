import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  PermissionsAndroid,
  BackHandler,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  ITText,
  ITButton,
  ITInput,
  ITCard,
  ITScreenWrapper,
  ITTouchableOpacity,
  LoaderComponent,
  ITAlert,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { createVideoThumbnail } from 'react-native-compressor';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import Geolocation from '@react-native-community/geolocation';
import { useFocusEffect } from '@react-navigation/native';
import { Icon, IconButton } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { uploadFile } from '../../../shared/service/upload.service';
import {
  getAllAssignments,
  updateAssignmentStatus,
} from '../../assignments/service/assignment.service';
import { CameraModal } from '../components/CameraModal';
import { TaskChecklist } from '../components/TaskChecklist';
import { registerCheck, updateCheck } from '../service/check.service';

const { width } = Dimensions.get('window');

export interface MediaItem {
  uri: string;
  url?: string;
  thumbnail?: string | null;
  uploading: boolean;
  error?: boolean;
  description?: string;
}

export const CheckReportScreen = ({ route, navigation }: any) => {
  const { location, assignmentId, roundId } = route.params;
  const user = useSelector((state: RootState) => state.userState);
  const dispatch = useDispatch();

  // States
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [notes, setNotes] = useState('');
  const [currentKardexId, setCurrentKardexId] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('photo');
  const [tasks, setTasks] = useState<any[]>([]);

  const [requirements] = useState({
    minPhotos: 0,
    videoRequired: false,
    label: 'Libre',
    level: 0,
  });

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

  const isAnyMediaUploading =
    photos.some(p => p.uploading) || videos.some(v => v.uploading);

  useFocusEffect(
    React.useCallback(() => {
      // Reset state on focus to ensure clean start
      console.log('[Check] Focus gained, initializing report...');
      setPhotos([]);
      setVideos([]);
      setNotes('');
      setCurrentKardexId(null);
      setTasks([]);

      initReport();

      if (route.params.recurringTasks) {
        setTasks(route.params.recurringTasks);
      } else if (assignmentId) {
        loadAssignmentTasks();
      }

      return () => {
        // Clear on blur/unmount
        console.log('[Check] Focus lost, clearing state...');
        setPhotos([]);
        setVideos([]);
        setNotes('');
        setCurrentKardexId(null);
      };
    }, [location.id, assignmentId])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <HeaderBack
          navigation={navigation}
          title="Reporte de Verificación"
          onBack={handleBackPress}
        />
      ),
    });
  }, [navigation, currentKardexId]);

  const loadAssignmentTasks = async () => {
    try {
      const res = await getAllAssignments({ id: assignmentId });
      if (res.success && res.data?.length > 0) {
        setTasks(res.data[0].tasks || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskToggle = (taskId: number) => {
    setTasks(current =>
      current.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      ),
    );
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const getCurrentLocation = (): Promise<{
    lat: number;
    lng: number;
  } | null> => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    });
  };

  const initReport = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      let coords = hasPermission ? await getCurrentLocation() : null;

      console.log('[Check] registerCheck payload:', {
        locationId: location.id,
        userId: user.id,
        assignmentId: route.params.assignmentId,
      });

      const res = await registerCheck({
        locationId: location.id,
        userId: user.id,
        notes: '',
        media: [],
        latitude: coords?.lat,
        longitude: coords?.lng,
        assignmentId: route.params.assignmentId,
      });

      console.log(
        '[Check] registerCheck response raw:',
        JSON.stringify(res, null, 2),
      );

      const kardexId = res.success ? res.data?.id : null;
      console.log('[Check] kardexId:', kardexId);
      if (kardexId) {
        console.log('[Check] Setting currentKardexId:', kardexId);
        setCurrentKardexId(kardexId);
      } else {
        console.error('[Check] No ID found in response:', res);
        setAlertConfig({
          visible: true,
          title: 'Error',
          message: 'No se pudo generar el reporte inicial.',
          type: 'alert',
          onConfirm: () => navigation.goBack(),
        });
      }
    } catch (e: any) {
      console.error('[Check] Init error:', e);
      setAlertConfig({
        visible: true,
        title: 'Error de Conexión',
        message: e?.messages?.[0] || 'No se pudo contactar con el servidor.',
        type: 'alert',
        onConfirm: () => navigation.goBack(),
      });
    } finally {
      setLoading(false);
    }
  };

  const syncMedia = async (updatedPhotos: any[], updatedVideos: any[]) => {
    if (!currentKardexId) return;
    const mediaToSend = [
      ...updatedPhotos.filter(p => p.url).map(p => p.url!),
      ...updatedVideos.filter(v => v.url).map(v => v.url!),
    ];
    try {
      await updateCheck(currentKardexId, { media: mediaToSend });
    } catch (e) {}
  };

  const handleCapture = async (file: {
    uri: string;
    type: 'video' | 'photo';
  }) => {
    if (file.type === 'video') {
      let thumbnail = null;
      try {
        const thumb = await createVideoThumbnail(file.uri);
        thumbnail = thumb.path;
      } catch (e) {
        console.warn('Thumbnail error', e);
      }

      const newVideo = { uri: file.uri, thumbnail, uploading: true };
      setVideos(prev => [...prev, newVideo]);
      await performVideoUpload(file.uri);
    } else {
      const newPhoto = { uri: file.uri, description: '', uploading: true };
      setPhotos(prev => [...prev, newPhoto]);
      await performPhotoUpload(newPhoto);
    }
  };

  const performVideoUpload = async (uri: string) => {
    setVideos(curr =>
      curr.map(v =>
        v.uri === uri ? { ...v, uploading: true, error: false } : v,
      ),
    );
    try {
      const res: any = await uploadFile(uri, 'video', location?.name, roundId);
      if (res.success) {
        setVideos(curr => {
          const updated = curr.map(v =>
            v.uri === uri ? { ...v, url: res.url, uploading: false } : v,
          );
          syncMedia(photos, updated);
          return updated;
        });
      } else {
        setVideos(curr =>
          curr.map(v =>
            v.uri === uri ? { ...v, uploading: false, error: true } : v,
          ),
        );
      }
    } catch (e) {
      setVideos(curr =>
        curr.map(v =>
          v.uri === uri ? { ...v, uploading: false, error: true } : v,
        ),
      );
    }
  };

  const performPhotoUpload = async (photo: any) => {
    setPhotos(curr =>
      curr.map(p =>
        p.uri === photo.uri ? { ...p, uploading: true, error: false } : p,
      ),
    );
    try {
      const res: any = await uploadFile(
        photo.uri,
        'image',
        location?.name,
        roundId,
      );
      if (res.success) {
        setPhotos(curr => {
          const updated = curr.map(p =>
            p.uri === photo.uri ? { ...p, url: res.url, uploading: false } : p,
          );
          syncMedia(updated, videos);
          return updated;
        });
      } else {
        setPhotos(curr =>
          curr.map(p =>
            p.uri === photo.uri ? { ...p, uploading: false, error: true } : p,
          ),
        );
      }
    } catch (e) {
      setPhotos(curr =>
        curr.map(p =>
          p.uri === photo.uri ? { ...p, uploading: false, error: true } : p,
        ),
      );
    }
  };

  const handleBackPress = () => {
    setAlertConfig({
      visible: true,
      title: '¿Abandonar Reporte?',
      message: 'Se perderán los cambios. El punto quedará como no verificado.',
      type: 'warning',
      onConfirm: async () => {
        if (currentKardexId) {
          try {
            // Limpiar datos en el servidor para que quede incompleto
            await updateCheck(currentKardexId, { notes: '', media: [] });
          } catch (e) {
            console.error('[Check] Error clearing on abandon:', e);
          }
        }
        setCameraVisible(false);
        setNotes('');
        setPhotos([]);
        setVideos([]);
        setCurrentKardexId(null);
        setAlertConfig({ ...alertConfig, visible: false });
        navigation.goBack();
      },
    });
    return true;
  };

  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress,
      );
      return () => handler.remove();
    }, [currentKardexId]),
  );

  const handleSubmit = async () => {
    if (loading) return;
    if (!currentKardexId) {
      dispatch(
        showToast({
          message: 'Error: No se pudo sincronizar el inicio del reporte.',
          type: 'error',
        }),
      );
      initReport(); // Re-intentar inicialización
      return;
    }
    setLoading(true);
    try {
      let finalNotes = notes;
      if (!assignmentId && tasks.length > 0) {
        const checklist = tasks
          .map(t => `[${t.completed ? 'x' : ' '}] ${t.description}`)
          .join('\n');
        finalNotes = `${finalNotes}\n\n--- CHECKLIST ---\n${checklist}`;
      }
      console.log('[Check] handleSubmit finalNotes:', finalNotes);

      const mediaToSend = [
        ...photos.filter(p => p.url).map(p => p.url!),
        ...videos.filter(v => v.url).map(v => v.url!),
      ];

      console.log('[Check] updateCheck mediaToSend count:', mediaToSend.length);

      const res = await updateCheck(currentKardexId, {
        notes: finalNotes || 'Check completado',
        media: mediaToSend,
      });
      console.log('[Check] updateCheck response:', res);
      if (res.success) {
        if (assignmentId) {
          try {
            await updateAssignmentStatus(assignmentId, 'UNDER_REVIEW' as any);
          } catch (err) {
            console.warn(
              '[Check] No se pudo actualizar el status de la asignación (puede ser una ronda):',
              err,
            );
          }
        }
        dispatch(showToast({ message: '¡Reporte enviado!', type: 'success' }));
        navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
        return;
      }

      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudo finalizar el reporte.',
        type: 'alert',
      });
    } catch (e) {
      console.error('[Check] handleSubmit error:', e);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'No se pudo finalizar el reporte.',
        type: 'alert',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ITScreenWrapper
      scrollable
      padding={false}
      style={styles.mainContainer}
      edges={['bottom']}
    >
      <LoaderComponent visible={loading} />

      <View style={styles.scrollContent}>
        {/* HEADER MODERNO */}
        <ITCard style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.badgeLabel}>
              <ITText style={styles.badgeLabelText} weight="bold">
                {(requirements.label || '').toUpperCase()}
              </ITText>
            </View>
            <ITText style={styles.headerDate} weight="bold">
              {new Date().toLocaleDateString()}
            </ITText>
          </View>
          <ITText
            variant="headlineSmall"
            weight="bold"
            color={theme.colors.slate800}
          >
            {location?.name || 'Ubicación'}
          </ITText>
          <View style={styles.locRow}>
            <Icon
              source="map-marker-radius"
              size={18}
              color={theme.colors.primary}
            />
            <ITText style={styles.locText} weight="bold">
              Punto de control verificado
            </ITText>
          </View>
        </ITCard>

        {/* CHECKLIST */}
        {tasks.length > 0 && (
          <View style={styles.section}>
            <ITText
              variant="titleMedium"
              weight="bold"
              style={styles.sectionTitle}
            >
              Tareas a Realizar
            </ITText>
            <TaskChecklist
              tasks={tasks}
              onTaskToggle={handleTaskToggle}
              isLocalOnly={!!route.params?.recurringTasks}
            />
          </View>
        )}

        {/* MULTIMEDIA */}
        <View style={styles.section}>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.sectionTitle}
          >
            Evidencia Visual
          </ITText>

          <View style={styles.mediaRow}>
            {/* VIDEO CARD */}
            <ITTouchableOpacity
              style={styles.mediaActionCard}
              onPress={() => {
                setCameraMode('video');
                setCameraVisible(true);
              }}
            >
              <View style={styles.iconBox}>
                <Icon
                  source="video-plus"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <ITText style={styles.mediaActionText} weight="bold">
                Grabar Video
              </ITText>
            </ITTouchableOpacity>

            {/* PHOTO CARD */}
            <ITTouchableOpacity
              style={styles.mediaActionCard}
              onPress={() => {
                setCameraMode('photo');
                setCameraVisible(true);
              }}
            >
              <View style={styles.iconBox}>
                <Icon
                  source="camera-plus"
                  size={28}
                  color={theme.colors.primary}
                />
              </View>
              <ITText style={styles.mediaActionText} weight="bold">
                Tomar Foto
              </ITText>
            </ITTouchableOpacity>
          </View>

          {/* FOTOS Y VIDEOS GRID */}
          {(photos.length > 0 || videos.length > 0) && (
            <View style={styles.photoGrid}>
              {/* VIDEOS */}
              {videos.map((v, i) => (
                <View
                  key={`v-${i}`}
                  style={[
                    styles.photoWrapper,
                    v.url && !v.uploading
                      ? styles.borderSuccess
                      : v.error
                      ? styles.borderError
                      : {},
                  ]}
                >
                  {v.thumbnail ? (
                    <Image
                      source={{ uri: v.thumbnail }}
                      style={styles.photoImg}
                    />
                  ) : (
                    <View
                      style={[
                        styles.photoImg,
                        {
                          backgroundColor: theme.colors.slate800,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Icon source="video" size={32} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.photoOverlay,
                      { backgroundColor: 'rgba(0,0,0,0.2)' },
                    ]}
                  >
                    <Icon source="play-circle" size={32} color="#fff" />
                  </View>
                  {v.uploading && (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}

                  {v.error && !v.uploading && (
                    <View style={styles.photoOverlayError}>
                      <IconButton
                        icon="refresh"
                        size={24}
                        iconColor="#fff"
                        onPress={() => performVideoUpload(v.uri)}
                      />
                    </View>
                  )}

                  {v.url && !v.uploading && (
                    <View style={styles.statusBadgeOk}>
                      <Icon source="check-bold" size={12} color="#fff" />
                    </View>
                  )}

                  <ITTouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      const updated = videos.filter((_, idx) => idx !== i);
                      setVideos(updated);
                      syncMedia(photos, updated);
                    }}
                  >
                    <Icon source="close" size={14} color="#fff" />
                  </ITTouchableOpacity>
                </View>
              ))}
              {/* FOTOS */}
              {photos.map((p, i) => (
                <View
                  key={`p-${i}`}
                  style={[
                    styles.photoWrapper,
                    p.url && !p.uploading
                      ? styles.borderSuccess
                      : p.error
                      ? styles.borderError
                      : {},
                  ]}
                >
                  <Image source={{ uri: p.uri }} style={styles.photoImg} />
                  {p.uploading && (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}

                  {p.error && !p.uploading && (
                    <View style={styles.photoOverlayError}>
                      <IconButton
                        icon="refresh"
                        size={24}
                        iconColor="#fff"
                        onPress={() => performPhotoUpload(p)}
                      />
                    </View>
                  )}

                  {p.url && !p.uploading && (
                    <View style={styles.statusBadgeOk}>
                      <Icon source="check-bold" size={12} color="#fff" />
                    </View>
                  )}

                  <ITTouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      const updated = photos.filter((_, idx) => idx !== i);
                      setPhotos(updated);
                      syncMedia(updated, videos);
                    }}
                  >
                    <Icon source="close" size={14} color="#fff" />
                  </ITTouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* OBSERVACIONES */}
        <View style={styles.section}>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.sectionTitle}
          >
            Notas del Turno
          </ITText>
          <ITInput
            placeholder="Escribe aquí cualquier novedad o comentario..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            label={''}
          />
        </View>

        {/* BOTON FINAL */}
        <ITButton
          onPress={handleSubmit}
          loading={loading}
          disabled={
            loading ||
            photos.length < requirements.minPhotos ||
            isAnyMediaUploading
          }
          style={styles.submitBtn}
        >
          {isAnyMediaUploading
            ? 'Subiendo evidencia...'
            : photos.length < requirements.minPhotos
            ? `Faltan ${requirements.minPhotos - photos.length} fotos`
            : 'Finalizar Reporte'}
        </ITButton>
      </View>

      <CameraModal
        visible={cameraVisible}
        onDismiss={() => setCameraVisible(false)}
        mode={cameraMode}
        onCapture={handleCapture}
      />

      <ITAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() => {
          setAlertConfig({ ...alertConfig, visible: false });
          alertConfig.onConfirm?.();
        }}
        onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
        confirmLabel="Aceptar"
        cancelLabel="Cancelar"
      />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: 20 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Header
  headerCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeLabel: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeLabelText: { fontSize: 10, fontWeight: 'bold', color: '#0369A1' },
  headerDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  locRow: { flexDirection: 'row', alignItems: 'center' },
  locText: { fontSize: 13, color: '#64748B', marginLeft: 6, fontWeight: '500' },

  // Sections
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 15,
    marginLeft: 4,
  },

  // Media Actions
  mediaRow: { flexDirection: 'row', gap: 12 },
  mediaActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardActive: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBoxActive: { backgroundColor: '#22C55E' },
  mediaActionText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },

  // Photo Grid
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  photoWrapper: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderSuccess: { borderWidth: 2, borderColor: '#22C55E' },
  borderError: { borderWidth: 2, borderColor: '#EF4444' },
  statusBadgeOk: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input
  textArea: { backgroundColor: '#fff', fontSize: 15 },
  textAreaOutline: { borderRadius: 16, borderColor: '#E2E8F0' },

  // Submit
  submitBtn: { borderRadius: 16, marginTop: 10, elevation: 4 },
  submitBtnContent: { height: 60 },
  submitBtnLabel: { fontSize: 16, fontWeight: 'bold' },

  // Dialogs
  dialogStyle: { borderRadius: 24, backgroundColor: '#fff' },
  dialogIcon: { alignItems: 'center', marginTop: 20 },
  dialogTitle: { textAlign: 'center', fontWeight: 'bold', fontSize: 20 },
  dialogMsg: { textAlign: 'center', color: '#64748B', lineHeight: 20 },
});
