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
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  IconButton,
  ProgressBar,
  Portal,
  Dialog,
  Surface,
  Icon,
  Modal,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { uploadFile } from '../../../shared/service/upload.service';
import { CameraModal } from '../components/CameraModal';
import { registerCheck, updateCheck } from '../service/check.service';
import Geolocation from '@react-native-community/geolocation';
import {
  getAllAssignments,
  updateAssignmentStatus,
} from '../../assignments/service/assignment.service';
import { TaskChecklist } from '../components/TaskChecklist';
import { showToast } from '../../../core/store/slices/toast.slice';
import { theme } from '../../../shared/theme/theme';
import { createVideoThumbnail } from 'react-native-compressor';

const { width } = Dimensions.get('window');

export const CheckReportScreen = ({ route, navigation }: any) => {
  const { location, assignmentId, roundId } = route.params;
  const user = useSelector((state: RootState) => state.userState);
  const dispatch = useDispatch();
  
  // States
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [currentKardexId, setCurrentKardexId] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'video' | 'photo'>('photo');
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [requirements] = useState({ minPhotos: 0, videoRequired: false, label: 'Libre', level: 0 });

  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'warning' | 'confirm'; onConfirm?: () => void }>({ 
    visible: false, title: '', message: '', type: 'warning' 
  });

  const isAnyMediaUploading = photos.some(p => p.uploading) || videos.some(v => v.uploading);

  useEffect(() => {
    initReport();
    if (route.params.recurringTasks) {
        setTasks(route.params.recurringTasks);
    } else if (assignmentId) {
      loadAssignmentTasks();
    }
  }, []);

  const loadAssignmentTasks = async () => {
    try {
      const res = await getAllAssignments({ id: assignmentId });
      if (res.success && res.data?.length > 0) {
        setTasks(res.data[0].tasks || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleTaskToggle = (taskId: number) => {
    setTasks(current => current.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
      return true;
    }
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    });
  };

  const initReport = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      let coords = hasPermission ? await getCurrentLocation() : null;

      const res = await registerCheck(
        location.id,
        user.id,
        '',
        [],
        coords?.lat,
        coords?.lng,
        route.params.assignmentId,
      );

      if (res.success && res.data) {
        setCurrentKardexId(res.data.id);
      } else {
        setAlertConfig({ visible: true, title: 'Error', message: 'No se pudo iniciar el reporte.', type: 'error', onConfirm: () => navigation.goBack() });
      }
    } catch (e) {
      setAlertConfig({ visible: true, title: 'Error de Red', message: 'No hay conexión con el servidor.', type: 'error' });
    }
  };

  const syncMedia = async (updatedPhotos: any[], updatedVideos: any[]) => {
    if (!currentKardexId) return;
    const mediaToSend: any[] = [
        ...updatedPhotos.filter(p => p.url).map(p => ({ type: 'IMAGE', url: p.url, description: p.description || '' })),
        ...updatedVideos.filter(v => v.url).map(v => ({ type: 'VIDEO', url: v.url, description: 'Video de reporte' }))
    ];
    try { await updateCheck(currentKardexId, undefined, mediaToSend); } catch (e) {}
  };

  const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
    if (file.type === 'video') {
      let thumbnail = null;
      try {
        const thumb = await createVideoThumbnail(file.uri);
        thumbnail = thumb.path;
      } catch (e) { console.warn('Thumbnail error', e); }

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
    setVideos(curr => curr.map(v => v.uri === uri ? { ...v, uploading: true, error: false } : v));
    try {
      const res: any = await uploadFile(uri, 'video', location?.name, roundId);
      if (res.success) {
          setVideos(curr => {
              const updated = curr.map(v => v.uri === uri ? { ...v, url: res.url, uploading: false } : v);
              syncMedia(photos, updated);
              return updated;
          });
      } else {
          setVideos(curr => curr.map(v => v.uri === uri ? { ...v, uploading: false, error: true } : v));
      }
    } catch (e) { setVideos(curr => curr.map(v => v.uri === uri ? { ...v, uploading: false, error: true } : v)); }
  };

  const performPhotoUpload = async (photo: any) => {
    setPhotos(curr => curr.map(p => p.uri === photo.uri ? { ...p, uploading: true, error: false } : p));
    try {
      const res: any = await uploadFile(photo.uri, 'image', location?.name, roundId);
      if (res.success) {
        setPhotos(curr => {
          const updated = curr.map(p => p.uri === photo.uri ? { ...p, url: res.url, uploading: false } : p);
          syncMedia(updated, videos);
          return updated;
        });
      } else {
        setPhotos(curr => curr.map(p => p.uri === photo.uri ? { ...p, uploading: false, error: true } : p));
      }
    } catch (e) { setPhotos(curr => curr.map(p => p.uri === photo.uri ? { ...p, uploading: false, error: true } : p)); }
  };

  const handleBackPress = () => {
    setAlertConfig({ visible: true, title: '¿Abandonar Reporte?', message: 'Se perderán los cambios que no se hayan sincronizado.', type: 'confirm', onConfirm: () => navigation.goBack() });
    return true;
  };

  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => handler.remove();
  }, [currentKardexId]));

  const handleSubmit = async () => {
    if (loading || !currentKardexId) return;
    setLoading(true);
    try {
      let finalNotes = notes;
      if (!assignmentId && tasks.length > 0) {
          const checklist = tasks.map(t => `[${t.completed ? 'x' : ' '}] ${t.description}`).join('\n');
          finalNotes = `${finalNotes}\n\n--- CHECKLIST ---\n${checklist}`;
      }
      const res = await updateCheck(currentKardexId, finalNotes || 'Check completado');
      if (res.success) {
        // Solo intentamos actualizar si realmente es una tarea asignada (Assignment), no una Ronda
        if (assignmentId) {
          try {
            await updateAssignmentStatus(assignmentId, 'UNDER_REVIEW' as any);
          } catch (err) {
            console.warn('[Check] No se pudo actualizar el status de la asignación (puede ser una ronda):', err);
          }
        }
        dispatch(showToast({ message: '¡Reporte enviado!', type: 'success' }));
        navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      }
    } catch (e) {
      console.log(e);
      setAlertConfig({ visible: true, title: 'Error', message: 'No se pudo finalizar el reporte.', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER MODERNO */}
        <Surface style={styles.headerCard} elevation={0}>
            <View style={styles.headerTop}>
                <View style={styles.badgeLabel}>
                    <Text style={styles.badgeLabelText}>{(requirements.label || '').toUpperCase()}</Text>
                </View>
                <Text style={styles.headerDate}>{new Date().toLocaleDateString()}</Text>
            </View>
            <Text style={styles.headerTitle}>{location?.name || 'Ubicación'}</Text>
            <View style={styles.locRow}>
                <Icon source="map-marker-radius" size={16} color={theme.colors.primary} />
                <Text style={styles.locText}>Punto de control verificado</Text>
            </View>
        </Surface>

        {/* CHECKLIST */}
        {tasks.length > 0 && (
          <View style={styles.section}>
             <Text style={styles.sectionTitle}>Tareas a Realizar</Text>
             <TaskChecklist tasks={tasks} onTaskToggle={handleTaskToggle} isLocalOnly={!!route.params?.recurringTasks} />
          </View>
        )}

        {/* MULTIMEDIA */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidencia Visual</Text>
            
            <View style={styles.mediaRow}>
                {/* VIDEO CARD */}
                <TouchableOpacity 
                    style={styles.mediaActionCard} 
                    onPress={() => { setCameraMode('video'); setCameraVisible(true); }}
                >
                    <View style={styles.iconBox}>
                        <Icon source="video-plus" size={28} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.mediaActionText}>Grabar Video</Text>
                </TouchableOpacity>

                {/* PHOTO CARD */}
                <TouchableOpacity 
                    style={styles.mediaActionCard} 
                    onPress={() => { setCameraMode('photo'); setCameraVisible(true); }}
                >
                    <View style={styles.iconBox}>
                        <Icon source="camera-plus" size={28} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.mediaActionText}>Tomar Foto</Text>
                </TouchableOpacity>
            </View>

            {/* FOTOS Y VIDEOS GRID */}
            {(photos.length > 0 || videos.length > 0) && (
                <View style={styles.photoGrid}>
                    {/* VIDEOS */}
                    {videos.map((v, i) => (
                        <View key={`v-${i}`} style={[
                            styles.photoWrapper,
                            v.url && !v.uploading ? styles.borderSuccess : v.error ? styles.borderError : {}
                        ]}>
                            {v.thumbnail ? (
                                <Image source={{ uri: v.thumbnail }} style={styles.photoImg} />
                            ) : (
                                <View style={[styles.photoImg, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Icon source="video" size={32} color="#fff" />
                                </View>
                            )}
                            <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                                <Icon source="play-circle" size={32} color="#fff" />
                            </View>
                            {v.uploading && <View style={styles.photoOverlay}><ActivityIndicator color="#fff" size="small" /></View>}
                            
                            {v.error && !v.uploading && (
                                <View style={styles.photoOverlayError}>
                                    <IconButton icon="refresh" size={24} iconColor="#fff" onPress={() => performVideoUpload(v.uri)} />
                                </View>
                            )}

                            {v.url && !v.uploading && (
                                <View style={styles.statusBadgeOk}>
                                    <Icon source="check-bold" size={12} color="#fff" />
                                </View>
                            )}

                            <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                                const updated = videos.filter((_, idx) => idx !== i);
                                setVideos(updated);
                                syncMedia(photos, updated);
                            }}>
                                <Icon source="close" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {/* FOTOS */}
                    {photos.map((p, i) => (
                        <View key={`p-${i}`} style={[
                            styles.photoWrapper,
                            p.url && !p.uploading ? styles.borderSuccess : p.error ? styles.borderError : {}
                        ]}>
                            <Image source={{ uri: p.uri }} style={styles.photoImg} />
                            {p.uploading && <View style={styles.photoOverlay}><ActivityIndicator color="#fff" size="small" /></View>}
                            
                            {p.error && !p.uploading && (
                                <View style={styles.photoOverlayError}>
                                    <IconButton icon="refresh" size={24} iconColor="#fff" onPress={() => performPhotoUpload(p)} />
                                </View>
                            )}

                            {p.url && !p.uploading && (
                                <View style={styles.statusBadgeOk}>
                                    <Icon source="check-bold" size={12} color="#fff" />
                                </View>
                            )}

                            <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                                const updated = photos.filter((_, idx) => idx !== i);
                                setPhotos(updated);
                                syncMedia(updated, videos);
                            }}>
                                <Icon source="close" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>

        {/* OBSERVACIONES */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas del Turno</Text>
            <TextInput
                mode="outlined"
                placeholder="Escribe aquí cualquier novedad o comentario..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                style={styles.textArea}
                outlineStyle={styles.textAreaOutline}
                placeholderTextColor="#94A3B8"
            />
        </View>

        {/* BOTON FINAL */}
        <Button 
            mode="contained" 
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || photos.length < requirements.minPhotos || isAnyMediaUploading}
            style={[styles.submitBtn, isAnyMediaUploading && { backgroundColor: '#94A3B8' }]}
            contentStyle={styles.submitBtnContent}
            labelStyle={styles.submitBtnLabel}
        >
            {isAnyMediaUploading 
                ? 'Subiendo evidencia...' 
                : photos.length < requirements.minPhotos 
                    ? `Faltan ${requirements.minPhotos - photos.length} fotos` 
                    : 'Finalizar Reporte'}
        </Button>

      </ScrollView>

      <CameraModal visible={cameraVisible} onDismiss={() => setCameraVisible(false)} mode={cameraMode} onCapture={handleCapture} />

      {/* ALERTAS PERSONALIZADAS */}
      <Portal>
        <Dialog visible={alertConfig.visible} onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })} style={styles.dialogStyle}>
            <View style={styles.dialogIcon}>
                <Icon source={alertConfig.type === 'confirm' ? 'help-circle' : 'alert-circle'} size={40} color={alertConfig.type === 'error' ? '#EF4444' : theme.colors.primary} />
            </View>
            <Dialog.Title style={styles.dialogTitle}>{alertConfig.title}</Dialog.Title>
            <Dialog.Content><Text style={styles.dialogMsg}>{alertConfig.message}</Text></Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setAlertConfig({ ...alertConfig, visible: false })} textColor="#64748B">Cancelar</Button>
                <Button onPress={() => { setAlertConfig({ ...alertConfig, visible: false }); alertConfig.onConfirm?.(); }} mode="contained" buttonColor={theme.colors.primary}>Aceptar</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: 20 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Header
  headerCard: { padding: 20, borderRadius: 24, backgroundColor: '#fff', marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badgeLabel: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeLabelText: { fontSize: 10, fontWeight: 'bold', color: '#0369A1' },
  headerDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  locRow: { flexDirection: 'row', alignItems: 'center' },
  locText: { fontSize: 13, color: '#64748B', marginLeft: 6, fontWeight: '500' },

  // Sections
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 15, marginLeft: 4 },
  
  // Media Actions
  mediaRow: { flexDirection: 'row', gap: 12 },
  mediaActionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  cardActive: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  iconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  iconBoxActive: { backgroundColor: '#22C55E' },
  mediaActionText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },

  // Photo Grid
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  photoWrapper: { width: (width - 60) / 3, height: (width - 60) / 3, borderRadius: 15, overflow: 'hidden', position: 'relative', backgroundColor: '#F1F5F9' },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  photoOverlayError: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(239, 68, 68, 0.4)', justifyContent: 'center', alignItems: 'center' },
  borderSuccess: { borderWidth: 2, borderColor: '#22C55E' },
  borderError: { borderWidth: 2, borderColor: '#EF4444' },
  statusBadgeOk: { position: 'absolute', bottom: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

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
  dialogMsg: { textAlign: 'center', color: '#64748B', lineHeight: 20 }
});