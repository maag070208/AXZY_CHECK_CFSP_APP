import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Card,
  Icon,
  IconButton,
  Searchbar,
  Text,
  FAB,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPaginatedClients,
  deleteClient,
} from '../service/client.service';
import { IClient } from '../type/client.types';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';

const PRIMARY_COLOR = '#0F4C3A';

export const ClientsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);
  const isAdmin = user.role === UserRole.ADMIN;
  
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData(1);
  }, [debouncedSearch]);

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
            search: debouncedSearch
        }
    };

    try {
        const res = await getPaginatedClients(params);
        if (res.success && res.data) {
            const newRows = res.data.rows || [];
            const totalRows = res.data.total || 0;

            if (pageNum === 1) {
                setClients(newRows);
                setHasMore(newRows.length < totalRows);
            } else {
                setClients(prev => [...prev, ...newRows]);
                setHasMore(clients.length + newRows.length < totalRows);
            }

            setTotal(totalRows);
            setPage(pageNum);
        }
    } catch (error) {
        console.error("Error fetching clients:", error);
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

  const handleCreate = () => {
    navigation.navigate('CREATE_CLIENT');
  };

  const handleEdit = (item: IClient) => {
    navigation.navigate('CREATE_CLIENT', { client: item });
  };

  const handleDelete = (item: IClient) => {
    Alert.alert(
      'Eliminar cliente',
      `¿Estás seguro de que deseas eliminar "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const res = await deleteClient(item.id);
            if (res.success) {
              dispatch(showToast({ message: 'Cliente eliminado', type: 'success' }));
              fetchData(1);
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: IClient }) => (
    <Card
      style={styles.itemCard}
      elevation={1}
      onPress={() => {
        navigation.navigate('LOCATIONS_STACK', {
            screen: 'LOCATIONS_MAIN',
            params: { clientId: item.id, clientName: item.name }
        });
      }}
    >
      <View style={styles.cardLayout}>
        <View style={styles.avatarSection}>
          <Avatar.Icon 
            size={56} 
            icon="office-building" 
            style={styles.avatar} 
            color="#0F4C3A"
          />
          <View style={[styles.statusBadge, { backgroundColor: item.active ? '#059669' : '#64748B' }]}>
            <Icon source={item.active ? "check" : "minus"} size={10} color="#fff" />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.propertyName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.ownerText} numberOfLines={1}>ID: {item.id}</Text>
        </View>

        <View style={styles.actions}>
          {isAdmin ? (
            <View style={styles.adminActions}>
                <IconButton
                    icon="pencil-outline"
                    size={20}
                    onPress={() => handleEdit(item)}
                    iconColor="#64748B"
                    style={{ margin: 0 }}
                />
                <IconButton
                    icon="trash-can-outline"
                    size={20}
                    onPress={() => handleDelete(item)}
                    iconColor="#ba1a1a"
                    style={{ margin: 0 }}
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
            <Text style={styles.headerTitle}>Clientes</Text>
            <Text style={styles.headerSubtitle}>{total} clientes registrados</Text>
          </View>
        </View>
        <Searchbar
          placeholder="Buscar por nombre..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#0F4C3A"
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Cargando clientes...</Text>
        </View>
      ) : (
        <FlatList
          data={clients}
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
                <IconButton icon="office-building-off" size={40} iconColor="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Sin clientes</Text>
              <Text style={styles.emptyText}>No se encontraron clientes registrados.</Text>
            </View>
          }
        />
      )}

      {isAdmin && (
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={handleCreate}
            color="white"
          />
      )}
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
    fontSize: 12,
    color: '#64748B',
    marginTop: -2,
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
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
});
