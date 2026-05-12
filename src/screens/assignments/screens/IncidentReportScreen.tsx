import Geolocation from '@react-native-community/geolocation';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';

import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';
import { RootState } from '../../../core/store/redux.config';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import {
  ITButton,
  ITCategorySelector,
  ITInput,
  ITMediaPicker,
  ITScreenWrapper,
  ITText,
  ITTypeSelector,
  MediaItem,
} from '../../../shared/components';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getCatalog } from '../../../shared/service/catalog.service';
import { uploadFile } from '../../../shared/service/upload.service';
import { COLORS } from '../../../shared/utils/constants';
import { CameraModal } from '../../check/components/CameraModal';
import { createIncident } from '../service/incident.service';

const { width } = Dimensions.get('window');

interface CatalogItem {
  id: string;
  name: string;
  value: string;
  color?: string;
  icon?: string;
  type?: string;
  categoryId?: string;
}

export const IncidentReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const user = useSelector((state: RootState) => state.userState);
  const { loading } = useSelector((state: RootState) => state.loaderState);

  const { initialCategory, roundId } = route.params || {};

  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [allTypes, setAllTypes] = useState<CatalogItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

  const validationSchema = Yup.object().shape({
    categoryId: Yup.string().required('Selecciona una categoría'),
    typeId: Yup.string().required('Selecciona el tipo de incidencia'),
    clientId: Yup.string().when('isAdmin', {
      is: true,
      then: schema => schema.required('El cliente es obligatorio'),
      otherwise: schema => schema.optional(),
    }),
    description: Yup.string().optional(),
  });

  const fetchCatalogs = async () => {
    try {
      const [catRes, typeRes, clientsRes] = await Promise.all([
        getCatalog('incident_category'),
        getCatalog('incident_type'),
        getCatalog('client'),
      ]);

      if (catRes.success && catRes.data) {
        setCategories(
          catRes.data.filter((c: CatalogItem) => c.type === 'INCIDENT'),
        );
      }
      if (typeRes.success && typeRes.data) {
        setAllTypes(typeRes.data);
      }
      if (clientsRes.success && clientsRes.data) {
        setClients(
          clientsRes.data.map((c: any) => ({
            label: c.name || c.value,
            value: c.id,
          })),
        );
      }
    } catch (e) {
      console.error('Error fetching catalogs:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      Geolocation.requestAuthorization();
      fetchCatalogs();
    }, []),
  );

  const handleCapture = async (file: {
    uri: string;
    type: 'video' | 'photo';
  }) => {
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
      const res = await uploadFile(
        file.uri,
        file.type === 'video' ? 'video' : 'image',
        'incident',
        roundId,
      );
      setMedia(prev =>
        prev.map(item => {
          if (item.id === tempId) {
            return res.success && res.url
              ? { ...item, url: res.url, uploading: false }
              : { ...item, uploading: false, error: true };
          }
          return item;
        }),
      );
      if (!res.success)
        dispatch(
          showToast({ message: 'Error al subir archivo', type: 'error' }),
        );
    } catch (e) {
      setMedia(prev =>
        prev.map(item =>
          item.id === tempId
            ? { ...item, uploading: false, error: true }
            : item,
        ),
      );
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
      const res = await uploadFile(
        item.uri,
        item.type === 'video' ? 'video' : 'image',
        'incident',
        roundId,
      );
      setMedia(prev => {
        const newMedia = [...prev];
        newMedia[index] =
          res.success && res.url
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
    console.log(
      '[IncidentReportScreen] Form submitted with values:',
      JSON.stringify(values, null, 2),
    );

    if (isUploading) {
      console.warn(
        '[IncidentReportScreen] Submit blocked: media still uploading',
      );
      dispatch(
        showToast({
          message: 'Espera a que termine la subida',
          type: 'warning',
        }),
      );
      return;
    }

    if (media.some(m => m.error)) {
      console.warn(
        '[IncidentReportScreen] Submit blocked: media upload error exists',
      );
      dispatch(
        showToast({ message: 'Reintenta o elimina fallidos', type: 'error' }),
      );
      return;
    }

    const validMedia = media.filter(m => m.url).map(m => m.url!);

    console.log(
      '[IncidentReportScreen] Mapped media URLs:',
      JSON.stringify(validMedia, null, 2),
    );

    dispatch(showLoader(true));

    const selectedType = allTypes.find(t => t.id === values.typeId);

    // API REQUIRES locationId. Fallback chain: params.location.id -> params.roundId -> values.clientId
    const finalLocationId =
      route.params?.location?.id || roundId || values.clientId;

    const sendReport = async (position?: any) => {
      console.log(
        '[IncidentReportScreen] sendReport. locationId:',
        finalLocationId,
      );
      try {
        const res = await createIncident({
          title: selectedType?.value || 'Incidencia',
          description: values.description || '',
          locationId: finalLocationId,
          media: validMedia,
          categoryId: values.categoryId,
          typeId: values.typeId,
          latitude: position?.coords?.latitude,
          longitude: position?.coords?.longitude,
          clientId: values.clientId || undefined,
          guardId: user.id,
          roundId: roundId || undefined,
        });

        console.log(
          '[IncidentReportScreen] createIncident result:',
          JSON.stringify(res, null, 2),
        );

        if (res.success) {
          dispatch(
            showToast({
              message: 'Reporte enviado con éxito',
              type: 'success',
            }),
          );
          navigation.goBack();
        } else {
          console.error('[IncidentReportScreen] API Error:', res.messages);
          dispatch(
            showToast({
              message: res.messages?.[0] || 'Error al enviar reporte',
              type: 'error',
            }),
          );
        }
      } catch (e: any) {
        console.error('[IncidentReportScreen] Connection/Catch error:', e);
        dispatch(showToast({ message: 'Error de conexión', type: 'error' }));
      } finally {
        dispatch(showLoader(false));
      }
    };

    console.log('[IncidentReportScreen] Getting current position...');
    Geolocation.getCurrentPosition(
      pos => {
        console.log('[IncidentReportScreen] Position success');
        sendReport(pos);
      },
      err => {
        console.error('[IncidentReportScreen] Position error:', err);
        sendReport();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
    );
  };

  return (
    <ITScreenWrapper padding={false} edges={['bottom']}>
      <Formik
        initialValues={{
          categoryId: null,
          typeId: null,
          clientId: user.clientId || '',
          description: '',
          isAdmin: user.role === UserRole.ADMIN,
        }}
        validationSchema={validationSchema}
        onSubmit={onFormSubmit}
      >
        {({ setFieldValue, handleSubmit, values, errors, touched }) => (
          <View style={styles.paddingContainer}>
            <ITText variant="headlineSmall" weight="bold">
              Nuevo Reporte
            </ITText>
            <ITText
              variant="bodyMedium"
              style={{ opacity: 0.6, marginBottom: 20 }}
            >
              Completa los detalles de la incidencia
            </ITText>

            {user.role === UserRole.ADMIN && (
              <View style={styles.section}>
                <ITText variant="labelLarge" weight="bold" style={styles.label}>
                  SELECCIONAR CLIENTE
                </ITText>
                <SearchComponent
                  label="Cliente"
                  placeholder="Selecciona un cliente..."
                  options={clients}
                  value={values.clientId}
                  onSelect={val => setFieldValue('clientId', val)}
                />
                {errors.clientId && touched.clientId && (
                  <ITText
                    variant="bodySmall"
                    color={theme.colors.error}
                    style={{ marginTop: 4 }}
                  >
                    {errors.clientId as string}
                  </ITText>
                )}
              </View>
            )}

            <ITCategorySelector
              categories={categories}
              selectedId={values.categoryId}
              onSelect={id => {
                setFieldValue('categoryId', id);
                setFieldValue('typeId', null);
              }}
            />
            {errors.categoryId && touched.categoryId && (
              <ITText
                variant="bodySmall"
                color={theme.colors.error}
                style={{ marginTop: -16, marginBottom: 16 }}
              >
                {errors.categoryId as string}
              </ITText>
            )}

            {values.categoryId && (
              <ITTypeSelector
                types={allTypes.filter(t => t.categoryId === values.categoryId)}
                selectedId={values.typeId}
                onSelect={id => setFieldValue('typeId', id)}
                label="2. TIPO DE INCIDENCIA"
              />
            )}
            {errors.typeId && touched.typeId && (
              <ITText
                variant="bodySmall"
                color={theme.colors.error}
                style={{ marginTop: -16, marginBottom: 16 }}
              >
                {errors.typeId as string}
              </ITText>
            )}

            <ITMediaPicker
              media={media}
              onMediaChange={setMedia}
              uploadPath="incident"
              roundId={roundId}
            />

            <View style={styles.section}>
              <ITText variant="labelLarge" weight="bold" style={styles.label}>
                4. OBSERVACIONES
              </ITText>
              <ITInput
                testID="DESCRIPTION_INPUT"
                placeholder="Describe lo sucedido brevemente..."
                multiline
                numberOfLines={4}
                value={values.description}
                onChangeText={val => setFieldValue('description', val)}
                label={'Descripción'}
              />
            </View>

            <ITButton
              testID="SUBMIT_INCIDENT_REPORT_BTN"
              label={isUploading ? 'SUBIENDO...' : 'ENVIAR REPORTE'}
              onPress={() => handleSubmit()}
              loading={loading}
              disabled={
                loading ||
                isUploading ||
                !values.categoryId ||
                !values.typeId ||
                (user.role === UserRole.ADMIN && !values.clientId)
              }
              style={{ marginTop: 20 }}
            />
          </View>
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
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: 15,
    letterSpacing: 1.2,
  },
  categoryScroll: { paddingRight: 20, gap: 10, paddingVertical: 10 },
  catCard: {
    width: 100,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginRight: 0,
    marginBottom: 0,
  },
  catContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  catText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    color: '#64748B',
  },
  typeChip: { borderRadius: 10, borderColor: '#EEEEEE' },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mediaList: { paddingVertical: 10 },
  mediaWrapper: { marginRight: 16, position: 'relative' },
  mediaPreview: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.3)',
    borderRadius: 16,
  },
  removeMedia: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
});
