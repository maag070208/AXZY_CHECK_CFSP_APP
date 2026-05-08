import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import {
  Avatar,
  Button,
  Card,
  IconButton,
  Text,
  Searchbar,
  Portal,
  Icon,
  Dialog,
} from 'react-native-paper';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';

import {
  getPaginatedRounds,
  IRound,
  getRoundsUsers,
  shareRoundReport,
} from '../service/rounds.service';
import { endRound } from '../../home/service/round.service';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import ModernStyles from '../../../shared/theme/app.styles';
import { theme } from '../../../shared/theme/theme';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import Share from 'react-native-share';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export const RoundsListScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const routeClientId = route.params?.clientId;

  const [rounds, setRounds] = useState<IRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState<{ guardId?: number; clientId?: any }>(
    { clientId: routeClientId },
  );
  const [appliedDate, setAppliedDate] = useState<Date | undefined>(undefined);

  const [tempFilters, setTempFilters] = useState<{ guardId?: number }>({});
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const [usersCatalog, setUsersCatalog] = useState<
    { label: string; value: number }[]
  >([]);
  const lastFetchRef = useRef('');

  const fetchCatalogs = async () => {
    try {
      const res = await getRoundsUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsersCatalog(
          res.data.map(u => ({
            label: u.value, // En catálogos el nombre viene en .value
            value: u.id,
          })),
        );
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  // Debounce search
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

        const finalFilters: any = { ...appliedFilters };
        if (debouncedSearch) finalFilters.search = debouncedSearch;
        if (appliedDate)
          finalFilters.date = dayjs(appliedDate).format('YYYY-MM-DD');

        const res = await getPaginatedRounds({
          page: pageNum,
          limit: 15,
          filters: finalFilters,
        });

        if (res.success && res.data) {
          const data = res.data;
          const newRows = Array.isArray(data.rows)
            ? data.rows
            : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];
          const totalRows =
            typeof data.total === 'number' ? data.total : newRows.length;

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
        setLoadingMore(true); // Wait, loadingMore should be false
        setLoadingMore(false);
      }
    },
    [debouncedSearch, appliedFilters, appliedDate],
  );

  useEffect(() => {
    if (!isFocused) return;
    const currentParams = JSON.stringify({
      debouncedSearch,
      appliedFilters,
      appliedDate,
    });
    if (currentParams === lastFetchRef.current) return;
    lastFetchRef.current = currentParams;
    fetchRounds(1);
  }, [debouncedSearch, appliedFilters, appliedDate, isFocused]);

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
    setAppliedFilters(tempFilters);
    setAppliedDate(tempDate);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setTempDate(undefined);
  };

  const activeFiltersCount = [
    appliedDate ? 1 : 0,
    appliedFilters.guardId ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getStatusInfo = (status: string) => {
    if (status === 'COMPLETED') {
      return { label: 'Finalizada', color: '#10B981', icon: 'check-circle' };
    }
    return { label: 'En curso', color: '#F59E0B', icon: 'clock-outline' };
  };

  const dispatch = useDispatch();
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [roundToStop, setRoundToStop] = useState<string | null>(null);

  const handleStopRound = (roundId: string) => {
    setRoundToStop(roundId);
    setShowStopDialog(true);
  };

  const [sharingId, setSharingId] = useState<string | null>(null);

  const token = useSelector((state: any) => state.userState.token);

  const handleSharePDF = async (roundId: string) => {
    try {
      const url = `${API_CONSTANTS.BASE_URL}/rounds/${roundId}/report?token=${token}`;
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening PDF:', error);
      dispatch(showToast({ message: 'Error al abrir el reporte', type: 'error' }));
    }
  };

  const confirmStopRound = async () => {
    if (!roundToStop) return;
    setStoppingId(roundToStop);
    setShowStopDialog(false);
    try {
      const res = await endRound(roundToStop);
      if (res.success) {
        dispatch(
          showToast({ message: 'Ronda finalizada correctamente', type: 'success' }),
        );
        fetchRounds(1);
      } else {
        dispatch(
          showToast({
            message: 'No se pudo finalizar la ronda',
            type: 'error',
          }),
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setStoppingId(null);
      setRoundToStop(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusInfo = getStatusInfo(item.status);
    const config = item.recurringConfiguration || item.recurringConfig;
    const routeTitle = config?.title || 'Recorrido General';
    const clientName =
      item.client?.name ||
      config?.client?.name ||
      item.guard?.client?.name ||
      'SIN CLIENTE';
    const guardName = `${item.guard?.name || 'N/A'} ${
      item.guard?.lastName || ''
    }`;
    const isInProgress = item.status === 'IN_PROGRESS';

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('ROUND_DETAIL', { id: item.id })}
        elevation={1}
      >
        <View style={styles.cardLayout}>
          <View style={styles.avatarSection}>
            <Avatar.Text
              size={56}
              label={item.guard.name.substring(0, 2).toUpperCase()}
              style={styles.avatar}
              labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
            />
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: statusInfo.color },
              ]}
            />
          </View>

          <View style={styles.infoSection}>
            <View style={styles.cardHeader}>
              <Text style={styles.locationName} numberOfLines={1}>
                {routeTitle}
              </Text>
              <View style={styles.badgeContainer}>
                <Icon
                  source={statusInfo.icon}
                  size={14}
                  color={statusInfo.color}
                />
              </View>
            </View>

            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.guardName}>
              #{item.id.split('-')[0]}... • {guardName}
            </Text>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Icon source="clock-start" size={16} color="#94A3B8" />
                <Text style={styles.detailText}>
                  {dayjs(item.startTime).format('HH:mm')}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Icon source="calendar" size={16} color="#94A3B8" />
                <Text style={styles.detailText}>
                  {dayjs(item.startTime).format('DD/MM/YY')}
                </Text>
              </View>
              {item.endTime && (
                <View style={styles.detailItem}>
                  <Icon source="clock-end" size={16} color="#94A3B8" />
                  <Text style={styles.detailText}>
                    {dayjs(item.endTime).format('HH:mm')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionsRow}>
              {isInProgress && (
                <Button
                  mode="contained"
                  compact
                  onPress={() => handleStopRound(item.id)}
                  loading={stoppingId === item.id}
                  disabled={!!stoppingId}
                  buttonColor="#EF4444"
                  textColor="#FFF"
                  style={styles.actionButton}
                  labelStyle={{ fontSize: 11 }}
                >
                  Detener
                </Button>
              )}
              {item.status === 'COMPLETED' && (
                <Button
                  mode="contained-tonal"
                  compact
                  icon="file-pdf-box"
                  onPress={() => handleSharePDF(item.id)}
                  loading={sharingId === item.id}
                  disabled={!!sharingId}
                  buttonColor="#EFF6FF"
                  textColor="#3B82F6"
                  style={styles.actionButton}
                  labelStyle={{ fontSize: 11 }}
                >
                  Generar PDF
                </Button>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={ModernStyles.screenContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header Plano Estilo Kardex Premium */}
      <View style={[styles.header]}>
        {/* Top Context Row */}

        {/* Main Title Row */}
        <View style={styles.headerMainRow}>
          <View>
            <Text style={styles.headerTitleLarge}>Recorridos</Text>
            <Text style={styles.headerSubtitleText}>
              {total} registros encontrados
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filterButtonCircle}
          >
            <Icon
              source={activeFiltersCount > 0 ? 'filter' : 'filter-variant'}
              size={22}
              color="#1E293B"
            />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadgeSmall}>
                <Text style={styles.filterBadgeTextSmall}>
                  {activeFiltersCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Searchbar
          placeholder="Buscar recorrido..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBarModern}
          inputStyle={styles.searchInputModern}
          iconColor={theme.colors.primary}
          placeholderTextColor="#94A3B8"
          elevation={0}
        />
      </View>

      <FlatList
        data={rounds}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListFooterComponent={() =>
          loadingMore ? (
            <ActivityIndicator
              style={{ marginVertical: 20 }}
              color={theme.colors.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon source="clipboard-text-clock" size={80} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>No hay recorridos</Text>
              <Text style={styles.emptySubtitle}>
                No se encontraron resultados para tu búsqueda.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Modal de Filtros Nativo Full Screen */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalFullScreen}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeaderTitle}>
              <Icon
                source="filter-variant"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.modalTitle}>Filtros de Recorridos</Text>
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
              <Text style={styles.filterLabel}>POR FECHA</Text>
              <TouchableOpacity
                onPress={() => setOpenDatePicker(true)}
                style={styles.dateSelector}
              >
                <Icon
                  source="calendar-range"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.dateValue}>
                  {tempDate ? tempDate.toLocaleDateString() : 'Cualquier fecha'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>POR GUARDIA</Text>
              <SearchComponent
                label="Guardia"
                placeholder="Seleccionar guardia"
                options={usersCatalog}
                value={tempFilters.guardId}
                onSelect={val =>
                  setTempFilters({
                    ...tempFilters,
                    guardId: val ? Number(val) : undefined,
                  })
                }
              />
            </View>
          </ScrollView>

          <View
            style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}
          >
            <Button
              mode="outlined"
              onPress={handleClearFilters}
              style={styles.footerButton}
              textColor="#64748B"
            >
              Limpiar
            </Button>
            <Button
              mode="contained"
              onPress={handleApplyFilters}
              style={[
                styles.footerButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              Aplicar Filtros
            </Button>
          </View>
        </View>
      </Modal>

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

      <Portal>
        <Dialog
          visible={showStopDialog}
          onDismiss={() => setShowStopDialog(false)}
          style={styles.stopDialog}
        >
          <Dialog.Title style={styles.stopDialogTitle}>Detener Ronda</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.stopDialogContent}>
              ¿Estás seguro que deseas finalizar esta ronda? Esta acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.stopDialogActions}>
            <Button 
              onPress={() => setShowStopDialog(false)} 
              textColor="#64748B"
              style={styles.stopDialogButton}
            >
              Cancelar
            </Button>
            <Button 
              mode="contained"
              onPress={confirmStopRound} 
              buttonColor="#EF4444"
              style={[styles.stopDialogButton, styles.stopDialogConfirm]}
            >
              Finalizar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContextTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitleLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  headerSubtitleText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  filterButtonCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBarModern: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 50,
  },
  searchInputModern: {
    minHeight: 0,
    fontSize: 16,
    color: '#1E293B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardLayout: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoSection: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  guardName: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  // Modal Styles
  modalFullScreen: {
    backgroundColor: 'white',
    flex: 1,
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
  stopDialog: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
  },
  stopDialogTitle: {
    textAlign: 'center',
    fontWeight: '800',
    color: '#1E293B',
    fontSize: 22,
  },
  stopDialogContent: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    lineHeight: 24,
  },
  stopDialogActions: {
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  stopDialogButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
  stopDialogConfirm: {
    elevation: 0,
  },
});
