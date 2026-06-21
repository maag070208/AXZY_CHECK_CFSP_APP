import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';

import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import {
  ITAlert,
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import {
  deleteZone,
  getPaginatedZones,
} from '../../zones/service/zone.service';
import { IZone } from '../../zones/type/zone.types';
import { ClientZoneFormModal } from '../modal/ClientZoneFormModal';
import { ClientStackParamList } from '../stack/ClientStack';

type ClientZonesRouteProp = RouteProp<ClientStackParamList, 'CLIENT_ZONES'>;

export const ClientZonesScreen = () => {
  const route = useRoute<ClientZonesRouteProp>();
  const navigation = useNavigation<any>();
  const { clientId } = route.params;
  const dispatch = useDispatch();

  const [zones, setZones] = useState<IZone[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form Modal
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [zoneToEdit, setZoneToEdit] = useState<IZone | null>(null);

  // Delete Alert
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchZones = async (isRefresh = false, isLoadMore = false) => {
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

      const response = await getPaginatedZones({
        page: nextPage,
        limit: 10,
        filters,
      });

      if (response.success && response.data) {
        if (isLoadMore) {
          setZones(prev => [...prev, ...response.data.rows]);
          setPage(nextPage);
        } else {
          setZones(response.data.rows);
          setPage(1);
        }
        setTotal(response.data.total);
      } else {
        dispatch(
          showToast({
            type: 'error',
            message: response.messages?.[0] || 'Error al cargar zonas',
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
    if (!loading && !loadingMore && !refreshing && zones.length < total) {
      fetchZones(false, true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchZones();
    }, [clientId, search]),
  );

  const handleDeletePress = (id: string) => {
    setZoneToDelete(id);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!zoneToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteZone(zoneToDelete);
      if (res.success) {
        dispatch(
          showToast({
            message: 'Zona eliminada',
            type: 'success',
          }),
        );
        fetchZones(true);
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
      setZoneToDelete(null);
    }
  };

  const renderZone = ({ item, index }: { item: IZone; index: number }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'Z';

    return (
      <ITTouchableOpacity
        onPress={() => {
          navigation.navigate('CLIENT_LOCATIONS' as any, {
            clientId,
            zoneId: item.id,
            zoneName: item.name,
          });
        }}
        style={[styles.card, !item.active && styles.cardInactive]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <ITText style={styles.avatarText}>{initial}</ITText>
            <View style={[styles.statusDot, { backgroundColor: item.active ? '#10B981' : '#EF4444' }]} />
          </View>

          <View style={styles.headerInfo}>
            <ITText style={styles.zoneName}>
              {item.name}
            </ITText>
            <View style={styles.headerMeta}>
              <Icon source="map-marker-outline" size={12} color="#64748B" />
              <ITText variant="labelSmall" color="#64748B" style={{ marginLeft: 3 }}>
                {item._count?.locations || 0} Ubicaciones
              </ITText>
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
          <ITTouchableOpacity
            onPress={() => { setZoneToEdit(item); setFormModalVisible(true); }}
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
        title="Zonas de Recorrido"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchZones(true)}
        showSearchBar={true}
        searchBar={
          <Searchbar
            placeholder="Buscar zona..."
            onChangeText={setSearch}
            value={search}
            mode="bar"
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            elevation={0}
          />
        }
        data={zones}
        renderItem={renderZone}
        keyExtractor={item => item.id}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        fab={
          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="#FFFFFF"
            onPress={() => {
              setZoneToEdit(null);
              setFormModalVisible(true);
            }}
          />
        }
        searchQuery={''}
        onSearchChange={function (query: string): void {
          throw new Error('Function not implemented.');
        }}
      />

      <ClientZoneFormModal
        visible={formModalVisible}
        onDismiss={() => setFormModalVisible(false)}
        onSuccess={() => fetchZones(true)}
        clientId={clientId}
        editZone={zoneToEdit}
        onDelete={handleDeletePress}
      />

      <ITAlert
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
        title="Eliminar Zona"
        description="¿Estás seguro de que deseas eliminar esta zona? Se perderán las asociaciones con ubicaciones."
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
  zoneName: {
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
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
