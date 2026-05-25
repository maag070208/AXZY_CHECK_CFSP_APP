// src/screens/maintenances/screens/MaintenanceReportScreen.tsx

import Geolocation from '@react-native-community/geolocation';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { database } from '../../../core/database/database';
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
import { createMaintenance } from '../service/maintenance.service';
import { generateUUID } from '../../../shared/utils/uuid';

const { width } = Dimensions.get('window');

const validationSchema = Yup.object().shape({
  categoryId: Yup.string().required('Selecciona una categoría'),
  typeId: Yup.string().required('Selecciona el tipo de mantenimiento'),
  clientId: Yup.string().when('isAdmin', {
    is: true,
    then: schema => schema.required('El cliente es obligatorio'),
    otherwise: schema => schema.optional(),
  }),
  description: Yup.string().optional(),
});

export const MaintenanceReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const user = useSelector((state: RootState) => state.userState);
  const { loading } = useSelector((state: RootState) => state.loaderState);

  const { roundId } = route.params || {};

  const [categories, setCategories] = useState<any[]>([]);
  const [allTypes, setAllTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);

  const fetchCatalogs = async () => {
    try {
      // 1. Intentar cargar desde la base de datos local SQLite (Offline first)
      const [localCats, localTypes, localClients] = await Promise.all([
        database.get('incident_categories').query().fetch(),
        database.get('incident_types').query().fetch(),
        database.get('clients').query().fetch(),
      ]);

      if (localCats.length > 0 && localTypes.length > 0) {
        setCategories(
          localCats
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              value: c.value,
              type: c.type,
              color: c.color,
              icon: c.icon,
            }))
            .filter(c => c.type === 'MAINTENANCE'),
        );

        setAllTypes(
          localTypes.map((t: any) => ({
            id: t.id,
            name: t.name,
            value: t.value,
            categoryId: t.categoryId,
          })),
        );

        setClients(
          localClients.map((c: any) => ({
            label: c.name,
            value: c.id,
          })),
        );

        console.log(
          '[MaintenanceReportScreen] Catálogos cargados de base de datos local',
        );
        return;
      }
    } catch (e: any) {
      console.error(
        '[MaintenanceReportScreen] Error leyendo base de datos local, intentando API...',
        e,
      );
    }

    // 2. Fallback a la API original si la base de datos local está vacía o falla
    try {
      const [catRes, typeRes, clientsRes] = await Promise.all([
        getCatalog('incident_category'),
        getCatalog('incident_type'),
        getCatalog('client'),
      ]);

      if (catRes.success) {
        setCategories(catRes.data.filter((c: any) => c.type === 'MAINTENANCE'));
      }
      if (typeRes.success) setAllTypes(typeRes.data);
      if (clientsRes.success) {
        setClients(
          clientsRes.data.map((c: any) => ({ label: c.name, value: c.id })),
        );
      }
      console.log('[MaintenanceReportScreen] Catálogos cargados desde la API');
    } catch (e) {
      console.error('Error fetching catalogs from API:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCatalogs();
    }, []),
  );

  const onFormSubmit = async (values: any) => {
    const isUploading = media.some(m => m.uploading);
    if (isUploading) {
      dispatch(
        showToast({
          message: 'Espera a que termine la subida',
          type: 'warning',
        }),
      );
      return;
    }

    const validMedia = media.filter(m => m.url).map(m => m.url!);
    dispatch(showLoader(true));

    const selectedType = allTypes.find(t => t.id === values.typeId);
    const finalLocationId =
      route.params?.location?.id || roundId || values.clientId;

    const sendReport = async (position?: any) => {
      try {
        const NetInfo = require('@react-native-community/netinfo').default;
        const netState = await NetInfo.fetch();

        if (!netState.isConnected) {
          // MODO OFFLINE: Guardar localmente en WatermelonDB
          await database.write(async () => {
            await database.get('maintenances').create((newMaint: any) => {
              newMaint._raw.id = generateUUID();
              newMaint.title = selectedType?.value || 'Mantenimiento';
              newMaint.description = values.description || '';
              newMaint.locationId = finalLocationId;
              newMaint.media = JSON.stringify(validMedia);
              newMaint.categoryId = values.categoryId;
              newMaint.typeId = values.typeId;
              newMaint.latitude = position?.coords?.latitude || null;
              newMaint.longitude = position?.coords?.longitude || null;
              newMaint.status = 'PENDING';
              newMaint.clientId = values.clientId || null;
              newMaint.guardId = user.id;
            });
          });

          dispatch(
            showToast({
              message: 'Reporte de mantenimiento guardado localmente (Offline)',
              type: 'success',
            }),
          );
          navigation.goBack();
          return;
        }

        // MODO ONLINE
        const res = await createMaintenance({
          title: selectedType?.value || 'Mantenimiento',
          description: values.description || '',
          locationId: finalLocationId,
          media: validMedia,
          categoryId: values.categoryId,
          typeId: values.typeId,
          latitude: position?.coords?.latitude,
          longitude: position?.coords?.longitude,
          clientId: values.clientId || undefined,
          guardId: user.id,
        });

        if (res.success) {
          dispatch(
            showToast({
              message: 'Reporte enviado con éxito',
              type: 'success',
            }),
          );
          navigation.goBack();
        } else {
          dispatch(
            showToast({
              message: res.messages?.[0] || 'Error al enviar',
              type: 'error',
            }),
          );
        }
      } catch (e: any) {
        console.error(
          '[MaintenanceReportScreen] Connection/Catch/DB error:',
          e,
        );
        dispatch(
          showToast({
            message: 'Error al enviar reporte o guardar localmente',
            type: 'error',
          }),
        );
      } finally {
        dispatch(showLoader(false));
      }
    };

    Geolocation.getCurrentPosition(
      pos => sendReport(pos),
      () => sendReport(),
      { enableHighAccuracy: false, timeout: 5000 },
    );
  };

  return (
    <ITScreenWrapper padding={false} edges={['bottom']} scrollable>
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
            <ITText variant="bodyMedium" style={styles.subtitle}>
              Detalles del mantenimiento
            </ITText>

            {values.isAdmin && (
              <View style={styles.section}>
                <ITText variant="labelLarge" weight="bold" style={styles.label}>
                  SELECCIONAR CLIENTE
                </ITText>
                <SearchComponent
                  label="Cliente"
                  options={clients}
                  value={values.clientId}
                  onSelect={val => setFieldValue('clientId', val)}
                />
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

            {values.categoryId && (
              <ITTypeSelector
                types={allTypes.filter(t => t.categoryId === values.categoryId)}
                selectedId={values.typeId}
                onSelect={id => setFieldValue('typeId', id)}
                label="2. TIPO DE MANTENIMIENTO"
              />
            )}

            <ITMediaPicker
              media={media}
              onMediaChange={setMedia}
              uploadPath="maintenance"
              roundId={roundId}
            />

            <View style={styles.section}>
              <ITText variant="labelLarge" weight="bold" style={styles.label}>
                4. OBSERVACIONES
              </ITText>
              <ITInput
                testID="MAINTENANCE_DESC_INPUT"
                placeholder="Descripción..."
                multiline
                numberOfLines={4}
                value={values.description}
                onChangeText={val => setFieldValue('description', val)}
                label="Descripción"
              />
            </View>

            <ITButton
              testID="SUBMIT_MAINTENANCE_BTN"
              label="ENVIAR REPORTE"
              onPress={() => handleSubmit()}
              loading={loading}
              disabled={loading || media.some(m => m.uploading)}
              style={styles.submitBtn}
            />
          </View>
        )}
      </Formik>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  paddingContainer: { padding: 20 },
  subtitle: { opacity: 0.6, marginBottom: 20 },
  section: { marginBottom: 24 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 1.2,
  },
  submitBtn: { marginTop: 20 },
});
