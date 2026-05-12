import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { ITScreensFiltersModal } from '../../../shared/components/ITScreensFiltersModal';
import { theme } from '../../../shared/theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { ITAlert } from '../../../shared/components';
import {
  getPaginatedZones,
  deleteZone,
  createZone,
  updateZone,
} from '../service/zone.service';
import { getClients } from '../../clients/service/client.service';
import { IZone } from '../type/zone.types';
import { IClient } from '../../clients/type/client.types';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { ZoneFormModal } from '../components/ZoneFormModal';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { Icon, IconButton, Searchbar, FAB } from 'react-native-paper';

export const ZonesScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isAdmin = user.role === UserRole.ADMIN;

  const [zones, setZones] = useState<IZone[]>([]);
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
  const [showFilters, setShowFilters] = useState(false);
  const [appliedClientId, setAppliedClientId] = useState<number | string>('');
  const [tempClientId, setTempClientId] = useState<number | string>('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<IZone | null>(null);
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
      console.error('Error loading clients for filter:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData(1);
  }, [debouncedSearch, appliedClientId]);

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
        search: debouncedSearch,
        clientId: appliedClientId || undefined,
      },
    };

    try {
      const res = await getPaginatedZones(params);
      if (res && res.success && res.data) {
        const newRows = res.data.rows || [];
        const totalRows = res.data.total || 0;

        if (pageNum === 1) {
          setZones(newRows);
          setHasMore(newRows.length < totalRows);
        } else {
          setZones(prev => [...prev, ...newRows]);
          setHasMore(zones.length + newRows.length < totalRows);
        }

        setTotal(totalRows);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
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
    }, []),
  );

  const handleOpenFilters = () => {
    setTempClientId(appliedClientId);
    setShowFilters(true);
  };

  const handleApplyFilters = () => {
    setAppliedClientId(tempClientId);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempClientId('');
  };

  const handleCreate = () => {
    setEditingZone(null);
    setModalVisible(true);
  };

  const handleEdit = (item: IZone) => {
    setEditingZone(item);
    setModalVisible(true);
  };

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const res = editingZone
        ? await updateZone(editingZone.id, data)
        : await createZone(data);

      if (res && res.success) {
        setModalVisible(false);
        setEditingZone(null);
        dispatch(
          showToast({
            message: editingZone
              ? 'Zona actualizada'
              : 'Zona creada correctamente',
            type: 'success',
          }),
        );
        fetchData(1);
      } else {
        const msg = res?.messages?.[0] || 'Error al procesar zona';
        dispatch(showToast({ message: msg, type: 'error' }));
      }
    } catch (error: any) {
      const msg = error?.messages?.[0] || 'Ocurrió un error inesperado';
      dispatch(showToast({ message: msg, type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<IZone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePress = (item: IZone) => {
    setZoneToDelete(item);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!zoneToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteZone(zoneToDelete.id);
      if (res && res.success) {
        dispatch(showToast({ message: 'Zona eliminada', type: 'success' }));
        fetchData(1);
      } else {
        dispatch(
          showToast({ message: 'No se pudo eliminar la zona', type: 'error' }),
        );
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error al eliminar', type: 'error' }));
    } finally {
      setIsDeleting(false);
      setDeleteDialogVisible(false);
      setZoneToDelete(null);
    }
  };

  const clientOptions = clients.map(c => ({
    label: c.name,
    value: String(c.id),
  }));

  const activeFiltersCount = appliedClientId !== '' ? 1 : 0;

  const renderItem = ({ item }: { item: IZone }) => {
    const isActive = item.active;

    return (
      <ITTouchableOpacity
        onPress={() => {
          navigation.navigate('LOCATIONS_STACK', {
            screen: 'LOCATIONS_MAIN',
            params: { zoneId: item.id, zoneName: item.name },
          });
        }}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Icon
                  source="map-clock-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ITText variant="titleMedium" weight="bold" color="#0F172A">
                  {item.name}
                </ITText>
                <View style={styles.headerMeta}>
                  <View style={styles.metaChip}>
                    <Icon
                      source="office-building"
                      size={12}
                      color={theme.colors.slate400}
                    />
                    <ITText variant="labelSmall" color={theme.colors.slate500}>
                      {item.client?.name || 'Sin Cliente'}
                    </ITText>
                  </View>
                </View>
              </View>
            </View>

            <ITBadge
              label={isActive ? 'Activo' : 'Inactivo'}
              variant={isActive ? 'success' : 'surface'}
              size="small"
              dot={isActive}
            />
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={styles.footerIconBox}>
                <Icon
                  source="map-marker-radius"
                  size={12}
                  color={theme.colors.primary}
                />
              </View>
              <ITText variant="labelSmall" color={theme.colors.slate600}>
                Ver ubicaciones vinculadas
              </ITText>
            </View>

            {isAdmin && (
              <View style={styles.adminActions}>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  onPress={() => handleEdit(item)}
                  iconColor={theme.colors.slate400}
                  style={styles.actionButton}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => handleDeletePress(item)}
                  iconColor="#EF4444"
                  style={styles.actionButton}
                />
              </View>
            )}
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Zonas"
        subtitle="Organización por sectores"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onFilterPress={handleOpenFilters}
        showSearchBar={true}
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
          appliedClientId ? (
            <ITTouchableOpacity
              onPress={() => setAppliedClientId('')}
              style={{ marginRight: 8 }}
            >
              <ITBadge
                label={`Cliente: ${
                  clients.find(c => String(c.id) === String(appliedClientId))
                    ?.name || '...'
                }`}
                variant="primary"
                onClose={() => setAppliedClientId('')}
              />
            </ITTouchableOpacity>
          ) : null
        }
        data={zones}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        onEndReached={handleLoadMore}
        footerLoader={loadingMore}
        fab={
          isAdmin ? (
            <FAB
              icon="plus"
              style={styles.fab}
              onPress={handleCreate}
              color="white"
            />
          ) : null
        }
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
            color="#94A3B8"
            style={styles.filterLabel}
          >
            FILTRAR POR CLIENTE
          </ITText>
          <SearchComponent
            label="Cliente"
            placeholder="Seleccionar cliente"
            options={clientOptions}
            value={String(tempClientId)}
            onSelect={setTempClientId}
          />
        </View>
      </ITScreensFiltersModal>

      <ZoneFormModal
        visible={modalVisible}
        initialData={editingZone}
        onDismiss={() => {
          setModalVisible(false);
          setEditingZone(null);
        }}
        onSubmit={handleSubmit}
        loading={submitting}
      />

      <ITAlert
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
        title="Eliminar Zona"
        description={`¿Estás seguro de que deseas eliminar la zona "${zoneToDelete?.name}"? Esta acción no se puede deshacer.`}
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
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    margin: 0,
  },
  fab: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    marginBottom: 20,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    marginBottom: 12,
    letterSpacing: 1,
  },
});
