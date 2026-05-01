import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View, Modal, ScrollView } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Card,
  Icon,
  IconButton,
  Searchbar,
  Text,
  FAB,
  Chip,
  Button,
  Portal,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPaginatedRecurring,
  deleteRecurring,
} from '../service/recurring.service';
import { IRecurringConfig } from '../type/recurring.types';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getClients } from '../../clients/service/client.service';
import { IClient } from '../../clients/type/client.types';

const PRIMARY_COLOR = '#059669';

export const RecurringListScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isAdmin = user.role === UserRole.ADMIN;
  
  const [routes, setRoutes] = useState<any[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [appliedClientId, setAppliedClientId] = useState<number | string>("");
  const [tempClientId, setTempClientId] = useState<number | string>("");

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
      console.error("Error loading clients for filter:", error);
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
        if (!isRefreshing) setLoading(true);
    } else {
        setLoadingMore(true);
    }

    const params = {
        page: pageNum,
        limit: 20,
        filters: {
            search: debouncedSearch,
            clientId: appliedClientId || undefined
        }
    };

    try {
        const res = await getPaginatedRecurring(params);
        if (res && res.success && res.data) {
            const newRows = res.data.rows || [];
            const totalRows = res.data.total || 0;

            if (pageNum === 1) {
                setRoutes(newRows);
                setHasMore(newRows.length < totalRows);
            } else {
                setRoutes(prev => [...prev, ...newRows]);
                setHasMore(routes.length + newRows.length < totalRows);
            }

            setTotal(totalRows);
            setPage(pageNum);
        }
    } catch (error) {
        console.error("Error fetching recurring routes:", error);
    } finally {
        setLoading(false);
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
    setTempClientId("");
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Eliminar ruta',
      `¿Estás seguro de que deseas eliminar la ruta "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const res = await deleteRecurring(item.id);
            if (res && res.success) {
              dispatch(showToast({ message: 'Ruta eliminada', type: 'success' }));
              fetchData(1);
            }
          }
        },
      ]
    );
  };

  const clientOptions = clients.map(c => ({
    label: c.name,
    value: c.id
  }));

  const activeFiltersCount = appliedClientId !== "" ? 1 : 0;

  const renderItem = ({ item }: { item: any }) => {
    const clientName = item.client?.name || item.recurringLocations?.[0]?.location?.client?.name || 'N/A';
    const firstLocation = item.recurringLocations?.[0]?.location?.name || 'SIN UBICACIÓN';
    const pointsCount = item.recurringLocations?.length || 0;
    const guardsCount = item.guards?.length || 0;

    return (
        <Card
            style={styles.itemCard}
            elevation={2}
            onPress={() => {
                navigation.navigate('RECURRING_FORM', { route: item });
            }}
        >
            <View style={styles.cardLayout}>
                <View style={styles.avatarSection}>
                    <Avatar.Icon 
                        size={56} 
                        icon="clipboard-clock-outline" 
                        style={styles.avatar} 
                        color="#059669"
                    />
                    <View style={[styles.statusBadge, { backgroundColor: item.active ? '#059669' : '#64748B' }]}>
                        <Icon source={item.active ? "check" : "minus"} size={10} color="#fff" />
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.routeName} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.ownerText} numberOfLines={1}>Cliente: {clientName}</Text>
                    
                    <View style={styles.locationInfo}>
                        <Icon source="map-marker-radius" size={14} color="#64748B" />
                        <Text style={styles.locationText} numberOfLines={1}>{firstLocation}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Icon source="format-list-bulleted" size={14} color="#059669" />
                            <Text style={styles.statText}>{pointsCount} Puntos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Icon source="account-group" size={14} color="#059669" />
                            <Text style={styles.statText}>{guardsCount} Guardias</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actions}>
                    {isAdmin && (
                        <View style={styles.adminActions}>
                            <IconButton
                                icon="pencil-outline"
                                size={20}
                                onPress={() => {
                                    navigation.navigate('RECURRING_FORM', { route: item });
                                }}
                                iconColor="#64748B"
                            />
                            <IconButton
                                icon="trash-can-outline"
                                size={20}
                                onPress={() => handleDelete(item)}
                                iconColor="#ba1a1a"
                            />
                        </View>
                    )}
                    {!isAdmin && <IconButton icon="chevron-right" iconColor="#CBD5E1" size={24} />}
                </View>
            </View>
        </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Rutas</Text>
            <Text style={styles.headerSubtitle}>{total} rutas configuradas</Text>
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
          placeholder="Buscar ruta por título..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={PRIMARY_COLOR}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Cargando rutas...</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY_COLOR]} tintColor={PRIMARY_COLOR} />
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
                <IconButton icon="clipboard-off-outline" size={40} iconColor="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Sin rutas</Text>
              <Text style={styles.emptyText}>No se encontraron rutas configuradas.</Text>
            </View>
          }
        />
      )}

      {isAdmin && (
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={() => {
                navigation.navigate('RECURRING_FORM');
            }}
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
              <Text style={styles.modalTitle}>Filtros de Rutas</Text>
            </View>
            <IconButton icon="close" size={24} onPress={() => setShowFilters(false)} iconColor="#94A3B8" />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
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

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Button mode="outlined" onPress={handleClearFilters} style={styles.footerButton} textColor="#64748B">
              Limpiar
            </Button>
            <Button mode="contained" onPress={handleApplyFilters} style={[styles.footerButton, { backgroundColor: PRIMARY_COLOR }]}>
              Aplicar Filtros
            </Button>
          </View>
        </Modal>
      </Portal>
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
    backgroundColor: '#F0FDF4',
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
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  ownerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: 'bold',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    flexDirection: 'column',
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
