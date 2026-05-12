import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { FAB, Searchbar, useTheme, Icon } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';

import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import {
  ITAlert,
  ITBadge,
  ITCard,
  ITInput,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { ITScreenDatatableLayout } from '../../../shared/components/ITScreenDatatableLayout';
import { ITScreensFiltersModal } from '../../../shared/components/ITScreensFiltersModal';
import { deleteClient, getClientsDatatable } from '../service/client.service';
import { IClient } from '../service/client.types';
import { theme } from '../../../shared/theme/theme';

export const ClientListScreen = () => {
  const paperTheme = useTheme() as any;
  const navigation = useNavigation() as any;
  const dispatch = useDispatch();

  const [clients, setClients] = useState<IClient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [filterVisible, setFilterVisible] = useState(false);
  const [filterRfc, setFilterRfc] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClients = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const filters: any = {};
      if (search) filters.name = search;
      if (filterRfc) filters.rfc = filterRfc;
      if (filterStatus !== 'all') filters.active = filterStatus === 'active';

      const response = await getClientsDatatable({
        page: 1,
        limit: 100,
        filters,
      });

      if (response.success && response.data) {
        setClients(response.data.rows);
        setTotal(response.data.total);
      } else {
        dispatch(
          showToast({
            type: 'error',
            message: response.messages?.[0] || 'Error al cargar clientes',
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
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [search, filterStatus]),
  );

  const handleDeletePress = (id: string) => {
    setClientToDelete(id);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteClient(clientToDelete);
      if (res.success) {
        dispatch(
          showToast({
            message: 'Cliente eliminado correctamente',
            type: 'success',
          }),
        );
        fetchClients(true);
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
      setClientToDelete(null);
    }
  };

  const renderClient = ({ item, index }: { item: IClient; index: number }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'C';

    return (
      <ITTouchableOpacity
        onPress={() => navigation.navigate('CLIENT_DETAIL', { id: item.id })}
      >
        <View style={styles.customCard}>
          {/* HEADER */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <ITText style={styles.avatarText}>{initial}</ITText>
              <View
                style={[
                  styles.statusDot,
                  item.active ? styles.statusActive : styles.statusInactive,
                ]}
              />
            </View>

            <View style={styles.headerInfo}>
              <ITText
                variant="titleMedium"
                style={styles.clientName}
                numberOfLines={1}
              >
                {item.name}
              </ITText>
              <View style={styles.headerRow}>
                <Icon source="account" size={14} color="#64748B" />
                <ITText variant="labelSmall" style={styles.usernameText}>
                  {item.users?.[0]?.username || 'sin_usuario'}
                </ITText>
              </View>
            </View>

            <ITBadge
              label={item.active ? 'Activo' : 'Inactivo'}
              variant={item.active ? 'success' : 'error'}
              size="small"
            />
          </View>

          {/* BODY */}
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon
                  source="file-document-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <ITText variant="bodySmall" style={styles.infoLabel}>
                  RFC:
                </ITText>
                <ITText variant="bodySmall" style={styles.infoValue}>
                  {item.rfc || 'N/A'}
                </ITText>
              </View>

              <View style={styles.infoItem}>
                <Icon source="account-tie" size={18} color="#F59E0B" />
                <ITText variant="bodySmall" style={styles.infoLabel}>
                  Contacto:
                </ITText>
                <ITText
                  variant="bodySmall"
                  style={styles.infoValue}
                  numberOfLines={1}
                >
                  {item.contactName || 'Sin contacto'}
                </ITText>
              </View>

              <View style={styles.infoItem}>
                <Icon source="map-marker" size={18} color="#10B981" />
                <ITText variant="bodySmall" style={styles.infoLabel}>
                  Ubicaciones:
                </ITText>
                <ITText
                  variant="bodySmall"
                  weight="bold"
                  style={styles.locationCount}
                >
                  {item._count?.locations || 0}
                </ITText>
              </View>
            </View>
          </View>

          {/* FOOTER ACTIONS */}
          <View style={styles.cardFooter}>
            <ITTouchableOpacity
              style={styles.footerButton}
              onPress={() =>
                navigation.navigate('CLIENT_FORM', { id: item.id })
              }
            >
              <Icon source="pencil" size={16} color={theme.colors.primary} />
              <ITText style={styles.footerButtonText}>Editar</ITText>
            </ITTouchableOpacity>

            <View style={styles.dividerVertical} />

            <ITTouchableOpacity
              style={styles.footerButton}
              onPress={() => handleDeletePress(item.id)}
            >
              <Icon source="delete" size={16} color="#EF4444" />
              <ITText style={[styles.footerButtonText, { color: '#EF4444' }]}>
                Eliminar
              </ITText>
            </ITTouchableOpacity>
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ITScreenDatatableLayout
        showSearchBar={true}
        searchBar={
          <Searchbar
            placeholder="Buscar cliente por nombre o usuario..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        }
        title="Empresas y Sedes"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchClients(true)}
        onFilterPress={() => setFilterVisible(true)}
        searchQuery={search}
        onSearchChange={setSearch}
        filterBadges={
          <View style={styles.filterBadges}>
            <TouchableOpacity onPress={() => setFilterStatus('all')}>
              <ITBadge
                label="Todos"
                variant={filterStatus === 'all' ? 'primary' : 'default'}
                outline={filterStatus !== 'all'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterStatus('active')}>
              <ITBadge
                label="Activos"
                variant={filterStatus === 'active' ? 'success' : 'default'}
                outline={filterStatus !== 'active'}
                dot={filterStatus === 'active'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterStatus('inactive')}>
              <ITBadge
                label="Inactivos"
                variant={filterStatus === 'inactive' ? 'error' : 'default'}
                outline={filterStatus !== 'inactive'}
              />
            </TouchableOpacity>
          </View>
        }
        data={clients}
        renderItem={renderClient}
        keyExtractor={item => item.id}
        fab={
          <FAB
            icon="plus"
            style={styles.fab}
            color="#FFFFFF"
            onPress={() => navigation.navigate('CLIENT_FORM')}
          />
        }
      />

      <ITScreensFiltersModal
        visible={filterVisible}
        onDismiss={() => setFilterVisible(false)}
        onApply={() => {
          setFilterVisible(false);
          fetchClients(true);
        }}
        onClear={() => {
          setFilterRfc('');
          setFilterVisible(false);
          fetchClients(true);
        }}
      >
        <ITInput
          label="Filtrar por RFC"
          value={filterRfc}
          onChangeText={setFilterRfc}
          placeholder="Escribe el RFC..."
        />
      </ITScreensFiltersModal>

      <ITAlert
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        description="¿Estás seguro de que deseas eliminar este cliente? Se eliminarán todas sus zonas y ubicaciones asociadas."
        confirmLabel="Eliminar"
        type="alert"
        loading={isDeleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    fontSize: 14,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    color: '#0F172A',
  },
  filterBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  customCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  statusActive: {
    backgroundColor: '#10B981',
  },
  statusInactive: {
    backgroundColor: '#EF4444',
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontWeight: '700',
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
    fontSize: 11,
  },
  cardBody: {
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  infoLabel: {
    color: theme.colors.slate500,
    fontSize: 12,
  },
  infoValue: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  locationCount: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dividerVertical: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});
