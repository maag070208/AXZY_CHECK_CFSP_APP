import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Icon, Chip, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Geolocation from '@react-native-community/geolocation';
import { useDispatch, useSelector } from 'react-redux';

import { COLORS } from '../../../shared/utils/constants';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';
import { CameraModal } from '../../check/components/CameraModal';
import { createMaintenance } from '../service/maintenance.service';
import { showToast } from '../../../core/store/slices/toast.slice';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { uploadFile } from '../../../shared/service/upload.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { ITText, ITButton, ITInput, ITScreenWrapper } from '../../../shared/components';

const { width } = Dimensions.get('window');

const MAINTENANCE_TYPES = [
  'Fuga de agua', 'Fallo en cerco', 'Luminaria apagada', 'Poda de árboles', 'Daños en equipamiento', 'Daños en construcción', 'Otro'
];

interface MediaItem {
  id: string;
  uri: string;
  type: 'video' | 'photo';
  uploading: boolean;
  error: boolean;
  url?: string;
}

export const MaintenanceReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const user = useSelector((state: RootState) => state.userState);
  const { roundId } = route.params || {};

  const [clients, setClients] = useState<any[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

  const validationSchema = Yup.object().shape({
    title: Yup.string().required('Selecciona el tipo de mantenimiento'),
    clientId: Yup.string().when('isAdmin', {
      is: true,
      then: (schema) => schema.required('El cliente es obligatorio'),
      otherwise: (schema) => schema.optional(),
    }),
    description: Yup.string().optional(),
  });

  const fetchCatalogs = async () => {
    try {
      const res = await getCatalog('client');
      if (res.success && res.data) {
        setClients(res.data.map((c: any) => ({ label: c.name || c.value, value: c.id })));
      }
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      Geolocation.requestAuthorization();
      fetchCatalogs();
    }, [])
  );

  const handleCapture = async (file: { uri: string; type: 'video' | 'photo' }) => {
    const tempId = Date.now().toString();
    const newItem: MediaItem = {
      id: tempId,
      uri: file.uri,
      type: file.type,
      uploading: true,
      error: false,
    };

    setMedia(prev => [...prev, newItem]);

    try {
      const res = await uploadFile(file.uri, file.type === 'video' ? 'video' : 'image', 'incident', roundId);
      setMedia(prev => prev.map(item => {
        if (item.id === tempId) {
          return res.success && res.url 
            ? { ...item, url: res.url, uploading: false } 
            : { ...item, uploading: false, error: true };
        }
        return item;
      }));
    } catch (e) {
      setMedia(prev => prev.map(item => item.id === tempId ? { ...item, uploading: false, error: true } : item));
    }
  };

  const retryUpload = async (index: number) => {
    const item = media[index];
    if (!item.error || item.uploading) return;

    setMedia(prev => {
      const newMedia = [...prev];
      newMedia[index] = { ...newMedia[index], error: false, uploading: true };
      return newMedia;
    });

    try {
      const res = await uploadFile(item.uri, item.type === 'video' ? 'video' : 'image', 'incident', roundId);
      setMedia(prev => {
        const newMedia = [...prev];
        newMedia[index] = res.success && res.url 
          ? { ...newMedia[index], url: res.url, uploading: false } 
          : { ...newMedia[index], uploading: false, error: true };
        return newMedia;
      });
    } catch (e) {
      setMedia(prev => {
        const newMedia = [...prev];
        newMedia[index] = { ...newMedia[index], uploading: false, error: true };
        return newMedia;
      });
    }
  };

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const isUploading = media.some(m => m.uploading);

  const onFormSubmit = async (values: any) => {
    if (isUploading) {
      dispatch(showToast({ message: 'Espera a que termine la subida', type: 'warning' }));
      return;
    }

    if (media.some(m => m.error)) {
      dispatch(showToast({ message: 'Reintenta o elimina fallidos', type: 'error' }));
      return;
    }

    const validMedia = media.filter(m => m.url).map(m => ({
      type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
      url: m.url
    }));

    dispatch(showLoader(true));

    const sendReport = async (position?: any) => {
      try {
        const res = await createMaintenance({
          title: values.title,
          category: 'MANTENIMIENTO',
          description: values.description,
          media: validMedia,
          latitude: position?.coords?.latitude,
          longitude: position?.coords?.longitude,
          clientId: values.clientId || undefined,
          guardId: user.id,
          roundId: roundId || undefined
        });

        if (res.success) {
          dispatch(showToast({ message: 'Mantenimiento reportado con éxito', type: 'success' }));
          navigation.goBack();
        } else {
          dispatch(showToast({ message: 'Error al enviar reporte', type: 'error' }));
        }
      } catch (e) {
        dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
      } finally {
        dispatch(showLoader(false));
      }
    };

    Geolocation.getCurrentPosition(
      (pos) => sendReport(pos),
      () => sendReport(),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );
  };

  return (
    <ITScreenWrapper padding={false}>
      <Formik
        initialValues={{
          title: '',
          clientId: user.clientId || '',
          description: '',
          isAdmin: user.role === UserRole.ADMIN,
        }}
        validationSchema={validationSchema}
        onSubmit={onFormSubmit}
      >
        {({ setFieldValue, handleSubmit, values, errors, touched }) => (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.paddingContainer}>
              <ITText variant="headlineSmall" weight="bold">Nuevo Mantenimiento</ITText>
              <ITText variant="bodyMedium" style={{ opacity: 0.6, marginBottom: 20 }}>
                Reporta fallos técnicos o de infraestructura
              </ITText>

              {user.role === UserRole.ADMIN && (
                <View style={styles.section}>
                  <ITText variant="labelLarge" weight="bold" style={styles.label}>CLIENTE</ITText>
                  <SearchComponent
                    label="Selecciona Cliente"
                    placeholder="Buscar cliente..."
                    options={clients}
                    value={values.clientId}
                    onSelect={(val) => setFieldValue('clientId', val)}
                  />
                  {errors.clientId && touched.clientId && (
                    <ITText variant="bodySmall" color={theme.colors.error} style={{ marginTop: 4 }}>
                      {errors.clientId as string}
                    </ITText>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <ITText variant="labelLarge" weight="bold" style={styles.label}>1. TIPO DE MANTENIMIENTO</ITText>
                <View style={styles.typeWrapper}>
                  {MAINTENANCE_TYPES.map((type) => (
                    <Chip
                      key={type}
                      selected={values.title === type}
                      onPress={() => setFieldValue('title', type)}
                      style={[styles.typeChip, values.title === type && { backgroundColor: theme.colors.primary }]}
                      textStyle={[styles.typeChipText, values.title === type && { color: '#FFF' }]}
                      showSelectedCheck={false}
                      mode="outlined"
                    >
                      {type}
                    </Chip>
                  ))}
                </View>
                {errors.title && touched.title && (
                  <ITText variant="bodySmall" color={theme.colors.error}>{errors.title as string}</ITText>
                )}
              </View>

              <View style={styles.section}>
                <ITText variant="labelLarge" weight="bold" style={styles.label}>2. EVIDENCIA</ITText>
                <View style={styles.mediaButtons}>
                  <ITButton
                    mode="outlined"
                    icon="camera"
                    label="FOTO"
                    onPress={() => { setCameraMode('photo'); setCameraVisible(true); }}
                    style={{ flex: 1 }}
                  />
                  <ITButton
                    mode="contained"
                    color="#455A64"
                    icon="video"
                    label="VIDEO"
                    onPress={() => { setCameraMode('video'); setCameraVisible(true); }}
                    style={{ flex: 1 }}
                  />
                </View>

                {media.length > 0 && (
                  <ScrollView horizontal style={styles.mediaList} showsHorizontalScrollIndicator={false}>
                    {media.map((item, index) => (
                      <View key={index} style={styles.mediaWrapper}>
                        <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
                        {item.type === 'video' && (
                          <View style={styles.videoOverlay}><Icon source="play-circle" color="white" size={30} /></View>
                        )}
                        {item.uploading && (
                          <View style={styles.uploadOverlay}><ActivityIndicator size="small" color="white" /></View>
                        )}
                        {item.error && (
                          <TouchableOpacity style={styles.errorOverlay} onPress={() => retryUpload(index)}>
                            <Icon source="refresh" color="white" size={30} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(index)}>
                          <Icon source="close-circle" color={COLORS.red} size={24} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.section}>
                <ITText variant="labelLarge" weight="bold" style={styles.label}>3. OBSERVACIONES</ITText>
                <ITInput
                  placeholder="Detalles adicionales..."
                  multiline
                  numberOfLines={4}
                  value={values.description}
                  onChangeText={(val) => setFieldValue('description', val)}
                />
              </View>

              <ITButton
                label={isUploading ? 'SUBIENDO...' : 'ENVIAR REPORTE'}
                onPress={() => handleSubmit()}
                loading={loading}
                disabled={loading || isUploading}
                style={{ marginTop: 20 }}
              />
            </View>
          </ScrollView>
        )}
      </Formik>

      <CameraModal
        visible={cameraVisible}
        mode={cameraMode}
        onDismiss={() => setCameraVisible(false)}
        onCapture={handleCapture}
        maxDuration={APP_SETTINGS.INCIDENT_VIDEO_DURATION_LIMIT}
      />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 60 },
  paddingContainer: { padding: 20 },
  section: { marginBottom: 24 },
  label: { marginBottom: 12, opacity: 0.7, letterSpacing: 1 },
  typeWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeChip: { borderRadius: 12, paddingHorizontal: 4 },
  typeChipText: { fontSize: 13, fontWeight: 'bold' },
  mediaButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mediaList: { paddingVertical: 10 },
  mediaWrapper: { marginRight: 16, position: 'relative' },
  mediaPreview: { width: 110, height: 110, borderRadius: 16, backgroundColor: '#F1F5F9' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16 },
  errorOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,0,0,0.3)', borderRadius: 16 },
  removeMedia: { position: 'absolute', top: -10, right: -10, backgroundColor: '#FFF', borderRadius: 12 },
});