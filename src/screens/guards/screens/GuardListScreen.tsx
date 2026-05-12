import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Dialog,
  Divider,
  Icon,
  IconButton,
  List,
  Portal,
  Searchbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { UserRole } from '../../../core/types/IUser';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITBadge,
  ITButton,
  ITCard,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
  SearchComponent,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { getClients } from '../../clients/service/client.service';
import { getSchedules } from '../../schedules/service/schedules.service';
import {
  getPaginatedUsers,
  updateUser,
} from '../../users/service/user.service';

export const GuardListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);

  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination and Filters
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [appliedClientId, setAppliedClientId] = useState<string | number>(
    'ALL',
  );
  const [tempClientId, setTempClientId] = useState<string | number>('ALL');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Reassignment States
  const [changingGuard, setChangingGuard] = useState<any>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGuards = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefreshing) {
            setLoading(true);
            dispatch(showLoader(true));
          }
        } else {
          setLoadingMore(true);
        }

        const roleFilter: any = {};
        if (selectedRole) {
          roleFilter.name = selectedRole;
        } else if (user.role === UserRole.ADMIN) {
          roleFilter.name = { in: ['GUARD', 'SHIFT', 'MAINT'] };
        } else {
          roleFilter.name = { in: ['GUARD'] };
        }

        const params = {
          page: pageNum,
          limit: 15,
          filters: {
            name: debouncedSearch,
            role: roleFilter,
            ...(appliedClientId !== 'ALL' && { clientId: appliedClientId }),
          },
        };

        const res = await getPaginatedUsers(params);

        if (res.success && res.data) {
          const newRows = res.data.rows || [];
          const totalRows = res.data.total || 0;

          setGuards(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching guards:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        dispatch(showLoader(false));
      }
    },
    [debouncedSearch, user.role, appliedClientId, selectedRole, dispatch],
  );

  useEffect(() => {
    getClients().then(res => {
      if (res.success && res.data) {
        setClients(res.data.map((c: any) => ({ label: c.name, value: c.id })));
      }
    });
    getSchedules().then(res => res.success && setSchedules(res.data || []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGuards(1);
    }, [fetchGuards]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGuards(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchGuards(page + 1);
    }
  };

  const { navigateToScreen } = useAppNavigation();

  const handleDetail = (guard: any) => {
    // navigateToScreen('GUARDS_STACK', 'GUARD_DETAIL', { guard });
  };

  const handleApplyFilters = () => {
    setAppliedClientId(tempClientId);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempClientId('ALL');
  };

  const activeFiltersCount = appliedClientId !== 'ALL' ? 1 : 0;

  const handleUpdate = async (id: number, data: any) => {
    setUpdating(true);
    try {
      const res = await updateUser(id, data);
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Usuario actualizado' });
        onRefresh();
      } else {
        Toast.show({ type: 'error', text1: 'Error al actualizar' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error de red' });
    } finally {
      setUpdating(false);
      setChangingGuard(null);
      setShowClientModal(false);
      setShowScheduleModal(false);
    }
  };

  const renderGuardItem = ({ item }: { item: any }) => (
    <UserListItem
      item={item}
      onPress={handleDetail}
      onDelete={() => {}} // Main guards list might not need quick delete or handle differently
      onResetPassword={() => {
        setChangingGuard(item);
        setShowScheduleModal(true);
      }}
    />
  );

  // Custom render for Guard list with Reassignment buttons
  const renderGuard = ({ item }: { item: any }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'G';
    return (
      <ITCard
        style={styles.itemCard}
        onPress={() => handleDetail(item)}
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
              style={styles.userName}
              numberOfLines={1}
            >
              {item.name} {item.lastName}
            </ITText>
            <View style={styles.headerRowBadge}>
              <ITBadge
                label={item.role?.value?.toUpperCase() || 'GUARDIA'}
                variant="primary"
                size="small"
                outline
              />
              <ITText variant="labelSmall" style={styles.usernameText}>
                @{item.username}
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
              source="clock-outline"
              size={16}
              color={theme.colors.slate500}
            />
            <ITText variant="bodySmall" style={styles.infoText}>
              {item.schedule
                ? `${item.schedule.name} (${item.schedule.startTime} - ${item.schedule.endTime})`
                : 'Sin Horario'}
            </ITText>
          </View>
          <View style={styles.infoItem}>
            <Icon
              source="office-building"
              size={16}
              color={theme.colors.slate500}
            />
            <ITText
              variant="bodySmall"
              style={styles.infoText}
              numberOfLines={1}
            >
              {item.client ? item.client.name : 'Sin Cliente Asignado'}
            </ITText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <ITTouchableOpacity
            style={styles.footerButton}
            onPress={() => {
              setChangingGuard(item);
              setShowScheduleModal(true);
            }}
          >
            <Icon
              source="calendar-clock"
              size={18}
              color={theme.colors.primary}
            />
            <ITText style={styles.footerButtonText}>Horario</ITText>
          </ITTouchableOpacity>

          <View style={styles.dividerVertical} />

          <ITTouchableOpacity
            style={styles.footerButton}
            onPress={() => {
              setChangingGuard(item);
              setShowClientModal(true);
            }}
          >
            <Icon source="domain" size={18} color={theme.colors.primary} />
            <ITText style={styles.footerButtonText}>Cliente</ITText>
          </ITTouchableOpacity>
        </View>
      </ITCard>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Personal Operativo"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        showSearchBar={true}
        searchQuery={search}
        onSearchChange={setSearch}
        searchBar={
          <Searchbar
            placeholder="Buscar guardia por nombre..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        }
        data={guards}
        renderItem={renderGuard}
        keyExtractor={item => item.id.toString()}
      />

      {/* REASSIGNMENT MODALS */}
      <Portal>
        <Dialog
          visible={showClientModal}
          onDismiss={() => setShowClientModal(false)}
          style={styles.reassignDialog}
        >
          <Dialog.Title>
            <ITText variant="headlineSmall" weight="bold">
              Reasignar Cliente
            </ITText>
          </Dialog.Title>
          <Dialog.Content>
            {updating ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={{ margin: 20 }}
              />
            ) : (
              <FlatList
                data={clients.filter(c => c.value !== 'ALL')}
                keyExtractor={item => item.value.toString()}
                renderItem={({ item }) => {
                  const isSelected = changingGuard?.client?.id === item.value;
                  return (
                    <List.Item
                      title={item.label}
                      onPress={() =>
                        handleUpdate(changingGuard.id, { clientId: item.value })
                      }
                      left={props => (
                        <List.Icon
                          {...props}
                          icon="domain"
                          color={
                            isSelected
                              ? theme.colors.primary
                              : theme.colors.slate500
                          }
                        />
                      )}
                      right={props =>
                        isSelected ? (
                          <List.Icon
                            {...props}
                            icon="check"
                            color={theme.colors.primary}
                          />
                        ) : null
                      }
                      titleStyle={
                        isSelected
                          ? { color: theme.colors.primary, fontWeight: 'bold' }
                          : { color: theme.colors.slate900 }
                      }
                    />
                  );
                }}
                ItemSeparatorComponent={() => (
                  <Divider style={{ backgroundColor: '#F1F5F9' }} />
                )}
                style={{ maxHeight: 400 }}
              />
            )}
          </Dialog.Content>
        </Dialog>

        <Dialog
          visible={showScheduleModal}
          onDismiss={() => setShowScheduleModal(false)}
          style={styles.reassignDialog}
        >
          <Dialog.Title>
            <ITText variant="headlineSmall" weight="bold">
              Cambiar Horario
            </ITText>
          </Dialog.Title>
          <Dialog.Content>
            {updating ? (
              <ActivityIndicator
                color={theme.colors.primary}
                style={{ margin: 20 }}
              />
            ) : (
              <FlatList
                data={schedules}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                  const isSelected = changingGuard?.schedule?.id === item.id;
                  return (
                    <List.Item
                      title={item.name}
                      description={`${item.startTime} - ${item.endTime}`}
                      onPress={() =>
                        handleUpdate(changingGuard.id, { scheduleId: item.id })
                      }
                      left={props => (
                        <List.Icon
                          {...props}
                          icon="clock-outline"
                          color={
                            isSelected
                              ? theme.colors.primary
                              : theme.colors.slate500
                          }
                        />
                      )}
                      right={props =>
                        isSelected ? (
                          <List.Icon
                            {...props}
                            icon="check"
                            color={theme.colors.primary}
                          />
                        ) : null
                      }
                      titleStyle={
                        isSelected
                          ? { color: theme.colors.primary, fontWeight: 'bold' }
                          : { color: theme.colors.slate900 }
                      }
                    />
                  );
                }}
                ItemSeparatorComponent={() => (
                  <Divider style={{ backgroundColor: '#F1F5F9' }} />
                )}
                style={{ maxHeight: 400 }}
              />
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* FILTER MODAL */}
      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.filterModalContainer}
        >
          <View
            style={[styles.modalHeaderFilter, { paddingTop: insets.top + 16 }]}
          >
            <View style={styles.modalHeaderTitle}>
              <Icon
                source="filter-variant"
                size={24}
                color={theme.colors.primary}
              />
              <ITText variant="titleLarge" weight="bold">
                Filtros Avanzados
              </ITText>
            </View>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowFilters(false)}
              iconColor={theme.colors.slate500}
            />
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterGroup}>
              <ITText
                variant="labelSmall"
                weight="bold"
                color={theme.colors.slate500}
                style={styles.filterLabel}
              >
                FILTRAR POR CLIENTE
              </ITText>
              <SearchComponent
                label="Cliente"
                placeholder="Todos los clientes"
                options={[
                  { label: 'Todos los clientes', value: 'ALL' },
                  ...clients,
                ]}
                value={tempClientId}
                onSelect={setTempClientId}
              />
            </View>
          </ScrollView>

          <View
            style={[styles.modalFooter, { paddingBottom: insets.bottom + 24 }]}
          >
            <ITButton
              label="Limpiar Filtros"
              mode="outlined"
              onPress={handleClearFilters}
              style={styles.footerButton}
              textColor={theme.colors.slate500}
            />
            <ITButton
              label="Aplicar"
              mode="contained"
              onPress={handleApplyFilters}
              style={[
                styles.footerButton,
                { backgroundColor: theme.colors.primary },
              ]}
            />
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  filtersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filtersRow: {
    paddingVertical: 4,
    gap: 10,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
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
  userName: {
    color: theme.colors.slate900,
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameText: {
    color: theme.colors.slate500,
    fontSize: 12,
  },
  cardBody: {
    gap: 8,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  infoText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  dividerVertical: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  reassignDialog: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  filterModalContainer: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    margin: 0,
  },
  modalHeaderFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalScroll: {
    flex: 1,
    padding: 24,
  },
  filterGroup: {
    marginBottom: 32,
  },
  filterLabel: {
    marginBottom: 16,
    letterSpacing: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
