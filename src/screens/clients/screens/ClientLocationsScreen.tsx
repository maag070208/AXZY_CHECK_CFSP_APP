import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import { ITAlert, ITBadge, ITText, ITCard } from '../../../shared/components';
import { ITScreenDatatableLayout } from '../../../shared/components/ITScreenDatatableLayout';
import {
  deleteLocation,
  getPaginatedLocations,
} from '../../locations/service/location.service';
import { ILocation } from '../../locations/type/location.types';
import { ClientLocationFormModal } from '../modal/ClientLocationFormModal';
import { ClientStackParamList } from '../stack/ClientStack';

import { theme } from '../../../shared/theme/theme';
import { handleLocationQRPrint } from '../../locations/utils/qr.utils';
import { BulkPrintModal } from '../../locations/modal/BulkPrintModal';

type ClientLocationsRouteProp = RouteProp<
  ClientStackParamList,
  'CLIENT_LOCATIONS'
>;

export const ClientLocationsScreen = () => {
  const route = useRoute<ClientLocationsRouteProp>();
  const navigation = useNavigation<any>();
  const { clientId } = route.params;
  const dispatch = useDispatch();

  const [locations, setLocations] = useState<ILocation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<ILocation | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchLocations = async (isRefresh = false, isLoadMore = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const nextPage = isRefresh || !isLoadMore ? 1 : page + 1;
      const filters: any = { clientId };
      if (search) filters.name = search;

      const response = await getPaginatedLocations({
        page: nextPage,
        limit: 10,
        filters,
      });

      if (response.success && response.data) {
        if (isLoadMore) {
          setLocations(prev => [...prev, ...response.data.rows]);
          setPage(nextPage);
        } else {
          setLocations(response.data.rows);
          setPage(1);
        }
        setTotal(response.data.total);
      } else {
        dispatch(
          showToast({
            type: 'error',
            message: response.messages?.[0] || 'Error al cargar ubicaciones',
          }),
        );
      }
    } catch (error) {
      const result = error as TResult<void>;
      dispatch(
        showToast({
          type: 'error',
          message: result?.messages?.[0] || 'Ocurrió un error en la solicitud',
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && !refreshing && locations.length < total) {
      fetchLocations(false, true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLocations();
    }, [clientId, search]),
  );

  const handleDeletePress = (id: string) => {
    setLocationToDelete(id);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteLocation(locationToDelete);
      if (res.success) {
        dispatch(
          showToast({
            message: 'Ubicación eliminada',
            type: 'success',
          }),
        );
        fetchLocations(true);
      } else {
        dispatch(
          showToast({
            message: res.messages?.[0] || 'Error al eliminar',
            type: 'error',
          }),
        );
      }
    } catch (error) {
      dispatch(
        showToast({ message: 'Error inesperado al eliminar', type: 'error' }),
      );
    } finally {
      setIsDeleting(false);
      setDeleteDialogVisible(false);
      setLocationToDelete(null);
    }
  };

  const handlePrintQR = async (item: ILocation) => {
    dispatch(showToast({ message: 'Generando PDF...', type: 'info' }));
    const success = await handleLocationQRPrint([item.id], `QR_${item.name}`);
    if (!success) {
      dispatch(showToast({ message: 'Error al abrir PDF', type: 'error' }));
    }
  };

  const handlePrintAllQRs = () => {
    setShowBulkModal(true);
  };

  const renderLocation = ({
    item,
    index,
  }: {
    item: ILocation;
    index: number;
  }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'U';

    return (
      <ITCard
        mode="elevated"
        style={styles.card}
        onPress={() => {
          setLocationToEdit(item);
          setFormModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <ITText style={styles.avatarText}>{initial}</ITText>
          </View>

          <View style={styles.headerInfo}>
            <ITText
              variant="titleMedium"
              weight="700"
              style={styles.locationName}
              numberOfLines={1}
            >
              {item.name}
            </ITText>
            <View style={styles.headerRow}>
              <ITBadge
                label={item.zone?.name || 'SIN ZONA'}
                variant="primary"
                size="small"
                outline
              />
            </View>
          </View>

          <ITBadge
            label={item.active ? 'Activa' : 'Inactiva'}
            variant={item.active ? 'success' : 'error'}
            size="small"
            dot
          />
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerStats}>
            <Icon
              source="tag-outline"
              size={16}
              color={theme.colors.slate500}
            />
            <ITText variant="bodySmall" style={styles.idText}>
              ID: {item.id.substring(0, 8).toUpperCase()}
            </ITText>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handlePrintQR(item)}
              style={styles.iconButton}
            >
              <Icon source="qrcode" size={20} color="#F59E0B" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setLocationToEdit(item);
                setFormModalVisible(true);
              }}
              style={styles.iconButton}
            >
              <Icon
                source="pencil-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeletePress(item.id)}
              style={styles.iconButton}
            >
              <Icon source="trash-can-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </ITCard>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Ubicaciones / Puntos"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchLocations(true)}
        showSearchBar={true}
        filterBadges={
          <View style={styles.filterBadges}>
            <TouchableOpacity onPress={handlePrintAllQRs}>
              <ITBadge
                label="Impresión masiva"
                variant="primary"
                icon="qrcode"
              />
            </TouchableOpacity>
          </View>
        }
        searchBar={
          <Searchbar
            placeholder="Buscar ubicación..."
            onChangeText={setSearch}
            value={search}
            mode="bar"
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            elevation={0}
          />
        }
        data={locations}
        renderItem={renderLocation}
        keyExtractor={item => item.id}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        fab={
          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="#FFFFFF"
            onPress={() => {
              setLocationToEdit(null);
              setFormModalVisible(true);
            }}
          />
        }
      />

      <ClientLocationFormModal
        visible={formModalVisible}
        onDismiss={() => setFormModalVisible(false)}
        onSuccess={() => fetchLocations(true)}
        clientId={clientId}
        editLocation={locationToEdit}
        onDelete={handleDeletePress}
        onPrintQR={handlePrintQR}
      />

      <BulkPrintModal
        visible={showBulkModal}
        onDismiss={() => setShowBulkModal(false)}
        initialClientId={clientId}
      />

      <ITAlert
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
        title="Eliminar Ubicación"
        description="¿Estás seguro de que deseas eliminar esta ubicación? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        type="alert"
        loading={isDeleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    height: 48,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    color: theme.colors.slate900,
  },
  filterBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  locationName: {
    color: theme.colors.slate900,
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  idText: {
    color: theme.colors.slate500,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});
