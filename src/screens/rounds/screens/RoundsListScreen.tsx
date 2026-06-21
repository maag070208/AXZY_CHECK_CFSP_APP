import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
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
  deleteRound,
  getPaginatedRounds,
  getRoundsUsers,
  IRound,
} from '../service/rounds.service';
import { theme } from '../../../shared/theme/theme';
import { UserRole } from '../../../core/types/IUser';

const getStatusStyle = (item: IRound) => {
  const kardexCount = (item as any)._count?.kardexEntries || 0;
  if (kardexCount === 0) return { bg: '#FEF2F2', dot: '#EF4444', label: 'SIN ACTIVIDAD', variant: 'error' as const };
  if (item.status === 'COMPLETED') return { bg: '#ECFDF5', dot: '#10B981', label: 'COMPLETADA', variant: 'success' as const };
  return { bg: '#FFFBEB', dot: '#F59E0B', label: 'EN CURSO', variant: 'warning' as const };
};

export const RoundsListScreen = ({ navigation, route }: any) => {
  const dispatch = useDispatch();
  const routeClientId = route.params?.clientId;
  const user = useSelector((state: any) => state.userState);
  const token = user.token;

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
  const today = new Date();
  const [appliedDateRange, setAppliedDateRange] = useState<[Date | null, Date | null]>([today, today]);

  const [tempFilters, setTempFilters] = useState<{ guardId?: number }>({});
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([today, today]);
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const [usersCatalog, setUsersCatalog] = useState<
    { label: string; value: number }[]
  >([]);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [roundToStop, setRoundToStop] = useState<number | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        if (appliedDateRange[0] && appliedDateRange[1]) {
          filters.date = [
            dayjs(appliedDateRange[0]).startOf('day').format(),
            dayjs(appliedDateRange[1]).endOf('day').format(),
          ];
        }
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
    [debouncedSearch, appliedFilters, appliedDateRange],
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
    setAppliedDateRange(tempDateRange);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setTempDateRange([null, null]);
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

  const confirmDeleteRound = async () => {
    if (!roundToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteRound(roundToDelete);
      if (res.success) {
        dispatch(showToast({ message: 'Ronda eliminada', type: 'success' }));
        fetchRounds(1);
      } else {
        dispatch(
          showToast({
            message: res?.messages?.[0] || 'Error al eliminar',
            type: 'error',
          }),
        );
      }
    } catch {
      dispatch(showToast({ message: 'Error inesperado', type: 'error' }));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setRoundToDelete(null);
    }
  };

  const renderItem = ({ item }: { item: IRound }) => {
    const statusStyle = getStatusStyle(item);
    const isInProgress = item.status === 'IN_PROGRESS';
    const config =
      (item as any).recurringConfiguration || (item as any).recurringConfig;
    const title = config?.title || item.client?.name || 'Recorrido General';
    const guardName = `${item.guard?.name || ''} ${item.guard?.lastName || ''}`.trim();
    const guardUsername = item.guard?.name || 'S/U';

    return (
      <ITTouchableOpacity
        onPress={() => navigation.navigate('ROUND_DETAIL', { id: item.id })}
        style={styles.cardContainer}
      >
        <View style={[styles.card, { backgroundColor: statusStyle.bg }]}>
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <ITText variant="titleMedium" weight="bold" color="#1E293B">
                {title}
              </ITText>
              <View style={styles.clientRow}>
                <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                <ITText variant="labelSmall" weight="bold" color="#64748B">
                  {item.client?.name || 'SIN CLIENTE'}
                </ITText>
              </View>
            </View>
            <ITBadge
              label={statusStyle.label}
              variant={statusStyle.variant}
              size="small"
            />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.guardRow}>
              <Icon source="shield-account" size={14} color={theme.colors.primary} />
              <ITText variant="bodySmall" weight="bold" color="#334155">
                {guardName}
              </ITText>
              <ITText variant="labelSmall" color="#94A3B8">
                @{guardUsername}
              </ITText>
            </View>

            <View style={styles.timeRow}>
              <Icon source="play-circle-outline" size={14} color="#64748B" />
              <ITText variant="labelSmall" weight="bold" color="#475569" style={styles.mono}>
                {dayjs(item.startTime).format('DD MMM · HH:mm')}
              </ITText>
              {isInProgress ? (
                <View style={styles.liveDot} />
              ) : (
                <Icon source="stop-circle-outline" size={14} color="#64748B" />
              )}
              {isInProgress ? (
                <ITText variant="labelSmall" weight="bold" color="#10B981">
                  En curso
                </ITText>
              ) : item.endTime ? (
                <ITText variant="labelSmall" weight="bold" color="#64748B" style={styles.mono}>
                  {dayjs(item.endTime).format('DD MMM · HH:mm')}
                </ITText>
              ) : null}
            </View>
          </View>

          <View style={styles.cardFooter}>
            {isInProgress && user.role !== UserRole.RESDN ? (
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
            ) : !isInProgress ? (
              <>
                <ITTouchableOpacity
                  style={[styles.footerAction, styles.pdfBtn]}
                  onPress={() => handleSharePDF(item.id)}
                >
                  <Icon source="file-pdf-box" size={16} color="#3B82F6" />
                  <ITText variant="labelSmall" weight="bold" color="#3B82F6">
                    REPORTE
                  </ITText>
                </ITTouchableOpacity>
                <ITTouchableOpacity
                  style={[styles.footerAction, styles.deleteBtn]}
                  onPress={() => {
                    setRoundToDelete(item.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Icon source="trash-can-outline" size={16} color="#EF4444" />
                  <ITText variant="labelSmall" weight="bold" color="#EF4444">
                    ELIMINAR
                  </ITText>
                </ITTouchableOpacity>
              </>
            ) : null}
            <View style={styles.detailsBtn}>
              <ITText variant="labelSmall" color={theme.colors.primary} weight="bold">
                DETALLES
              </ITText>
              <Icon source="chevron-right" size={16} color={theme.colors.primary} />
            </View>
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  const formatDateRange = () => {
    if (!tempDateRange[0] && !tempDateRange[1]) return 'Cualquier fecha';
    if (tempDateRange[0] && !tempDateRange[1]) return dayjs(tempDateRange[0]).format('DD/MM/YYYY');
    if (tempDateRange[0] && tempDateRange[1]) {
      return `${dayjs(tempDateRange[0]).format('DD/MM')} - ${dayjs(tempDateRange[1]).format('DD/MM/YYYY')}`;
    }
    return 'Cualquier fecha';
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Historial de Rondas"
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
            placeholder="Buscar guardia..."
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
              { label: 'TODAS', value: 'all' },
              { label: 'ACTIVAS', value: 'IN_PROGRESS' },
              { label: 'HISTORIAL', value: 'COMPLETED' },
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
            RANGO DE FECHAS
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
              {formatDateRange()}
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
        mode="range"
        visible={openDatePicker}
        onDismiss={() => setOpenDatePicker(false)}
        startDate={tempDateRange[0] || undefined}
        endDate={tempDateRange[1] || undefined}
        onConfirm={params => {
          setOpenDatePicker(false);
          setTempDateRange([params.startDate || null, params.endDate || null]);
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

      <ITAlert
        visible={showDeleteDialog}
        onDismiss={() => {
          setShowDeleteDialog(false);
          setRoundToDelete(null);
        }}
        onConfirm={confirmDeleteRound}
        title="Eliminar Ronda"
        description="Esta acción eliminará el registro de la ronda y todo su historial asociado de forma permanente."
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
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBody: {
    gap: 8,
    marginBottom: 16,
  },
  guardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
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
  deleteBtn: {
    backgroundColor: '#FEF2F2',
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
