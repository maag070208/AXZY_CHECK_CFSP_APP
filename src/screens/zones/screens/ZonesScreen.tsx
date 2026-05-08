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
  ActivityIndicator,
  Avatar,
  Card,
  Icon,
  IconButton,
  Searchbar,
  Text,
  FAB,
  Button,
  Portal,
  Divider,
} from 'react-native-paper';
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

const PRIMARY_COLOR = '#0F4C3A';

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
    value: c.id,
  }));

  const activeFiltersCount = appliedClientId !== '' ? 1 : 0;

  const renderItem = ({ item }: { item: IZone }) => (
    <Card
      style={styles.itemCard}
      elevation={1}
      onPress={() => {
        navigation.navigate('LOCATIONS_STACK', {
          screen: 'LOCATIONS_MAIN',
          params: { zoneId: item.id, zoneName: item.name },
        });
      }}
    >
      <View style={styles.cardLayout}>
        <View style={styles.avatarSection}>
          <Avatar.Icon
            size={56}
            icon="map-clock-outline"
            style={styles.avatar}
            color="#0F4C3A"
          />
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.active ? '#059669' : '#64748B' },
            ]}
          >
            <Icon
              source={item.active ? 'check' : 'minus'}
              size={10}
              color="#fff"
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.propertyName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.ownerText} numberOfLines={1}>
            Cliente: {item.client?.name || 'N/A'}
          </Text>
        </View>

        <View style={styles.actions}>
          {isAdmin ? (
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="pencil-outline"
                size={20}
                onPress={() => handleEdit(item)}
                iconColor="#64748B"
              />
              <IconButton
                icon="trash-can-outline"
                size={20}
                onPress={() => handleDeletePress(item)}
                iconColor="#ba1a1a"
              />
            </View>
          ) : (
            <IconButton icon="chevron-right" iconColor="#CBD5E1" size={24} />
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Zonas</Text>
            <Text style={styles.headerSubtitle}>{total} zonas registradas</Text>
          </View>
          <IconButton
            icon="filter-variant"
            mode="contained"
            containerColor={activeFiltersCount > 0 ? PRIMARY_COLOR : '#F1F5F9'}
            iconColor={activeFiltersCount > 0 ? '#FFFFFF' : '#64748B'}
            onPress={handleOpenFilters}
          />
        </View>

        <Searchbar
          placeholder="Buscar zona por nombre..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={PRIMARY_COLOR}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      {!loading || refreshing ? (
        <FlatList
          data={zones}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[PRIMARY_COLOR]}
              tintColor={PRIMARY_COLOR}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IconButton
                  icon="map-off-outline"
                  size={40}
                  iconColor="#94A3B8"
                />
              </View>
              <Text style={styles.emptyTitle}>Sin zonas</Text>
              <Text style={styles.emptyText}>
                No se encontraron zonas registradas.
              </Text>
            </View>
          }
        />
      ) : (
        <></>
      )}

      {isAdmin && (
        <FAB
          icon="plus"
          style={[styles.fab, { bottom: insets.bottom + 24 }]}
          onPress={handleCreate}
          color="white"
        />
      )}

      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.modalFullScreen}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeaderTitle}>
              <Icon source="filter-variant" size={24} color={PRIMARY_COLOR} />
              <Text style={styles.modalTitle}>Filtros de Zonas</Text>
            </View>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowFilters(false)}
              iconColor="#94A3B8"
            />
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR CLIENTE</Text>
              <SearchComponent
                label="Cliente"
                placeholder="Todos los clientes"
                options={clientOptions}
                value={tempClientId}
                onSelect={setTempClientId}
              />
            </View>
          </ScrollView>

          <View
            style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}
          >
            <Button
              mode="outlined"
              onPress={handleClearFilters}
              style={styles.footerButton}
              textColor="#64748B"
            >
              Limpiar
            </Button>
            <Button
              mode="contained"
              onPress={handleApplyFilters}
              style={[styles.footerButton, { backgroundColor: PRIMARY_COLOR }]}
            >
              Aplicar Filtros
            </Button>
          </View>
        </Modal>
      </Portal>

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
        type="danger"
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoSection: {
    flex: 1,
    gap: 2,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  ownerText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 28,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFullScreen: {
    backgroundColor: 'white',
    flex: 1,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalScroll: {
    padding: 24,
  },
  filterGroup: {
    marginBottom: 32,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 12,
    letterSpacing: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerButton: {
    flex: 1,
    borderRadius: 14,
  },
});
