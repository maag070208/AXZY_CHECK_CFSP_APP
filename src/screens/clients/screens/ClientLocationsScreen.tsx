import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import { ITAlert, ITBadge, ITText, ITTouchableOpacity } from '../../../shared/components';
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
  const { clientId, zoneId: preselectedZoneId, zoneName: preselectedZoneName } = route.params as any;
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

  useEffect(() => {
    if (preselectedZoneId) {
      setFormModalVisible(true);
    }
  }, [preselectedZoneId]);

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
      <ITTouchableOpacity
        onPress={() => {
          setLocationToEdit(item);
          setFormModalVisible(true);
        }}
        style={[styles.card, !item.active && styles.cardInactive]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <ITText style={styles.avatarText}>{initial}</ITText>
            <View style={[styles.statusDot, { backgroundColor: item.active ? '#10B981' : '#EF4444' }]} />
          </View>

          <View style={styles.headerInfo}>
            <ITText weight='400' style={styles.locationName} numberOfLines={2}>
              {item.name}
            </ITText>
            <View style={styles.headerMeta}>
              {item.zone?.name && (
                <View style={styles.metaChip}>
                  <Icon source="map-marker-outline" size={12} color="#64748B" />
                  <ITText variant="labelSmall" color="#64748B" style={{ marginLeft: 3 }}>
                    {item.zone.name}
                  </ITText>
                </View>
              )}
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
          <ITTouchableOpacity onPress={() => handlePrintQR(item)} style={styles.footerButton}>
            <Icon source="qrcode" size={16} color="#3B82F6" />
            <ITText style={[styles.footerButtonText, { color: '#3B82F6' }] as any}>QR</ITText>
          </ITTouchableOpacity>
          <View style={styles.footerDivider} />
          <ITTouchableOpacity
            onPress={() => { setLocationToEdit(item); setFormModalVisible(true); }}
            style={styles.footerButton}
          >
            <Icon source="pencil" size={16} color={theme.colors.primary} />
            <ITText style={styles.footerButtonText}>Editar</ITText>
          </ITTouchableOpacity>
          <View style={styles.footerDivider} />
          <ITTouchableOpacity onPress={() => handleDeletePress(item.id)} style={styles.footerButton}>
            <Icon source="delete" size={16} color="#EF4444" />
            <ITText style={[styles.footerButtonText, { color: '#EF4444' }] as any}>Eliminar</ITText>
          </ITTouchableOpacity>
        </View>
      </ITTouchableOpacity>
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
        onSuccess={(keepOpen) => {
          if (!keepOpen) {
            setFormModalVisible(false);
            setTimeout(() => {
              dispatch(showToast({ message: locationToEdit ? 'Ubicación actualizada' : 'Ubicación creada', type: 'success' }));
            }, 500);
          }
          fetchLocations(true);
        }}
        clientId={clientId}
        editLocation={locationToEdit}
        onDelete={handleDeletePress}
        onPrintQR={handlePrintQR}
        preselectedZoneId={preselectedZoneId}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 10,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  footerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F1F5F9',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});
