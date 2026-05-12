import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { FAB, Icon, IconButton, Portal, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { getClients } from '../../clients/service/client.service';
import { IClient } from '../../clients/type/client.types';
import { getZonesByClient } from '../../zones/service/zone.service';
import { LocationFormModal } from '../components/LocationFormModal';
import {
  createLocation,
  deleteLocation,
  getPaginatedLocations,
  updateLocation,
} from '../service/location.service';
import { ILocation } from '../type/location.types';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import {
  ITAlert,
  ITBadge,
  ITButton,
  ITCard,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
  SearchComponent,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { ITScreensFiltersModal } from '../../../shared/components/ITScreensFiltersModal';
import { handleLocationQRPrint } from '../utils/qr.utils';
import { BulkPrintModal } from '../modal/BulkPrintModal';

export const LocationsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isAdmin = user.role === UserRole.ADMIN;

  // Params from navigation
  const routeClientId = route.params?.clientId;
  const clientName = route.params?.clientName;
  const zoneId = route.params?.zoneId;
  const zoneName = route.params?.zoneName;

  const [locations, setLocations] = useState<ILocation[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [printing, setPrinting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handlePrintQR = async (item: ILocation) => {
    dispatch(showLoader(true));
    const success = await handleLocationQRPrint([item.id], `QR_${item.name}`);
    dispatch(showLoader(false));
    if (!success) {
      dispatch(showToast({ message: 'Error al generar QR', type: 'error' }));
    }
  };

  const [showFilters, setShowFilters] = useState(false);
  const [appliedClientId, setAppliedClientId] = useState<number | string>(
    routeClientId || '',
  );
  const [tempClientId, setTempClientId] = useState<number | string>(
    routeClientId || '',
  );
  const [appliedZoneId, setAppliedZoneId] = useState<number | string>(
    zoneId || '',
  );
  const [tempZoneId, setTempZoneId] = useState<number | string>(zoneId || '');
  const [zones, setZones] = useState<any[]>([]);
  const [appliedStatus, setAppliedStatus] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [tempStatus, setTempStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>(
    'ALL',
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ILocation | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const res = await getClients();
      if (res.success) {
        setClients(res.data || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    if (routeClientId) {
      setAppliedClientId(routeClientId);
      setTempClientId(routeClientId);
    }
  }, [routeClientId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadZones = async () => {
      const targetId = showFilters ? tempClientId : appliedClientId;
      if (targetId) {
        try {
          const res = await getZonesByClient(targetId);
          if (res.success) {
            setZones(res.data || []);
          }
        } catch (e) {
          console.error('Error loading zones:', e);
        }
      } else {
        setZones([]);
      }
    };
    loadZones();
  }, [tempClientId, appliedClientId, showFilters]);

  useEffect(() => {
    fetchData(1);
  }, [debouncedSearch, appliedStatus, appliedClientId, appliedZoneId]);

  const fetchData = async (pageNum: number, isRefreshing = false) => {
    if (pageNum === 1) {
      if (!isRefreshing) {
        setLoading(true);
        dispatch(showLoader(true));
      }
    } else {
      setLoadingMore(true);
    }

    const params = {
      page: pageNum,
      limit: 20,
      filters: {
        name: debouncedSearch,
        clientId: appliedClientId || undefined,
        zoneId: appliedZoneId || undefined,
        active:
          appliedStatus === 'ALL'
            ? undefined
            : appliedStatus === 'ACTIVE'
            ? true
            : false,
      },
    };

    try {
      const res = await getPaginatedLocations(params);
      if (res.success && res.data) {
        const newRows = res.data.rows || [];
        const totalRows = res.data.total || 0;

        if (pageNum === 1) {
          setLocations(newRows);
          setHasMore(newRows.length < totalRows);
        } else {
          setLocations(prev => [...prev, ...newRows]);
          setHasMore(locations.length + newRows.length < totalRows);
        }

        setTotal(totalRows);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
      dispatch(showLoader(false));
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchData(page + 1);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData(1);
    }, [appliedClientId, appliedZoneId]),
  );

  const handleOpenFilters = () => {
    setTempClientId(appliedClientId);
    setTempZoneId(appliedZoneId);
    setTempStatus(appliedStatus);
    setShowFilters(true);
  };

  const handleApplyFilters = () => {
    setAppliedClientId(tempClientId);
    setAppliedZoneId(tempZoneId);
    setAppliedStatus(tempStatus);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempClientId('');
    setTempZoneId('');
    setTempStatus('ALL');
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setModalVisible(true);
  };

  const handleEdit = (item: ILocation) => {
    setEditingLocation(item);
    setModalVisible(true);
  };

  const handleSubmit = async (data: any, keepOpen = false) => {
    setSubmitting(true);
    try {
      const res = editingLocation
        ? await updateLocation(editingLocation.id, data)
        : await createLocation(data);

      if (res.success) {
        dispatch(
          showToast({
            message: editingLocation
              ? 'Ubicación actualizada'
              : 'Ubicación creada',
            type: 'success',
          }),
        );

        if (keepOpen) {
          fetchData(1);
        } else {
          setModalVisible(false);
          setEditingLocation(null);
          fetchData(1);
        }
        return true;
      } else {
        dispatch(
          showToast({ message: 'Error al guardar ubicación', type: 'error' }),
        );
        return false;
      }
    } catch (error) {
      console.error('Error submitting location:', error);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ILocation | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePress = (item: ILocation) => {
    setLocationToDelete(item);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteLocation(locationToDelete.id);
      if (res.success) {
        dispatch(
          showToast({ message: 'Ubicación eliminada', type: 'success' }),
        );
        fetchData(1);
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error al eliminar', type: 'error' }));
    } finally {
      setIsDeleting(false);
      setDeleteDialogVisible(false);
      setLocationToDelete(null);
    }
  };

  const clientOptions = clients.map(c => ({
    label: c.name,
    value: c.id,
  }));

  const renderLocation = ({ item }: { item: ILocation }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'L';
    return (
      <ITCard
        style={styles.itemCard}
        onPress={() => handleEdit(item)}
        mode="elevated"
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <ITText style={styles.avatarText}>{initial}</ITText>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.active ? '#10B981' : '#EF4444' },
              ]}
            />
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
            <View style={styles.headerRowBadge}>
              <ITText
                variant="labelSmall"
                style={styles.clientText}
                numberOfLines={1}
              >
                {(item as any).client?.name || 'S/C'}
              </ITText>
            </View>
          </View>

          <ITBadge
            label={item.active ? 'Activo' : 'Inactivo'}
            variant={item.active ? 'success' : 'error'}
            size="small"
            dot
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoItem}>
            <Icon
              source="map-marker-outline"
              size={16}
              color={theme.colors.slate500}
            />
            <ITText
              variant="bodySmall"
              style={styles.infoText}
              numberOfLines={1}
            >
              {(item as any).zone?.name || 'Zona General'}
            </ITText>
          </View>
          {item.reference && (
            <View style={styles.infoItem}>
              <Icon
                source="information-outline"
                size={16}
                color={theme.colors.slate500}
              />
              <ITText
                variant="bodySmall"
                style={styles.infoText}
                numberOfLines={1}
              >
                {item.reference}
              </ITText>
            </View>
          )}
        </View>

        {isAdmin && (
          <View style={styles.cardFooter}>
            <ITTouchableOpacity
              style={styles.footerButton}
              onPress={() => handlePrintQR(item)}
            >
              <Icon source="qrcode" size={18} color={theme.colors.primary} />
              <ITText style={styles.footerButtonText}>QR</ITText>
            </ITTouchableOpacity>

            <View style={styles.dividerVertical} />

            <ITTouchableOpacity
              style={styles.footerButton}
              onPress={() => handleEdit(item)}
            >
              <Icon
                source="pencil-outline"
                size={18}
                color={theme.colors.primary}
              />
              <ITText style={styles.footerButtonText}>Editar</ITText>
            </ITTouchableOpacity>

            <View style={styles.dividerVertical} />

            <ITTouchableOpacity
              style={styles.footerButton}
              onPress={() => handleDeletePress(item)}
            >
              <Icon source="trash-can-outline" size={18} color="#EF4444" />
              <ITText style={[styles.footerButtonText, { color: '#EF4444' }]}>
                Eliminar
              </ITText>
            </ITTouchableOpacity>
          </View>
        )}
      </ITCard>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Ubicaciones (Puntos)"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        onFilterPress={handleOpenFilters}
        showSearchBar={true}
        searchQuery={search}
        onSearchChange={setSearch}
        searchBar={
          <Searchbar
            placeholder="Buscar por nombre..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        }
        filterBadges={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            <ITTouchableOpacity
              onPress={() => setShowBulkModal(true)}
              style={{ marginRight: 8 }}
            >
              <ITBadge
                label="Impresión Masiva"
                variant="primary"
                icon="qrcode"
              />
            </ITTouchableOpacity>

            <ITTouchableOpacity onPress={() => setAppliedClientId('')}>
              <ITBadge
                label="Todos"
                variant={appliedClientId === '' ? 'primary' : 'surface'}
                outline={appliedClientId !== ''}
              />
            </ITTouchableOpacity>
            {clients.map(client => (
              <ITTouchableOpacity
                key={client.id}
                onPress={() => setAppliedClientId(client.id)}
              >
                <ITBadge
                  label={client.name}
                  variant={
                    appliedClientId === client.id ? 'primary' : 'surface'
                  }
                  outline={appliedClientId !== client.id}
                />
              </ITTouchableOpacity>
            ))}
          </ScrollView>
        }
        data={locations}
        renderItem={renderLocation}
        keyExtractor={item => item.id.toString()}
        fab={
          isAdmin ? (
            <FAB
              icon="plus"
              onPress={handleCreate}
              color="#FFFFFF"
              style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            />
          ) : undefined
        }
      />

      <BulkPrintModal
        visible={showBulkModal}
        onDismiss={() => setShowBulkModal(false)}
        initialClientId={appliedClientId}
      />

      <ITScreensFiltersModal
        visible={showFilters}
        onDismiss={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      >
        <View style={styles.filterGroup}>
          <ITText
            variant="labelSmall"
            weight="bold"
            color={theme.colors.slate500}
            style={styles.filterLabel}
          >
            CLIENTE
          </ITText>
          <SearchComponent
            placeholder="Seleccionar Cliente"
            options={clientOptions}
            value={tempClientId}
            onSelect={val => {
              setTempClientId(val);
              setTempZoneId('');
            }}
          />
        </View>

        <View style={styles.filterGroup}>
          <ITText
            variant="labelSmall"
            weight="bold"
            color={theme.colors.slate500}
            style={styles.filterLabel}
          >
            ZONA
          </ITText>
          <SearchComponent
            placeholder={
              tempClientId ? 'Todas las zonas' : 'Selecciona cliente primero'
            }
            options={zones.map(z => ({ label: z.name, value: z.id }))}
            value={tempZoneId}
            onSelect={setTempZoneId}
            disabled={!tempClientId}
            label={''}
          />
        </View>

        <View style={styles.filterGroup}>
          <ITText
            variant="labelSmall"
            weight="bold"
            color={theme.colors.slate500}
            style={styles.filterLabel}
          >
            ESTADO
          </ITText>
          <View style={styles.statusFiltersRow}>
            {[
              { label: 'Todos', value: 'ALL' },
              { label: 'Activos', value: 'ACTIVE' },
              { label: 'Inactivos', value: 'INACTIVE' },
            ].map(status => (
              <ITTouchableOpacity
                key={status.value}
                onPress={() => setTempStatus(status.value as any)}
                style={styles.statusBadge}
              >
                <ITBadge
                  label={status.label}
                  variant={tempStatus === status.value ? 'primary' : 'surface'}
                  outline={tempStatus !== status.value}
                />
              </ITTouchableOpacity>
            ))}
          </View>
        </View>
      </ITScreensFiltersModal>

      <LocationFormModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        initialData={editingLocation}
        loading={submitting}
        preselectedClientId={appliedClientId}
      />

      <ITAlert
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
        title="Eliminar Ubicación"
        description={`¿Estás seguro de que deseas eliminar "${locationToDelete?.name}"? Esta acción no se puede deshacer.`}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  locationName: {
    color: '#1E293B',
  },
  headerRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientText: {
    color: theme.colors.slate500,
    flex: 1,
  },
  cardBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: theme.colors.slate500,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dividerVertical: {
    width: 1,
    height: 20,
    backgroundColor: '#F1F5F9',
  },
  filtersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filtersRow: {
    gap: 8,
    paddingRight: 12,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    marginBottom: 12,
    letterSpacing: 1,
  },
  statusFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
