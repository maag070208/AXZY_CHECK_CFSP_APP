import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { ITScreensFiltersModal } from '../../../shared/components/ITScreensFiltersModal';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getCatalog } from '../../../shared/service/catalog.service';
import { getPaginatedMaintenances } from '../service/maintenance.service';
import { theme } from '../../../shared/theme/theme';

export const MaintenanceListScreen = () => {
  const insets = useSafeAreaInsets();
  const { navigateToScreen } = useAppNavigation();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();

  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Catalogs
  const [guards, setGuards] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [appliedRange, setAppliedRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });
  const [appliedGuardId, setAppliedGuardId] = useState<number | string>('ALL');
  const [appliedCategory, setAppliedCategory] = useState<string>('ALL');
  const [appliedClientId, setAppliedClientId] = useState<number | string>(
    'ALL',
  );

  const [tempRange, setTempRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });
  const [tempGuardId, setTempGuardId] = useState<number | string>('ALL');
  const [tempCategory, setTempCategory] = useState<string>('ALL');
  const [tempClientId, setTempClientId] = useState<number | string>('ALL');

  const [openDate, setOpenDate] = useState(false);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [guardsRes, clientsRes, catRes] = await Promise.all([
          getCatalog('guard'),
          getCatalog('client'),
          getCatalog('incident_category'),
        ]);
        if (guardsRes.success) {
          setGuards(
            guardsRes.data.map((g: any) => ({ label: g.value, value: g.id })),
          );
        }
        if (clientsRes.success) {
          setClients(
            clientsRes.data.map((c: any) => ({
              label: c.name || c.value,
              value: c.id,
            })),
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
      } catch (error) {
        console.error('Error fetching catalogs:', error);
      }
    };
    fetchCatalogs();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMaintenances = useCallback(
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
        if (appliedClientId !== 'ALL') filters.clientId = appliedClientId;
        if (appliedRange.startDate) filters.startDate = appliedRange.startDate;
        if (appliedRange.endDate) filters.endDate = appliedRange.endDate;

        const res = await getPaginatedMaintenances({
          page: pageNum,
          limit: 15,
          filters,
        });

        if (res.success && res.data) {
          const newRows = res.data.rows || [];
          const totalRows = res.data.total || 0;

          setMaintenances(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching maintenances:', error);
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
      appliedClientId,
      appliedRange,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      fetchMaintenances(1);
    }, [fetchMaintenances]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaintenances(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchMaintenances(page + 1);
    }
  };

  const handleApplyFilters = () => {
    setAppliedRange(tempRange);
    setAppliedGuardId(tempGuardId);
    setAppliedCategory(tempCategory);
    setAppliedClientId(tempClientId);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempRange({ startDate: undefined, endDate: undefined });
    setTempGuardId('ALL');
    setTempCategory('ALL');
    setTempClientId('ALL');
  };

  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find(c => c.value === categoryId);
    return cat || { label: 'Mantenimiento', color: '#64748B', icon: 'wrench' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const catInfo = getCategoryInfo(item.categoryId);
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const isPending = item.status === 'PENDING' || !item.status;

    return (
      <ITTouchableOpacity
        onPress={() =>
          navigateToScreen('MAINTENANCE_STACK', 'MAINTENANCE_DETAIL', {
            maintenance: item,
          })
        }
      >
        <View style={[styles.card, isPending && styles.cardPending]}>
          {/* Header: Icon + Status + Title */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Icon
                  source={catInfo.icon || 'wrench'}
                  size={22}
                  color={catInfo.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ITText
                  variant="titleSmall"
                  weight="bold"
                  style={styles.cardTitle}
                  numberOfLines={1}
                >
                  {item.title}
                </ITText>
                <View style={styles.headerMeta}>
                  <View style={styles.metaChip}>
                    <Icon source="clock-outline" size={10} color="#64748B" />
                    <ITText variant="labelSmall" style={styles.metaChipText}>
                      {timeStr}
                    </ITText>
                  </View>
                  <View style={styles.metaChip}>
                    <Icon source="calendar" size={10} color="#64748B" />
                    <ITText variant="labelSmall" style={styles.metaChipText}>
                      {formattedDate}
                    </ITText>
                  </View>
                </View>
              </View>
            </View>

            <ITBadge
              label={isPending ? 'Pendiente' : 'Atendido'}
              variant={isPending ? 'warning' : 'success'}
              size="small"
              dot={isPending}
            />
          </View>

          {/* Body: Category chip */}
          <View style={styles.cardBody}>
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: catInfo.color + '10' },
              ]}
            >
              <Icon source={catInfo.icon} size={12} color={catInfo.color} />
              <ITText
                variant="labelSmall"
                style={[styles.categoryChipText, { color: catInfo.color }]}
              >
                {catInfo.label}
              </ITText>
            </View>
          </View>

          {/* Footer: Client & Guard info */}
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={styles.footerIconBox}>
                <Icon
                  source="office-building"
                  size={12}
                  color={theme.colors.primary}
                />
              </View>
              <ITText
                variant="labelSmall"
                style={styles.footerText}
                numberOfLines={1}
              >
                {item.client?.name || 'Sin cliente'}
              </ITText>
            </View>

            <View style={styles.footerSeparator} />

            <View style={styles.footerItem}>
              <View style={styles.footerIconBox}>
                <Icon
                  source="shield-account"
                  size={12}
                  color={theme.colors.primary}
                />
              </View>
              <ITText
                variant="labelSmall"
                style={styles.footerText}
                numberOfLines={1}
              >
                {item.guard?.name || 'Sin guardia'}
              </ITText>
            </View>
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Mantenimientos"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        onFilterPress={() => setShowFilters(true)}
        showSearchBar={true}
        searchBar={
          <Searchbar
            placeholder="Buscar mantenimiento..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        }
        data={maintenances}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        fab={
          user.role === UserRole.ADMIN && isFocused ? (
            <FAB
              icon="plus"
              style={styles.fab}
              onPress={() =>
                navigateToScreen('MAINTENANCE_STACK', 'MAINTENANCE_REPORT')
              }
              color="#FFFFFF"
            />
          ) : undefined
        }
      />

      <ITScreensFiltersModal
        visible={showFilters}
        onDismiss={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      >
        <View style={styles.filterGroup}>
          <ITText variant="labelLarge" weight="bold" style={styles.filterLabel}>
            FECHA DE REPORTE
          </ITText>
          <ITTouchableOpacity
            onPress={() => setOpenDate(true)}
            style={styles.dateSelector}
          >
            <Icon
              source="calendar-range"
              size={20}
              color={theme.colors.primary}
            />
            <ITText variant="bodyMedium" style={styles.dateSelectorText}>
              {tempRange.startDate
                ? `${tempRange.startDate.toLocaleDateString()} - ${
                    tempRange.endDate?.toLocaleDateString() || ''
                  }`
                : 'Cualquier fecha'}
            </ITText>
          </ITTouchableOpacity>
        </View>

        <View style={styles.filterGroup}>
          <SearchComponent
            label="Cliente"
            placeholder="Todos los clientes"
            options={clients}
            value={tempClientId}
            onSelect={setTempClientId}
          />
        </View>

        <View style={styles.filterGroup}>
          <SearchComponent
            label="Guardia"
            placeholder="Todos los guardias"
            options={guards}
            value={tempGuardId}
            onSelect={setTempGuardId}
          />
        </View>

        <View style={styles.filterGroup}>
          <SearchComponent
            label="Categoría"
            placeholder="Todas las categorías"
            options={categories}
            value={tempCategory}
            onSelect={setTempCategory}
          />
        </View>
      </ITScreensFiltersModal>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
    color: '#0F172A',
  },
  // Modern Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  cardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 15,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    color: '#64748B',
    fontSize: 10,
  },
  cardBody: {
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    flex: 1,
  },
  footerSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  // Filter Styles
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    color: '#94A3B8',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  dateSelectorText: {
    color: '#334155',
    fontSize: 14,
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
