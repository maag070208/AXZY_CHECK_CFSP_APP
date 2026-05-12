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
import {
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { ITScreensFiltersModal } from '../../../shared/components/ITScreensFiltersModal';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { theme } from '../../../shared/theme/theme';
import { getClients } from '../../clients/service/client.service';
import { IClient } from '../../clients/type/client.types';

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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [appliedClientId, setAppliedClientId] = useState<number | string>('');
  const [tempClientId, setTempClientId] = useState<number | string>('');

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
      if (!isRefreshing) setLoading(true);
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
      console.error('Error fetching recurring routes:', error);
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
    setTempClientId('');
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
              dispatch(
                showToast({ message: 'Ruta eliminada', type: 'success' }),
              );
              fetchData(1);
            }
          },
        },
      ],
    );
  };

  const clientOptions = clients.map(c => ({
    label: c.name,
    value: String(c.id),
  }));

  const activeFiltersCount = appliedClientId !== '' ? 1 : 0;

  const renderItem = ({ item }: { item: any }) => {
    const clientName =
      item.client?.name ||
      item.recurringLocations?.[0]?.location?.client?.name ||
      'N/A';
    const firstLocation =
      item.recurringLocations?.[0]?.location?.name || 'SIN UBICACIÓN';
    const pointsCount = item.recurringLocations?.length || 0;
    const guardsCount = item.guards?.length || 0;

    return (
      <ITTouchableOpacity
        style={styles.itemCard}
        onPress={() => {
          navigation.navigate('RECURRING_FORM', { route: item });
        }}
      >
        <View style={styles.cardLayout}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Icon
                source="clipboard-clock-outline"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.active
                    ? theme.colors.primary
                    : theme.colors.slate400,
                },
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
            <ITText variant="titleMedium" weight="bold" color="#1E293B">
              {item.title}
            </ITText>
            <ITText variant="labelSmall" weight="bold" color="#94A3B8">
              CLIENTE: {clientName.toUpperCase()}
            </ITText>

            <View style={styles.locationInfo}>
              <Icon
                source="map-marker-radius"
                size={14}
                color={theme.colors.slate500}
              />
              <ITText variant="bodySmall" color={theme.colors.slate600}>
                {firstLocation}
              </ITText>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon
                  source="format-list-bulleted"
                  size={12}
                  color={theme.colors.primary}
                />
                <ITText variant="labelSmall" weight="bold" color="#475569">
                  {pointsCount} Puntos
                </ITText>
              </View>
              <View style={styles.statItem}>
                <Icon
                  source="account-group"
                  size={12}
                  color={theme.colors.primary}
                />
                <ITText variant="labelSmall" weight="bold" color="#475569">
                  {guardsCount} Guardias
                </ITText>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            {isAdmin ? (
              <View style={styles.adminActions}>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  onPress={() => {
                    navigation.navigate('RECURRING_FORM', { route: item });
                  }}
                  iconColor={theme.colors.slate400}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={20}
                  onPress={() => handleDelete(item)}
                  iconColor="#EF4444"
                />
              </View>
            ) : (
              <Icon source="chevron-right" color="#CBD5E1" size={24} />
            )}
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Rutas Recurrentes"
        subtitle="Configuración de rondas automáticas"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onFilterPress={handleOpenFilters}
        showSearchBar={true}
        searchBar={
          <Searchbar
            placeholder="Buscar por título..."
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
        data={routes}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        onEndReached={handleLoadMore}
        footerLoader={loadingMore}
        fab={
          isAdmin ? (
            <FAB
              icon="plus"
              style={styles.fab}
              onPress={() => navigation.navigate('RECURRING_FORM')}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
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
