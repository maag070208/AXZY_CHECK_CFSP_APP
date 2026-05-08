import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Avatar,
  FAB,
  Icon,
  IconButton,
  Portal,
  Searchbar,
} from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITButton,
  ITCard,
  ITScreenWrapper,
  ITText,
  LoaderComponent,
} from '../../../shared/components';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getCatalog } from '../../../shared/service/catalog.service';
import ModernStyles from '../../../shared/theme/app.styles';
import { theme } from '../../../shared/theme/theme';
import { COLORS } from '../../../shared/utils/constants';
import { getPaginatedIncidents } from '../service/incident.service';

export const IncidentListScreen = () => {
  const { navigateToScreen } = useAppNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);

  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination and Totals
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Catalogs
  const [guards, setGuards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Applied Filters
  const [appliedRange, setAppliedRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });
  const [appliedGuardId, setAppliedGuardId] = useState<number | string>('ALL');
  const [appliedCategory, setAppliedCategory] = useState<number | string>(
    'ALL',
  );
  const [appliedType, setAppliedType] = useState<number | string>('ALL');
  const [appliedClientId, setAppliedClientId] = useState<number | string>(
    'ALL',
  );

  // Temp Filters (for Modal)
  const [tempRange, setTempRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });
  const [tempGuardId, setTempGuardId] = useState<number | string>('ALL');
  const [tempCategory, setTempCategory] = useState<number | string>('ALL');
  const [tempType, setTempType] = useState<number | string>('ALL');
  const [tempClientId, setTempClientId] = useState<number | string>('ALL');

  const [openDate, setOpenDate] = useState(false);

  // Load Catalogs
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [guardsRes, catRes, typeRes, clientsRes] = await Promise.all([
          getCatalog('guard'),
          getCatalog('incident_category'),
          getCatalog('incident_type'),
          getCatalog('client'),
        ]);

        if (guardsRes.success) {
          setGuards(
            guardsRes.data.map((g: any) => ({ label: g.value, value: g.id })),
          );
        }
        if (catRes.success) {
          setCategories(
            catRes.data.map((c: any) => ({
              label: c.name,
              value: c.id,
              color: c.color,
              icon: c.icon,
            })),
          );
        }
        if (typeRes.success) {
          setIncidentTypes(typeRes.data);
        }
        if (clientsRes.success) {
          setClients(
            clientsRes.data.map((c: any) => ({
              label: c.name,
              value: c.id,
            })),
          );
        }
      } catch (error) {
        console.error('Error fetching catalogs:', error);
      }
    };
    fetchCatalogs();
  }, []);

  // Debounce effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchIncidents = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefreshing) setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const filters: any = {};
        if (debouncedSearch) filters.search = debouncedSearch;
        if (appliedGuardId !== 'ALL') filters.guardId = appliedGuardId;
        if (appliedCategory !== 'ALL') filters.categoryId = appliedCategory;
        if (appliedType !== 'ALL') filters.typeId = appliedType;
        if (appliedClientId !== 'ALL') filters.clientId = appliedClientId;
        if (appliedRange.startDate) filters.startDate = appliedRange.startDate;
        if (appliedRange.endDate) filters.endDate = appliedRange.endDate;

        const res = await getPaginatedIncidents({
          page: pageNum,
          limit: 15,
          filters,
        });

        if (res.success && res.data) {
          const newRows = res.data.rows || [];
          const totalRows = res.data.total || 0;

          setIncidents(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching incidents:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [
      debouncedSearch,
      appliedGuardId,
      appliedCategory,
      appliedType,
      appliedClientId,
      appliedRange,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      fetchIncidents(1);
    }, [fetchIncidents]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchIncidents(page + 1);
    }
  };

  const handleOpenFilters = () => {
    setTempRange(appliedRange);
    setTempGuardId(appliedGuardId);
    setTempCategory(appliedCategory);
    setTempType(appliedType);
    setTempClientId(appliedClientId);
    setShowFilters(true);
  };

  const handleApplyFilters = () => {
    setAppliedRange(tempRange);
    setAppliedGuardId(tempGuardId);
    setAppliedCategory(tempCategory);
    setAppliedType(tempType);
    setAppliedClientId(tempClientId);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempRange({ startDate: undefined, endDate: undefined });
    setTempGuardId('ALL');
    setTempCategory('ALL');
    setTempType('ALL');
    setTempClientId('ALL');
  };

  const activeFiltersCount = [
    appliedRange.startDate ? 1 : 0,
    appliedGuardId !== 'ALL' ? 1 : 0,
    appliedCategory !== 'ALL' ? 1 : 0,
    appliedType !== 'ALL' ? 1 : 0,
    appliedClientId !== 'ALL' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getCategoryInfo = (categoryId: number) => {
    const cat = categories.find(c => c.value === categoryId);
    return cat || { label: 'General', color: '#64748B', icon: 'alert-circle' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const catInfo = getCategoryInfo(item.categoryId);
    const date = new Date(item.createdAt);
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const isPending = item.status === 'PENDING';

    return (
      <ITCard
        style={[styles.card, isPending && styles.pendingCard]}
        onPress={() =>
          navigateToScreen('INCIDENTS_STACK', 'INCIDENT_DETAIL', {
            incident: item,
          })
        }
      >
        <View style={styles.cardLayout}>
          <View style={styles.avatarSection}>
            <Avatar.Text
              size={56}
              label={item.guard?.name?.charAt(0) || 'G'}
              style={[
                styles.avatar,
                {
                  backgroundColor: isPending
                    ? COLORS.surface
                    : COLORS.surfaceVariant,
                },
              ]}
              labelStyle={{
                color: isPending ? COLORS.error : COLORS.textSecondary,
                fontWeight: 'bold',
              }}
            />
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isPending ? COLORS.red : COLORS.emerald },
              ]}
            >
              <Icon
                source={isPending ? 'clock-outline' : 'check'}
                size={10}
                color="#fff"
              />
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: catInfo.color + '15' },
                ]}
              >
                <Icon
                  source={catInfo.icon || 'alert-circle'}
                  size={12}
                  color={catInfo.color}
                />
                <ITText
                  variant="labelSmall"
                  weight="bold"
                  style={{ color: catInfo.color, fontSize: 10 }}
                >
                  {catInfo.label?.toUpperCase() || ''}
                </ITText>
              </View>
            </View>

            <ITText
              variant="titleMedium"
              weight="bold"
              color={COLORS.textPrimary}
              numberOfLines={1}
            >
              {item.title}
            </ITText>

            {item.client && (
              <View style={styles.clientRow}>
                <Icon
                  source="office-building"
                  size={14}
                  color={COLORS.primary}
                />
                <ITText
                  variant="labelSmall"
                  color={COLORS.textSecondary}
                  numberOfLines={1}
                  style={{ marginLeft: 4 }}
                >
                  {item.client.name}
                </ITText>
              </View>
            )}

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Icon source="account-outline" size={14} color="#64748B" />
                <ITText
                  variant="labelSmall"
                  color="#64748B"
                  numberOfLines={1}
                  style={{ marginLeft: 4 }}
                >
                  {item.guard?.name}
                </ITText>
              </View>
              <View style={[styles.detailItem, styles.ml12]}>
                <Icon source="calendar-outline" size={14} color="#64748B" />
                <ITText
                  variant="labelSmall"
                  color="#64748B"
                  style={{ marginLeft: 4 }}
                >
                  {timeStr}
                </ITText>
              </View>
            </View>
          </View>

          <IconButton
            icon="chevron-right"
            iconColor={COLORS.border}
            size={24}
          />
        </View>
      </ITCard>
    );
  };

  return (
    <ITScreenWrapper
      padding={false}
      scrollable={false}
      style={ModernStyles.screenContainer}
    >
      <LoaderComponent visible={loading} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ITText variant="headlineSmall" weight="bold" color="#1E293B">
              Incidencias
            </ITText>
            <ITText variant="labelMedium" color="#64748B">
              {total} reportes registrados
            </ITText>
          </View>
          <IconButton
            icon="filter-variant"
            mode="contained"
            containerColor={
              activeFiltersCount > 0 ? theme.colors.primary : '#F1F5F9'
            }
            iconColor={activeFiltersCount > 0 ? '#FFFFFF' : '#64748B'}
            onPress={handleOpenFilters}
          />
        </View>
        <Searchbar
          placeholder="Buscar reportes..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      <FlatList
        data={incidents}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loadingMore ? (
            <ActivityIndicator
              style={{ margin: 16 }}
              color={theme.colors.primary}
            />
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon
                source="clipboard-text-search-outline"
                size={64}
                color="#E2E8F0"
              />
              <ITText
                variant="bodyLarge"
                color="#94A3B8"
                style={{ marginTop: 12 }}
              >
                No se encontraron resultados
              </ITText>
              <ITButton
                mode="text"
                onPress={() => fetchIncidents(1)}
                label="Actualizar lista"
              />
            </View>
          ) : null
        }
      />

      {user.role === UserRole.ADMIN && isFocused && (
        <Portal>
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={() =>
              navigateToScreen('INCIDENTS_STACK', 'INCIDENT_REPORT')
            }
            color="white"
          />
        </Portal>
      )}

      <Portal>
        <Modal visible={showFilters} onDismiss={() => setShowFilters(false)}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeaderTitle}>
              <Icon
                source="filter-variant"
                size={24}
                color={theme.colors.primary}
              />
              <ITText
                variant="titleLarge"
                weight="bold"
                style={styles.modalTitle}
              >
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
                variant="labelLarge"
                weight="bold"
                color="#94A3B8"
                style={styles.filterLabel}
              >
                POR FECHA
              </ITText>
              <TouchableOpacity
                onPress={() => setOpenDate(true)}
                style={styles.dateSelector}
              >
                <Icon
                  source="calendar-range"
                  size={20}
                  color={theme.colors.primary}
                />
                <ITText variant="titleMedium" style={styles.dateValue}>
                  {appliedRange.startDate
                    ? `${appliedRange.startDate.toLocaleDateString()} - ${
                        appliedRange.endDate?.toLocaleDateString() || ''
                      }`
                    : 'Todos los reportes'}
                </ITText>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <ITText
                variant="labelLarge"
                weight="bold"
                color="#94A3B8"
                style={styles.filterLabel}
              >
                POR CLIENTE
              </ITText>
              <SearchComponent
                label="Cliente"
                placeholder="Todos los clientes"
                options={clients}
                value={tempClientId}
                onSelect={setTempClientId}
              />
            </View>

            <View style={styles.filterGroup}>
              <ITText
                variant="labelLarge"
                weight="bold"
                color="#94A3B8"
                style={styles.filterLabel}
              >
                POR GUARDIA
              </ITText>
              <SearchComponent
                label="Guardia"
                placeholder="Todos los guardias"
                options={guards}
                value={tempGuardId}
                onSelect={setTempGuardId}
              />
            </View>

            <View style={styles.filterGroup}>
              <ITText
                variant="labelLarge"
                weight="bold"
                color="#94A3B8"
                style={styles.filterLabel}
              >
                POR CATEGORÍA
              </ITText>
              <SearchComponent
                label="Categoría"
                placeholder="Todas las categorías"
                options={categories}
                value={tempCategory}
                onSelect={val => {
                  setTempCategory(val);
                  setTempType('ALL');
                }}
              />
            </View>

            {tempCategory !== 'ALL' && (
              <View style={styles.filterGroup}>
                <ITText variant="titleMedium" style={styles.filterLabel}>
                  POR TIPO
                </ITText>
                <SearchComponent
                  label="Tipo de reporte"
                  placeholder="Todos los tipos"
                  options={incidentTypes
                    .filter(t => t.categoryId === tempCategory)
                    .map(t => ({ label: t.name, value: t.id }))}
                  value={tempType}
                  onSelect={setTempType}
                />
              </View>
            )}
          </ScrollView>

          <View
            style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}
          >
            <ITButton
              mode="outlined"
              onPress={handleClearFilters}
              style={styles.footerButton}
              label="Limpiar"
            />
            <ITButton
              mode="contained"
              onPress={handleApplyFilters}
              style={styles.footerButton}
              label="Aplicar Filtros"
            />
          </View>
        </Modal>
      </Portal>

      <DatePickerModal
        locale="es"
        mode="range"
        visible={openDate}
        onDismiss={() => setOpenDate(false)}
        startDate={tempRange.startDate}
        endDate={tempRange.endDate}
        onConfirm={({ startDate, endDate }: any) => {
          setOpenDate(false);
          setTempRange({ startDate, endDate });
        }}
      />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.surfaceVariant,
  },
  pendingCard: {
    backgroundColor: '#FFF5F5', // Rojo suave
    borderColor: '#FEE2E2',
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
  statusIndicator: {
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  idBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  ml12: {
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateValue: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: COLORS.primary,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  clientText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
