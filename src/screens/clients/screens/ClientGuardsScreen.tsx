import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';

import { RouteProp, useRoute } from '@react-navigation/native';
import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import {
  ITText,
  ITCard,
  ITBadge,
  ITTouchableOpacity,
} from '../../../shared/components';
import { ITScreenDatatableLayout } from '../../../shared/components/ITScreenDatatableLayout';
import { getPaginatedUsers } from '../../users/service/user.service';
import { IUser } from '../../users/service/user.types';
import { ClientStackParamList } from '../stack/ClientStack';
import { theme } from '../../../shared/theme/theme';
import { CLIENT_USER_ROLES } from '../../../core/constants/constants';

type ClientGuardsRouteProp = RouteProp<ClientStackParamList, 'CLIENT_GUARDS'>;

export const ClientGuardsScreen = () => {
  const route = useRoute<ClientGuardsRouteProp>();
  const { clientId } = route.params;
  const dispatch = useDispatch();

  const [guards, setGuards] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchGuards = async (isRefresh = false, isLoadMore = false) => {
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
      if (roleFilter !== 'all') filters.role = roleFilter;

      const response = await getPaginatedUsers({
        page: nextPage,
        limit: 10,
        filters,
      });

      if (response.success && response.data) {
        if (isLoadMore) {
          setGuards(prev => [...prev, ...response.data.rows]);
          setPage(nextPage);
        } else {
          setGuards(response.data.rows);
          setPage(1);
        }
        setTotal(response.data.total);
      } else {
        dispatch(
          showToast({
            type: 'error',
            message: response.messages?.[0] || 'Error al cargar guardias',
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
    if (!loading && !loadingMore && !refreshing && guards.length < total) {
      fetchGuards(false, true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGuards();
    }, [clientId, search, roleFilter]),
  );

  const renderGuard = ({ item, index }: { item: IUser; index: number }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'G';

    return (
      <ITTouchableOpacity>
        <ITCard mode="elevated" style={styles.card}>
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
                style={styles.guardName}
              >
                {item.name} {item.lastName}
              </ITText>
              <View style={styles.headerRow}>
                <Icon source="at" size={14} color={theme.colors.slate500} />
                <ITText variant="labelSmall" style={styles.usernameText}>
                  {item.username}
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

          <View style={styles.cardFooter}>
            <View style={styles.footerStats}>
              <Icon
                source="shield-outline"
                size={16}
                color={theme.colors.slate500}
              />
              <ITText variant="bodySmall" style={styles.roleText}>
                {CLIENT_USER_ROLES.find(role => role.value === item.role?.name)
                  ?.label || 'Sin rol'}
              </ITText>
            </View>

            {/* <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              dispatch(
                showToast({
                  message: 'Detalles del guardia en desarrollo',
                  type: 'info',
                }),
              );
            }}
          >
            <ITText style={styles.actionText}>VER PERFIL</ITText>
            <Icon
              source="chevron-right"
              size={16}
              color={theme.colors.primary}
            />
          </TouchableOpacity> */}
          </View>
        </ITCard>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Guardias Asignados"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchGuards(true)}
        showSearchBar={true}
        searchQuery={search}
        onSearchChange={setSearch}
        searchBar={
          <Searchbar
            placeholder="Buscar guardia..."
            onChangeText={setSearch}
            value={search}
            mode="bar"
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            elevation={0}
          />
        }
        // filterBadges={
        //   <View style={styles.filterBadges}>
        //     {CLIENT_USER_ROLES.map(role => (
        //       <TouchableOpacity
        //         key={role.value}
        //         onPress={() => setRoleFilter(role.value)}
        //       >
        //         <ITBadge
        //           label={role.label}
        //           variant={roleFilter === role.value ? 'primary' : 'default'}
        //           outline={roleFilter !== role.value}
        //         />
        //       </TouchableOpacity>
        //     ))}
        //   </View>
        // }
        data={guards}
        renderItem={renderGuard}
        keyExtractor={item => item.id}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        fab={
          <FAB
            icon="shield-plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="white"
            onPress={() => {
              dispatch(
                showToast({
                  message: 'Asignación de guardias en desarrollo',
                  type: 'info',
                }),
              );
            }}
          />
        }
        searchQuery={''}
        onSearchChange={function (query: string): void {
          throw new Error('Function not implemented.');
        }}
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
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  guardName: {
    color: theme.colors.slate900,
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usernameText: {
    color: theme.colors.slate500,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    color: theme.colors.slate500,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});
