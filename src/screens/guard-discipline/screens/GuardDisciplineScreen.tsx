import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import {
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { GuardDisciplineFormModal } from '../components/GuardDisciplineFormModal';
import { IGuardDiscipline, getPaginatedDisciplines } from '../service/GuardDisciplineService';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Tijuana';

export const GuardDisciplineScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [records, setRecords] = useState<IGuardDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefresh) setLoading(true);
        } else {
          setLoadingMore(true);
        }
        const res = await getPaginatedDisciplines({
          page: pageNum,
          limit: 15,
          filters: search ? { search } : {},
          sort: { key: 'createdAt', direction: 'desc' },
        });
        if (res.success && res.data) {
          const rows = res.data.rows || [];
          setRecords(prev => (pageNum === 1 ? rows : [...prev, ...rows]));
          setTotal(res.data.total || 0);
          setHasMore(rows.length === 15);
        }
      } catch (_) {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchData(1);
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchData(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'PENDIENTE', variant: 'warning' as const, dot: true };
      case 'RESOLVED':
        return { label: 'RESUELTO', variant: 'success' as const, dot: false };
      case 'DISMISSED':
        return { label: 'DESESTIMADO', variant: 'error' as const, dot: false };
      default:
        return { label: status, variant: 'default' as const, dot: false };
    }
  };

  const renderItem = ({ item }: { item: IGuardDiscipline }) => {
    const badge = getStatusBadge(item.status);
    const isPending = item.status === 'PENDING';
    const date = dayjs(item.createdAt).tz(TZ);
    const formattedDate = date.format('DD MMM');
    const timeStr = date.format('HH:mm');

    return (
      <ITTouchableOpacity
        onPress={() =>
          navigation.navigate('GUARD_DISCIPLINE_DETAIL', { record: item })
        }
      >
          <View style={[styles.card, isPending && styles.cardPending]}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: (item.category?.color || (isPending ? '#FEF3C7' : '#F8FAFC')) + '20' }]}>
                  <Icon
                    source={item.category?.icon || "shield-account"}
                    size={20}
                    color={item.category?.color || (isPending ? '#D97706' : '#64748B')}
                  />
                </View>
              <View style={{ flex: 1 }}>
                <ITText variant="titleSmall" weight="bold" style={styles.cardTitle} numberOfLines={1}>
                  {item.guard.name} {item.guard.lastName}
                </ITText>
                <View style={styles.headerMeta}>
                  <View style={styles.metaChip}>
                    <Icon source="clock-outline" size={11} color="#94A3B8" />
                    <ITText style={styles.metaChipText}>{timeStr}</ITText>
                  </View>
                  <View style={styles.metaChip}>
                    <Icon source="calendar" size={11} color="#94A3B8" />
                    <ITText style={styles.metaChipText}>{formattedDate}</ITText>
                  </View>
                </View>
              </View>
            </View>
            <ITBadge variant={badge.variant} dot={badge.dot} label={badge.label} />
          </View>

          <View style={styles.cardBody}>
            <ITText variant="bodyMedium" weight="bold" style={styles.bodyTitle} numberOfLines={1}>
              {item.title}
            </ITText>
            {item.description ? (
              <ITText variant="bodySmall" style={styles.bodyDesc} numberOfLines={2}>
                {item.description}
              </ITText>
            ) : null}
            <View style={styles.chipsRow}>
              {item.category ? (
                <View style={[styles.categoryChip, { backgroundColor: (item.category.color || '#F1F5F9') + '20' }]}>
                  <View style={[styles.chipDot, { backgroundColor: item.category.color || '#94A3B8' }]} />
                  <ITText style={styles.chipText} color={item.category.color || '#475569'}>
                    {item.category.name}
                  </ITText>
                </View>
              ) : null}
              {item.type ? (
                <View style={styles.typeChip}>
                  <ITText style={styles.typeChipText}>{item.type.name}</ITText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <View style={styles.footerIconBox}>
                <Icon source="account" size={13} color="#6366F1" />
              </View>
              <ITText style={styles.footerText} numberOfLines={1}>
                {item.createdBy.name} {item.createdBy.lastName}
              </ITText>
            </View>
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ITScreenDatatableLayout
        title="Incidencias a Guardias"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        data={records}
        renderItem={renderItem}
        keyExtractor={(item: IGuardDiscipline) => item.id}
        searchQuery={search}
        onSearchChange={(q) => { setSearch(q); setPage(1); fetchData(1); }}
        fab={
          <FAB
            icon="plus"
            style={styles.fab}
            color="#FFFFFF"
            onPress={() => setFormModalVisible(true)}
          />
        }
      />
      <GuardDisciplineFormModal
        visible={formModalVisible}
        onDismiss={() => setFormModalVisible(false)}
        onSuccess={() => { setPage(1); fetchData(1); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
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
  bodyTitle: {
    color: '#0F172A',
    fontSize: 13,
    marginBottom: 4,
  },
  bodyDesc: {
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#059669',
    borderRadius: 16,
  },
});
