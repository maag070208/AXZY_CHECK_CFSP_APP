import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Icon, Searchbar } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useDispatch, useSelector } from 'react-redux';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITAlert,
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { ITScreensFiltersModal } from '../../../shared/components/ITScreensFiltersModal';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { endRound } from '../../home/service/round.service';
import {
  getPaginatedRounds,
  getRoundsUsers,
  IRound,
} from '../service/rounds.service';
import { theme } from '../../../shared/theme/theme';

export const RoundsListScreen = ({ navigation, route }: any) => {
  const dispatch = useDispatch();
  const routeClientId = route.params?.clientId;
  const token = useSelector((state: any) => state.userState.token);

  const [rounds, setRounds] = useState<IRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState<{
    guardId?: number;
    clientId?: any;
    status?: string;
  }>({ clientId: routeClientId, status: 'all' });
  const [appliedDate, setAppliedDate] = useState<Date | undefined>(undefined);

  const [tempFilters, setTempFilters] = useState<{ guardId?: number }>({});
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const [usersCatalog, setUsersCatalog] = useState<
    { label: string; value: number }[]
  >([]);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [roundToStop, setRoundToStop] = useState<number | null>(null);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await getRoundsUsers();
        if (res.success && Array.isArray(res.data)) {
          setUsersCatalog(
            res.data.map(u => ({
              label: u.value,
              value: u.id,
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

  const fetchRounds = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefreshing) setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const filters: any = { ...appliedFilters };
        if (debouncedSearch) filters.search = debouncedSearch;
        if (appliedDate) filters.date = dayjs(appliedDate).format('YYYY-MM-DD');
        if (filters.status === 'all') delete filters.status;

        const res = await getPaginatedRounds({
          page: pageNum,
          limit: 15,
          filters,
        });

        if (res.success && res.data) {
          const data = res.data;
          const newRows = data.rows || data.data || [];
          const totalRows = data.total || newRows.length;

          setRounds(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching rounds:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, appliedFilters, appliedDate],
  );

  useEffect(() => {
    fetchRounds(1);
  }, [fetchRounds]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRounds(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && rounds.length > 0) {
      fetchRounds(page + 1);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(prev => ({ ...prev, ...tempFilters }));
    setAppliedDate(tempDate);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setTempDate(undefined);
  };

  const handleSharePDF = (roundId: number) => {
    const url = `${API_CONSTANTS.BASE_URL}/rounds/${roundId}/report?token=${token}`;
    Linking.openURL(url).catch(err => {
      dispatch(showToast({ message: 'Error al abrir reporte', type: 'error' }));
    });
  };

  const confirmStopRound = async () => {
    if (!roundToStop) return;
    setStoppingId(roundToStop);
    setShowStopDialog(false);
    try {
      const res = await endRound(roundToStop.toString());
      if (res.success) {
        dispatch(showToast({ message: 'Ronda finalizada', type: 'success' }));
        fetchRounds(1);
      } else {
        dispatch(showToast({ message: 'Error al finalizar', type: 'error' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error inesperado', type: 'error' }));
    } finally {
      setStoppingId(null);
      setRoundToStop(null);
    }
  };

  const renderItem = ({ item }: { item: IRound }) => {
    const isInProgress = item.status === 'IN_PROGRESS';
    const config =
      (item as any).recurringConfiguration || (item as any).recurringConfig;
    const title = config?.title || 'Recorrido General';
    const guardName = `${item.guard?.name || ''} ${item.guard?.lastName || ''}`;

    return (
      <ITTouchableOpacity
        onPress={() => navigation.navigate('ROUND_DETAIL', { id: item.id })}
        style={styles.cardContainer}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <ITText variant="titleMedium" weight="bold" color="#0F172A">
                {title}
              </ITText>
              <ITText
                variant="labelSmall"
                color="#64748B"
                style={styles.idText}
              >
                ID: {item.id.toString().split('-')[0]}
              </ITText>
            </View>
            <ITBadge
              label={isInProgress ? 'En curso' : 'Completado'}
              variant={isInProgress ? 'warning' : 'success'}
              size="small"
              dot={isInProgress}
            />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon
                  source="shield-account"
                  size={14}
                  color={theme.colors.primary}
                />
                <ITText variant="bodySmall" color="#475569" weight="medium">
                  {guardName}
                </ITText>
              </View>
              <View style={styles.infoItem}>
                <Icon
                  source="office-building"
                  size={14}
                  color={theme.colors.primary}
                />
                <ITText
                  variant="bodySmall"
                  color="#475569"
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {item.client?.name || 'S/C'}
                </ITText>
              </View>
            </View>

            <View style={styles.timeContainer}>
              <View style={styles.timeBox}>
                <Icon source="clock-start" size={14} color="#64748B" />
                <ITText variant="labelSmall" color="#64748B">
                  {dayjs(item.startTime).format('HH:mm')} •{' '}
                  {dayjs(item.startTime).format('DD/MM')}
                </ITText>
              </View>
              {item.endTime && (
                <View style={styles.timeBox}>
                  <Icon source="clock-end" size={14} color="#64748B" />
                  <ITText variant="labelSmall" color="#64748B">
                    {dayjs(item.endTime).format('HH:mm')}
                  </ITText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardFooter}>
            {isInProgress ? (
              <ITTouchableOpacity
                style={[styles.footerAction, styles.stopBtn]}
                onPress={() => {
                  setRoundToStop(item.id);
                  setShowStopDialog(true);
                }}
                disabled={stoppingId === item.id}
              >
                <Icon source="stop-circle-outline" size={16} color="#EF4444" />
                <ITText variant="labelSmall" weight="bold" color="#EF4444">
                  DETENER
                </ITText>
              </ITTouchableOpacity>
            ) : (
              <ITTouchableOpacity
                style={[styles.footerAction, styles.pdfBtn]}
                onPress={() => handleSharePDF(item.id)}
              >
                <Icon source="file-pdf-box" size={16} color="#3B82F6" />
                <ITText variant="labelSmall" weight="bold" color="#3B82F6">
                  VER REPORTE
                </ITText>
              </ITTouchableOpacity>
            )}
            <View style={styles.detailsBtn}>
              <ITText
                variant="labelSmall"
                color={theme.colors.primary}
                weight="bold"
              >
                DETALLES
              </ITText>
              <Icon
                source="chevron-right"
                size={16}
                color={theme.colors.primary}
              />
            </View>
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Control de Recorridos"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        showSearchBar={true}
        onFilterPress={() => setShowFilters(true)}
        searchBar={
          <Searchbar
            placeholder="Buscar recorrido..."
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
          <View style={styles.badgesRow}>
            {[
              { label: 'Todos', value: 'all' },
              { label: 'En curso', value: 'IN_PROGRESS' },
              { label: 'Completados', value: 'COMPLETED' },
            ].map(f => (
              <ITTouchableOpacity
                key={f.value}
                onPress={() =>
                  setAppliedFilters(prev => ({ ...prev, status: f.value }))
                }
              >
                <ITBadge
                  label={f.label}
                  variant={
                    appliedFilters.status === f.value ? 'primary' : 'surface'
                  }
                  outline={appliedFilters.status !== f.value}
                />
              </ITTouchableOpacity>
            ))}
          </View>
        }
        data={rounds}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
      />

      <ITScreensFiltersModal
        visible={showFilters}
        onDismiss={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      >
        <View style={styles.filterGroup}>
          <ITText
            variant="labelLarge"
            weight="bold"
            color="#94A3B8"
            style={styles.filterLabel}
          >
            FECHA DE INICIO
          </ITText>
          <ITTouchableOpacity
            onPress={() => setOpenDatePicker(true)}
            style={styles.dateSelector}
          >
            <Icon
              source="calendar-range"
              size={20}
              color={theme.colors.primary}
            />
            <ITText variant="bodyMedium" color="#334155">
              {tempDate ? tempDate.toLocaleDateString() : 'Cualquier fecha'}
            </ITText>
          </ITTouchableOpacity>
        </View>

        <View style={styles.filterGroup}>
          <SearchComponent
            label="Guardia"
            placeholder="Todos los guardias"
            options={usersCatalog}
            value={tempFilters.guardId}
            onSelect={val =>
              setTempFilters(prev => ({
                ...prev,
                guardId: val ? Number(val) : undefined,
              }))
            }
          />
        </View>
      </ITScreensFiltersModal>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDatePicker}
        onDismiss={() => setOpenDatePicker(false)}
        date={tempDate}
        onConfirm={params => {
          setOpenDatePicker(false);
          setTempDate(params.date);
        }}
      />

      <ITAlert
        visible={showStopDialog}
        onDismiss={() => setShowStopDialog(false)}
        onConfirm={confirmStopRound}
        title="Finalizar Ronda"
        description="¿Estás seguro de que deseas finalizar esta ronda? Se guardará el progreso actual."
        confirmLabel="Finalizar"
        type="alert"
        loading={stoppingId !== null}
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
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 48,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
    color: '#0F172A',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  idText: {
    marginTop: 2,
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    gap: 16,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  stopBtn: {
    backgroundColor: '#FEF2F2',
  },
  pdfBtn: {
    backgroundColor: '#EFF6FF',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
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
});
