import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Chip,
  IconButton,
  Surface,
  TouchableRipple,
  Icon,
  Portal,
  Dialog,
} from 'react-native-paper';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { theme } from '../../../shared/theme/theme';
import { COLORS } from '../../../shared/utils/constants';
import { APP_SETTINGS } from '../../../core/constants/APP_SETTINGS';
import { CameraModal } from '../../check/components/CameraModal';
import { createMaintenance } from '../service/maintenance.service';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { uploadFile } from '../../../shared/service/upload.service';
import { getCatalog } from '../../../shared/service/catalog.service';
import Geolocation from '@react-native-community/geolocation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import {
  ITScreenWrapper,
  ITText,
  ITButton,
  ITCategorySelector,
  ITTypeSelector,
  ITMediaPicker,
  MediaItem,
  ITInput,
} from '../../../shared/components';

const { width } = Dimensions.get('window');
export const MaintenanceReportScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);

  const { initialCategory, roundId } = route.params || {};

  const [categories, setCategories] = useState<any[]>([]);
  const [allTypes, setAllTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [clientId, setClientId] = useState<string | null>(
    user.clientId || null,
  );

  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');

  useFocusEffect(
    useCallback(() => {
      const fetchCatalogs = async () => {
        try {
          const [catRes, typeRes, clientsRes] = await Promise.all([
            getCatalog('incident_category'),
            getCatalog('incident_type'),
            getCatalog('client'),
          ]);

          if (catRes.success) {
            const maintCats = catRes.data.filter(
              (c: any) => c.type === 'MAINTENANCE',
            );
            setCategories(maintCats);
            if (maintCats.length > 0 && !categoryId) {
              setCategoryId(maintCats[0].id);
            }
          }

          if (typeRes.success) {
            setAllTypes(typeRes.data);
          }
          if (clientsRes.success) {
            setClients(
              clientsRes.data.map((c: any) => ({
                label: c.name || c.value,
                value: c.id,
              })),
            );
          }
        } catch (error) {
          console.error('Error fetching maintenance catalogs:', error);
        }
      };

      fetchCatalogs();

      return () => {
        setCategoryId(null);
        setTypeId(null);
        setDescription('');
        setMedia([]);
        setLoading(false);
      };
    }, []),
  );

  const handleSubmit = async () => {
    if (!typeId) {
      Alert.alert(
        'Falta información',
        'Selecciona el tipo de problema primero.',
      );
      return;
    }

    if (!clientId && user.role === UserRole.ADMIN) {
      Alert.alert(
        'Falta información',
        'Selecciona un cliente para este reporte.',
      );
      return;
    }

    const pending = media.some(m => m.uploading);
    if (pending) {
      Alert.alert('Espera', 'Hay archivos subiéndose, por favor espera.');
      return;
    }

    const failed = media.some(m => m.error);
    if (failed) {
      Alert.alert(
        'Error',
        'Algunos archivos fallaron al subir. Elimínalos o intenta de nuevo.',
      );
      return;
    }

    const validMedia = media
      .filter(m => m.url)
      .map(m => ({
        type: m.type === 'video' ? 'VIDEO' : 'IMAGE',
        url: m.url,
      }));

    setLoading(true);
    const selectedType = allTypes.find(t => t.id === typeId);

    Geolocation.getCurrentPosition(
      async position => {
        const res = await createMaintenance({
          title: selectedType?.value || 'Mantenimiento',
          categoryId: categoryId as string,
          typeId: typeId as string,
          media: validMedia,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          clientId: clientId || undefined,
          guardId: user.id,
        });
        setLoading(false);
        if (res.success) {
          dispatch(
            showToast({
              message: 'Reporte de mantenimiento enviado',
              type: 'success',
            }),
          );
          navigation.goBack();
        } else {
          Alert.alert('Error', 'No se pudo enviar el reporte.');
        }
      },
      async error => {
        const res = await createMaintenance({
          title: selectedType?.value || 'Mantenimiento',
          categoryId: categoryId as string,
          typeId: typeId as string,
          description: description,
          media: validMedia,
          clientId: clientId || undefined,
          guardId: user.id,
        });
        setLoading(false);
        if (res.success) {
          dispatch(
            showToast({
              message: 'Reporte de mantenimiento enviado',
              type: 'success',
            }),
          );
          navigation.goBack();
        } else {
          Alert.alert('Error', 'No se pudo enviar el reporte.');
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 },
    );
  };

  const currentCat = categories.find(c => c.id === categoryId);
  const filteredTypes = allTypes.filter(t => t.categoryId === categoryId);
  const isUploading = media.some(m => m.uploading);

  return (
    <ITScreenWrapper padding={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {user.role === UserRole.ADMIN && (
          <View style={styles.section}>
            <ITText variant="labelLarge" weight="bold" style={styles.label}>
              SELECCIONAR CLIENTE
            </ITText>
            <SearchComponent
              label="Cliente"
              placeholder="Selecciona un cliente..."
              options={clients}
              value={clientId || ''}
              onSelect={val => setClientId(val as string)}
            />
          </View>
        )}

        <ITCategorySelector
          categories={categories}
          selectedId={categoryId}
          onSelect={id => {
            setCategoryId(id);
            setTypeId(null);
          }}
        />

        {categoryId && (
          <ITTypeSelector
            types={allTypes.filter(t => t.categoryId === categoryId)}
            selectedId={typeId}
            onSelect={id => setTypeId(id)}
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
            4. OBSERVACIONES ADICIONALES
          </ITText>
          <ITInput
            placeholder="Describe lo sucedido brevemente..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <ITButton
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={
            loading ||
            !typeId ||
            isUploading ||
            (user.role === UserRole.ADMIN && !clientId)
          }
          label={isUploading ? 'SUBIENDO...' : 'ENVIAR REPORTE'}
          style={styles.mainSubmitBtn}
        />
      </ScrollView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  content: { padding: 16, paddingBottom: 60 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: 15,
    letterSpacing: 1.2,
  },

  categoryGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  catCardWrapper: {
    width: 100,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  catRipple: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  catCardContent: { alignItems: 'center' },
  catText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    color: '#616161',
  },

  typeWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: { borderRadius: 10, borderColor: '#EEEEEE' },
  typeChipText: { fontSize: 13, fontWeight: '600' },

  photoActionRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  bigCaptureBtn: {
    flex: 1,
    height: 90,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  bigCaptureText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 6,
  },

  mediaList: { marginBottom: 20, paddingVertical: 5 },
  mediaItem: { marginRight: 15, position: 'relative' },
  mediaImg: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  videoIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
  },
  deleteMedia: { position: 'absolute', top: -12, right: -12, margin: 0 },

  textInput: { backgroundColor: 'white', minHeight: 100, fontSize: 15 },
  mainSubmitBtn: { marginTop: 30, borderRadius: 12, elevation: 4 },
  submitBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.2)',
    borderRadius: 12,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  uploadingCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  uploadingText: {
    marginTop: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});
