import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Avatar,
  Chip,
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
  ITButton,
  ITCard,
  ITText,
  SearchComponent,
} from '../../../shared/components';
import { LoaderComponent } from '../../../shared/components/LoaderComponent';
import ModernStyles from '../../../shared/theme/app.styles';
import { COLORS } from '../../../shared/utils/constants';
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
    navigateToScreen('GUARDS_STACK', 'GUARD_DETAIL', { guard });
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

  const renderItem = ({ item }: { item: any }) => {
    const roleValue =
      typeof item.role === 'object' ? item.role.value : item.role;
    const roleName = typeof item.role === 'object' ? item.role.name : item.role;

    const getRoleConfig = (role: any) => {
      switch (roleName) {
        case UserRole.SHIFT:
          return { bg: '#E0E7FF', color: COLORS.indigo };
        case UserRole.GUARD:
          return { bg: '#F5F3FF', color: COLORS.rounds };
        case UserRole.MAINT:
          return { bg: '#FFFBEB', color: COLORS.maintenance };
        default:
          return { bg: '#F8FAFC', color: '#94A3B8' };
      }
    };

    const config = getRoleConfig(item.role);

    return (
      <ITCard
        style={styles.itemCard}
        onPress={() => handleDetail(item)}
        mode="elevated"
      >
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.avatarSection}>
              <Avatar.Text
                size={52}
                label={item.name ? item.name[0].toUpperCase() : 'G'}
                style={[styles.avatar, { backgroundColor: config.bg }]}
                labelStyle={{ color: config.color, fontWeight: 'bold' }}
              />
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: item.active ? '#10B981' : '#CBD5E1' },
                ]}
              />
            </View>

            <View style={styles.infoSection}>
              <ITText
                variant="titleMedium"
                weight="bold"
                style={styles.userName}
              >
                {item.name} {item.lastName}
              </ITText>
              <View style={styles.metaRow}>
                <View
                  style={[styles.roleBadge, { backgroundColor: config.bg }]}
                >
                  <ITText
                    variant="labelSmall"
                    weight="bold"
                    color={config.color}
                    style={{ fontSize: 10 }}
                  >
                    {roleValue?.toUpperCase()}
                  </ITText>
                </View>
                <ITText variant="labelSmall" color="#94A3B8">
                  @{item.username}
                </ITText>
              </View>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon
                source="clock-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <ITText
                variant="labelSmall"
                color="#64748B"
                weight="medium"
                style={{ marginLeft: 4 }}
              >
                Horario:{' '}
                <ITText variant="labelSmall" color="#1E293B" weight="bold">
                  {item.schedule ? item.schedule.name : 'Sin Horario'}
                </ITText>
              </ITText>
            </View>
            <View style={[styles.detailItem, { marginTop: 4 }]}>
              <Icon source="office-building" size={14} color={COLORS.primary} />
              <ITText
                variant="labelSmall"
                color="#64748B"
                weight="medium"
                style={{ marginLeft: 4 }}
              >
                Cliente:{' '}
                <ITText
                  variant="labelSmall"
                  color={COLORS.primary}
                  weight="bold"
                >
                  {item.client ? item.client.name : 'Sin Cliente'}
                </ITText>
              </ITText>
            </View>
            <View style={[styles.detailItem, { marginTop: 4 }]}>
              <Icon
                source="clipboard-check-outline"
                size={14}
                color={COLORS.indigo}
              />
              <ITText
                variant="labelSmall"
                color="#64748B"
                weight="medium"
                style={{ marginLeft: 4 }}
              >
                Asignaciones:{' '}
                <ITText variant="labelSmall" color={COLORS.indigo} weight="bold">
                  {item.assignments?.length || 0}
                </ITText>
              </ITText>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.footer}>
            <ITButton
              label="HORARIO"
              mode="text"
              icon="calendar-clock"
              onPress={() => {
                setChangingGuard(item);
                setShowScheduleModal(true);
              }}
              style={styles.footerBtn}
              labelStyle={{ fontSize: 12, color: '#F59E0B' }}
            />
            <View style={styles.vDivider} />
            <ITButton
              label="CLIENTE"
              mode="text"
              icon="domain"
              onPress={() => {
                setChangingGuard(item);
                setShowClientModal(true);
              }}
              style={styles.footerBtn}
              labelStyle={{ fontSize: 12, color: COLORS.primary }}
            />
          </View>
        </View>
      </ITCard>
    );
  };

  return (
    <View style={ModernStyles.screenContainer}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ITText
              variant="headlineSmall"
              weight="bold"
              color={COLORS.textPrimary}
            >
              Personal Operativo
            </ITText>
            <ITText variant="labelSmall" color={COLORS.textSecondary}>
              {total} guardias registrados
            </ITText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton
              icon="filter-variant"
              mode="contained"
              containerColor={
                activeFiltersCount > 0 ? COLORS.primary : '#F1F5F9'
              }
              iconColor={activeFiltersCount > 0 ? '#FFF' : COLORS.textSecondary}
              onPress={() => setShowFilters(true)}
            />
            <IconButton
              icon="refresh"
              mode="contained"
              containerColor="#F1F5F9"
              iconColor={COLORS.textSecondary}
              onPress={onRefresh}
            />
          </View>
        </View>
        <Searchbar
          placeholder="Buscar por nombre o usuario..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={COLORS.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {[
            { label: 'Todos', value: null },
            { label: 'Guardias', value: 'GUARD' },
            { label: 'Jefes', value: 'SHIFT' },
            { label: 'Mantenimiento', value: 'MAINT' },
          ].map(role => (
            <Chip
              key={role.label}
              selected={selectedRole === role.value}
              onPress={() => setSelectedRole(role.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedRole === role.value ? COLORS.primary : '#F1F5F9',
                },
              ]}
              textStyle={[
                styles.chipText,
                {
                  color: selectedRole === role.value ? '#FFFFFF' : '#64748B',
                },
              ]}
              showSelectedCheck={false}
            >
              {role.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={guards}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loadingMore ? (
            <ActivityIndicator style={{ margin: 16 }} color={COLORS.primary} />
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon source="shield-search" size={64} color="#E2E8F0" />
              <ITText variant="titleMedium" color="#94A3B8">
                No se encontró personal
              </ITText>
            </View>
          ) : (
            <ActivityIndicator
              style={{ marginTop: 40 }}
              color={COLORS.primary}
            />
          )
        }
      />

      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.filterModalContainer}
        >
          <View style={styles.modalHeaderFilter}>
            <View style={styles.modalHeaderTitle}>
              <Icon source="filter-variant" size={24} color={COLORS.primary} />
              <ITText variant="titleLarge" weight="bold">
                Filtros
              </ITText>
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
              <ITText
                variant="labelSmall"
                weight="bold"
                color="#94A3B8"
                style={{ marginBottom: 12, letterSpacing: 1 }}
              >
                POR CLIENTE
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
            style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}
          >
            <ITButton
              label="Limpiar"
              mode="outlined"
              onPress={handleClearFilters}
              style={styles.footerButton}
              labelStyle={{ color: '#64748B' }}
            />
            <ITButton
              label="Aplicar Filtros"
              mode="contained"
              onPress={handleApplyFilters}
              style={styles.footerButton}
            />
          </View>
        </Modal>
      </Portal>

      {/* Client Selection Modal (Reassignment) */}
      <Portal>
        <Dialog
          visible={showClientModal}
          onDismiss={() => setShowClientModal(false)}
          style={styles.reassignDialog}
        >
          <Dialog.Title>Reasignar Cliente</Dialog.Title>
          <Dialog.Content>
            {updating ? (
              <ActivityIndicator
                color={COLORS.primary}
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
                      left={props => <List.Icon {...props} icon="domain" />}
                      right={props =>
                        isSelected ? (
                          <List.Icon
                            {...props}
                            icon="check"
                            color={COLORS.primary}
                          />
                        ) : null
                      }
                      titleStyle={
                        isSelected
                          ? { color: COLORS.primary, fontWeight: 'bold' }
                          : undefined
                      }
                    />
                  );
                }}
                ItemSeparatorComponent={Divider}
                style={{ maxHeight: 400 }}
              />
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Schedule Selection Modal (Reassignment) */}
      <Portal>
        <Dialog
          visible={showScheduleModal}
          onDismiss={() => setShowScheduleModal(false)}
          style={styles.reassignDialog}
        >
          <Dialog.Title>Cambiar Horario</Dialog.Title>
          <Dialog.Content>
            {updating ? (
              <ActivityIndicator
                color={COLORS.primary}
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
                        <List.Icon {...props} icon="clock-outline" />
                      )}
                      right={props =>
                        isSelected ? (
                          <List.Icon
                            {...props}
                            icon="check"
                            color={COLORS.primary}
                          />
                        ) : null
                      }
                      titleStyle={
                        isSelected
                          ? { color: COLORS.primary, fontWeight: 'bold' }
                          : undefined
                      }
                    />
                  );
                }}
                ItemSeparatorComponent={Divider}
                style={{ maxHeight: 400 }}
              />
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>
      <LoaderComponent />
    </View>
  );
};

const styles = StyleSheet.create({
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
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    borderWidth: 0,
    borderRadius: 10,
    height: 32,
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    borderWidth: 0,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoSection: {
    flex: 1,
  },
  userName: {
    color: '#1E293B',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detailsRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 0,
    height: '100%',
    justifyContent: 'center',
    marginVertical: 0, // Override ITButton default
  },
  vDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  filterModalContainer: {
    backgroundColor: 'white',
    flex: 1,
    margin: 0,
  },
  modalHeaderFilter: {
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
  modalScroll: {
    padding: 24,
  },
  filterGroup: {
    marginBottom: 32,
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
  reassignDialog: {
    backgroundColor: '#FFF',
    borderRadius: 24,
  },
});
