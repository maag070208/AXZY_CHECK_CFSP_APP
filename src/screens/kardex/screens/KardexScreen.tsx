import { useIsFocused, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, IconButton, Searchbar } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ITButton,
  ITCard,
  ITScreenWrapper,
  ITText,
} from '../../../shared/components';
import { SearchComponent } from '../../../shared/components/SearchComponent';
import { getCatalog } from '../../../shared/service/catalog.service';
import { theme } from '../../../shared/theme/theme';
import { COLORS } from '../../../shared/utils/constants';
import { getLocations } from '../../locations/service/location.service';
import {
  getPaginatedKardex,
  IKardexEntry,
  IKardexFilter,
} from '../service/kardex.service';

export const KardexScreen = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<IKardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Catalogs
  const [usersCatalog, setUsersCatalog] = useState<
    { label: string; value: number }[]
  >([]);
  const [locationsCatalog, setLocationsCatalog] = useState<
    { label: string; value: number }[]
  >([]);
  const [clientsCatalog, setClientsCatalog] = useState<
    { label: string; value: number }[]
  >([]);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openDate, setOpenDate] = useState(false);

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState<IKardexFilter>({});
  const [appliedRange, setAppliedRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });

  // Temp Filters (Modal)
  const [tempFilters, setTempFilters] = useState<IKardexFilter>({});
  const [tempRange, setTempRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({ startDate: undefined, endDate: undefined });

  const fetchCatalogs = async () => {
    try {
      const [uRes, lRes, cRes] = await Promise.all([
        getCatalog('guard'),
        getLocations(),
        getCatalog('client'),
      ]);

      if (uRes.success && Array.isArray(uRes.data)) {
        setUsersCatalog(
          uRes.data.map((u: any) => ({
            label: u.value,
            value: u.id,
          })),
        );
      }

      if (lRes.success && Array.isArray(lRes.data)) {
        setLocationsCatalog(
          lRes.data.map((l: any) => ({
            label: l.name,
            value: l.id,
          })),
        );
      }

      if (cRes.success && Array.isArray(cRes.data)) {
        setClientsCatalog(
          cRes.data.map((c: any) => ({
            label: c.value,
            value: c.id,
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

  const fetchKardex = useCallback(
    async (pageNum: number, isRefreshing = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefreshing) setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const finalFilters: any = { ...appliedFilters };
        if (appliedRange.startDate)
          finalFilters.startDate = dayjs(appliedRange.startDate).format(
            'YYYY-MM-DD',
          );
        if (appliedRange.endDate)
          finalFilters.endDate = dayjs(appliedRange.endDate).format(
            'YYYY-MM-DD',
          );

        const res = await getPaginatedKardex({
          page: pageNum,
          limit: 15,
          search: debouncedSearch,
          filters: finalFilters,
        });

        if (res.success && res.data) {
          const data = res.data;
          const newRows: IKardexEntry[] = Array.isArray(data.rows)
            ? data.rows
            : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];

          const totalRows =
            typeof data.total === 'number' ? data.total : newRows.length;

          setEntries(prev => {
            if (pageNum === 1) {
              // Si es la página 1, simplemente limpiamos duplicados de la nueva carga
              return newRows.filter(
                (item, index, self) =>
                  self.findIndex(t => t.id === item.id) === index,
              );
            } else {
              // Si es carga de más páginas, evitamos duplicar los que ya están en el estado anterior
              const existingIds = new Set(prev.map(p => p.id));
              const uniqueNewRows = newRows.filter(
                nr => !existingIds.has(nr.id),
              );
              return [...prev, ...uniqueNewRows];
            }
          });

          setTotal(totalRows);
          setPage(pageNum);
          // La lógica de hasMore debe basarse en el total reportado por el servidor
          setHasMore(pageNum * 15 < totalRows);
        }
      } catch (error) {
        console.error('Error fetching kardex:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [appliedFilters, appliedRange, debouncedSearch],
  );

  const lastFetchRef = useRef('');

  useEffect(() => {
    if (!isFocused) return;

    const currentParams = JSON.stringify({
      debouncedSearch,
      appliedFilters,
      appliedRange,
    });
    if (currentParams === lastFetchRef.current) return;

    lastFetchRef.current = currentParams;
    fetchKardex(1);
  }, [debouncedSearch, appliedFilters, appliedRange, isFocused, fetchKardex]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchKardex(1, true);
  };

  const handleLoadMore = () => {
    // Evitamos disparar múltiples veces si ya está cargando o no hay más
    if (!loading && !loadingMore && hasMore) {
      fetchKardex(page + 1);
    }
  };

  const handleOpenFilters = () => {
    setTempFilters(appliedFilters);
    setTempRange(appliedRange);
    setShowFilters(true);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(tempFilters);
    setAppliedRange(tempRange);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setTempRange({ startDate: undefined, endDate: undefined });
  };

  const activeFiltersCount = [
    appliedRange.startDate ? 1 : 0,
    appliedFilters.userId ? 1 : 0,
    appliedFilters.locationId ? 1 : 0,
    appliedFilters.clientId ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getScanTypeInfo = (type: string) => {
    switch (type) {
      case 'RECURRING':
        return { label: 'Ronda', color: '#3B82F6', icon: 'repeat' };
      case 'ASSIGNMENT':
        return {
          label: 'Asignación',
          color: theme.colors.primary,
          icon: 'clipboard-check',
        };
      case 'FREE':
        return { label: 'Libre', color: '#10B981', icon: 'clock-outline' };
      default:
        return { label: 'General', color: '#64748B', icon: 'file-document' };
    }
  };

  const renderItem = ({ item }: { item: IKardexEntry }) => {
    const scanInfo = getScanTypeInfo(item.scanType);
    const mediaCount = item.media?.length || 0;
    const isValidated = item.assignment?.status === 'REVIEWED';

    return (
      <ITCard
        style={styles.card}
        onPress={() => navigation.navigate('KARDEX_DETAIL', { item })}
      >
        <View style={styles.cardLayout}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <ITText
                variant="bodyLarge"
                weight="bold"
                color={theme.colors.outline}
              >
                {item.user?.username?.substring(0, 2).toUpperCase() || 'U'}
              </ITText>
            </View>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isValidated ? COLORS.emerald : '#F59E0B' },
              ]}
            >
              <Icon
                source={isValidated ? 'check' : 'clock-outline'}
                size={10}
                color="#fff"
              />
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <View
                style={[
                  styles.scanBadge,
                  { backgroundColor: scanInfo.color + '15' },
                ]}
              >
                <Icon source={scanInfo.icon} size={12} color={scanInfo.color} />
                <ITText
                  variant="labelSmall"
                  weight="bold"
                  color={scanInfo.color}
                  style={styles.scanBadgeText}
                >
                  {scanInfo.label}
                </ITText>
              </View>
            </View>

            <ITText
              variant="titleMedium"
              weight="bold"
              numberOfLines={1}
              style={styles.locationTitle}
            >
              {item.location?.name || 'Ubicación desconocida'}
            </ITText>

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Icon
                  source="account-outline"
                  size={14}
                  color={theme.colors.outline}
                />
                <ITText
                  variant="bodySmall"
                  color={theme.colors.onSurfaceVariant}
                  numberOfLines={1}
                  style={styles.detailText}
                >
                  {item.user?.name}
                </ITText>
              </View>
              <View style={[styles.detailItem, styles.ml12]}>
                <Icon
                  source="calendar-outline"
                  size={14}
                  color={theme.colors.outline}
                />
                <ITText
                  variant="bodySmall"
                  color={theme.colors.onSurfaceVariant}
                  style={styles.detailText}
                >
                  {dayjs(item.timestamp).format('HH:mm')}
                </ITText>
              </View>
              {mediaCount > 0 && (
                <View style={[styles.detailItem, styles.ml12]}>
                  <Icon source="camera-outline" size={14} color="#3B82F6" />
                  <ITText
                    variant="bodySmall"
                    weight="bold"
                    color="#3B82F6"
                    style={styles.detailText}
                  >
                    {mediaCount}
                  </ITText>
                </View>
              )}
            </View>
          </View>

          <Icon
            source="chevron-right"
            color={theme.colors.outlineVariant}
            size={24}
          />
        </View>
      </ITCard>
    );
  };

  // Borrar filteredEntries redundante y lógica de normalización

  return (
    <ITScreenWrapper padding={false} style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ITText
              variant="headlineSmall"
              weight="bold"
              style={styles.headerTitle}
            >
              Kardex
            </ITText>
            <ITText
              variant="bodySmall"
              color={theme.colors.onSurfaceVariant}
              style={styles.headerSubtitle}
            >
              {total} reportes registrados
            </ITText>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="filter-variant"
              mode="contained"
              containerColor={
                activeFiltersCount > 0
                  ? COLORS.emerald
                  : theme.colors.surfaceVariant
              }
              iconColor={
                activeFiltersCount > 0 ? '#FFFFFF' : theme.colors.outline
              }
              onPress={handleOpenFilters}
            />
          </View>
        </View>

        <View style={styles.headerSearch}>
          <Searchbar
            placeholder="Buscar por folio, guardia o ubicación..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.outline}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.clientsScroll}
        >
          <TouchableOpacity
            style={[
              styles.clientBadge,
              !appliedFilters.clientId && styles.clientBadgeActive,
            ]}
            onPress={() => {
              setAppliedFilters(prev => ({ ...prev, clientId: undefined }));
              setPage(1);
            }}
          >
            <ITText
              variant="labelMedium"
              weight="bold"
              color={
                !appliedFilters.clientId ? '#FFFFFF' : theme.colors.outline
              }
            >
              Todos
            </ITText>
          </TouchableOpacity>
          {clientsCatalog.map(client => {
            const isActive = appliedFilters.clientId === String(client.value);
            return (
              <TouchableOpacity
                key={client.value}
                style={[
                  styles.clientBadge,
                  isActive && styles.clientBadgeActive,
                ]}
                onPress={() => {
                  setAppliedFilters(prev => ({
                    ...prev,
                    clientId: String(client.value),
                  }));
                  setPage(1);
                }}
              >
                <ITText
                  variant="labelMedium"
                  weight="bold"
                  color={isActive ? '#FFFFFF' : theme.colors.outline}
                >
                  {client.label}
                </ITText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        // Usamos una combinación de ID y timestamp por si acaso hay duplicados de ID reales (no recomendado)
        keyExtractor={item => `kardex-${item.id}-${item.timestamp}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.emerald]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon
                source="file-document-outline"
                size={64}
                color={theme.colors.outlineVariant}
              />
              <ITText
                variant="titleMedium"
                color={theme.colors.outline}
                style={styles.emptyText}
              >
                No se encontraron reportes
              </ITText>
              <ITButton
                label="Actualizar lista"
                mode="text"
                onPress={() => fetchKardex(1)}
                textColor={COLORS.emerald}
              />
            </View>
          ) : null
        }
      />

      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalFullScreen}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.modalHeaderTitle}>
              <Icon source="filter-variant" size={24} color={COLORS.emerald} />
              <ITText
                variant="titleLarge"
                weight="bold"
                style={styles.modalTitle}
              >
                Filtros de Kardex
              </ITText>
            </View>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowFilters(false)}
              iconColor={theme.colors.outline}
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
                color={theme.colors.outline}
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
                  color={COLORS.emerald}
                />
                <ITText
                  variant="bodyMedium"
                  weight="bold"
                  color={theme.colors.onSurface}
                  style={styles.dateValue}
                >
                  {tempRange.startDate
                    ? `${dayjs(tempRange.startDate).format('DD/MM/YYYY')} - ${
                        tempRange.endDate
                          ? dayjs(tempRange.endDate).format('DD/MM/YYYY')
                          : ''
                      }`
                    : 'Todos los reportes'}
                </ITText>
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <ITText
                variant="labelSmall"
                weight="bold"
                color={theme.colors.outline}
                style={styles.filterLabel}
              >
                POR GUARDIA
              </ITText>
              <SearchComponent
                label="Guardia"
                placeholder="Seleccionar guardia"
                options={usersCatalog}
                value={tempFilters.userId}
                onSelect={val =>
                  setTempFilters({
                    ...tempFilters,
                    userId: val ? Number(val) : undefined,
                  })
                }
              />
            </View>

            <View style={styles.filterGroup}>
              <ITText
                variant="labelSmall"
                weight="bold"
                color={theme.colors.outline}
                style={styles.filterLabel}
              >
                POR UBICACIÓN
              </ITText>
              <SearchComponent
                label="Ubicación"
                placeholder="Seleccionar ubicación"
                options={locationsCatalog}
                value={tempFilters.locationId}
                onSelect={val =>
                  setTempFilters({
                    ...tempFilters,
                    locationId: val ? Number(val) : undefined,
                  })
                }
              />
            </View>

            <View style={styles.filterGroup}>
              <ITText
                variant="labelSmall"
                weight="bold"
                color={theme.colors.outline}
                style={styles.filterLabel}
              >
                POR CLIENTE
              </ITText>
              <SearchComponent
                label="Cliente"
                placeholder="Seleccionar cliente"
                options={clientsCatalog}
                value={tempFilters.clientId}
                onSelect={val =>
                  setTempFilters({
                    ...tempFilters,
                    clientId: val ? String(val) : undefined,
                  })
                }
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
              textColor={theme.colors.outline}
            />
            <ITButton
              label="Aplicar Filtros"
              onPress={handleApplyFilters}
              style={styles.footerButton}
              backgroundColor={COLORS.emerald}
            />
          </View>
        </View>
      </Modal>

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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerSearch: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
  },
  clientsScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  clientBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clientBadgeActive: {
    backgroundColor: COLORS.emerald,
    borderColor: COLORS.emerald,
  },
  headerTitle: {
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 0,
    marginBottom: 8,
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
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
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
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  scanBadgeText: {
    textTransform: 'uppercase',
  },
  locationTitle: {
    color: theme.colors.onSurface,
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
  detailText: {},
  ml12: {
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: 12,
  },
  emptyText: {
    fontWeight: '500',
  },
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
    color: theme.colors.onSurface,
  },
  modalScroll: {
    padding: 24,
  },
  filterGroup: {
    marginBottom: 32,
  },
  filterLabel: {
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  dateValue: {},
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
  },
});
