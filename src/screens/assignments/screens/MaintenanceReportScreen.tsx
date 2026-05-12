// src/screens/maintenances/screens/MaintenanceReportScreen.tsx

import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { SearchComponent } from '../../../shared/components/SearchComponent';
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
import { showToast } from '../../../core/store/slices/toast.slice';
import { createMaintenance } from '../service/maintenance.service';
import Geolocation from '@react-native-community/geolocation';
import { getCatalog } from '../../../shared/service/catalog.service';
import { useFocusEffect } from '@react-navigation/native';
import { showLoader } from '../../../core/store/slices/loader.slice';

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
    } catch (e) {
      console.error('Error fetching catalogs:', e);
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
