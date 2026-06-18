import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { ITScreenDatatableLayout, ITText, ITTouchableOpacity } from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { IGuardLoginLog, getPaginatedGuardLogs } from '../../guards/service/GuardLogsService';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Tijuana';

export const GuardLogsScreen = () => {
  const [logs, setLogs] = useState<IGuardLoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (pageNum === 1 && !append) setLoading(true);
        const res = await getPaginatedGuardLogs({
          page: pageNum,
          limit: 15,
          filters: search ? { search } : {},
          sort: { key: 'loginAt', direction: 'desc' },
        });
        if (res.success && res.data) {
          const rows = res.data.rows || [];
          setLogs(prev => (pageNum === 1 ? rows : [...prev, ...rows]));
          setTotal(res.data.total || 0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
        setRefreshing(false);
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
    fetchData(1);
  };

  const onLoadMore = () => {
    if (logs.length < total) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, true);
    }
  };

  const renderLogItem = ({ item }: { item: IGuardLoginLog }) => (
    <ITTouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <ITText style={styles.avatarText}>
            {item.user.name?.[0]}{item.user.lastName?.[0]}
          </ITText>
        </View>
        <View style={styles.cardInfo}>
          <ITText style={styles.guardName}>{item.user.name} {item.user.lastName}</ITText>
          <ITText style={styles.guardUsername}>@{item.user.username}</ITText>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.timeBlock}>
          <Icon source="clock-in" size={14} color="#10B981" />
          <ITText style={styles.timeLabel}>Entrada</ITText>
          <ITText style={styles.timeValue}>
            {dayjs(item.loginAt).tz(TZ).format('DD MMM HH:mm')} HRS
          </ITText>
        </View>
        <View style={styles.timeBlock}>
          <Icon source="clock-out" size={14} color={item.logoutAt ? '#EF4444' : '#F59E0B'} />
          <ITText style={styles.timeLabel}>Salida</ITText>
          {item.logoutAt ? (
            <ITText style={styles.timeValue}>
              {dayjs(item.logoutAt).tz(TZ).format('DD MMM HH:mm')} HRS
            </ITText>
          ) : (
            <ITText style={styles.openBadge}>ABIERTO</ITText>
          )}
        </View>
        <View style={styles.timeBlock}>
          <Icon source="clock-time-eight" size={14} color="#64748B" />
          <ITText style={styles.timeLabel}>Duración</ITText>
          {item.logoutAt ? (
            <ITText style={styles.durationValue}>
              {Math.floor(dayjs(item.logoutAt).diff(dayjs(item.loginAt), 'hour'))}h{' '}
              {dayjs(item.logoutAt).diff(dayjs(item.loginAt), 'minute') % 60}m
            </ITText>
          ) : (
            <ITText style={styles.durationOpen}>EN CURSO</ITText>
          )}
        </View>
      </View>
    </ITTouchableOpacity>
  );

  return (
    <ITScreenDatatableLayout
      title="Prenómina"
      totalItems={total}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      searchQuery={search}
      onSearchChange={(q) => {
        setSearch(q);
        setPage(1);
        fetchData(1);
      }}
      data={logs}
      renderItem={renderLogItem}
      keyExtractor={(item: IGuardLoginLog) => item.id}
      onLoadMore={onLoadMore}
      loadingMore={false}
      emptyComponent={
        <View style={styles.emptyContainer}>
          <Icon source="clipboard-text-clock" size={48} color="#CBD5E1" />
          <ITText style={styles.emptyTitle}>Sin registros de prenómina</ITText>
          <ITText style={styles.emptySubtitle}>Los registros aparecerán cuando los guardias inicien turno</ITText>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  cardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  guardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  guardUsername: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
    gap: 8,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    width: 60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'monospace',
  },
  openBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'monospace',
  },
  durationOpen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
