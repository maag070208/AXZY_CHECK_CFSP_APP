import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITBadge,
  ITButton,
  ITCard,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import {
  NotificationLogEntry,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';

const TYPE_BG: Record<string, string> = {
  error: '#FEF2F2',
  warning: '#FFFBEB',
  success: '#ECFDF5',
  info: '#EFF6FF',
};

const TYPE_DOT: Record<string, string> = {
  error: '#F43F5E',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

export const NotificationLogScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();

  const [data, setData] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyNotifications(unreadOnly);
      if (res.success) {
        setData(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching notification log:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [unreadOnly]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setData(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllNotificationsRead();
      if (res.success) {
        setData(prev => prev.map(n => ({ ...n, read: true })));
        dispatch(showToast({ message: 'Todas marcadas como leídas', type: 'success' }));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const unreadCount = data.filter(n => !n.read).length;

  const filterBadges = (
    <View style={styles.filterRow}>
      <ITTouchableOpacity
        onPress={() => setUnreadOnly(false)}
        style={[styles.filterChip, !unreadOnly && styles.filterChipActive]}
      >
        <ITText variant="labelSmall" weight="bold" color={!unreadOnly ? '#fff' : '#64748B'}>
          TODAS
        </ITText>
      </ITTouchableOpacity>
      <ITTouchableOpacity
        onPress={() => setUnreadOnly(true)}
        style={[styles.filterChip, unreadOnly && styles.filterChipActive]}
      >
        <ITText variant="labelSmall" weight="bold" color={unreadOnly ? '#fff' : '#64748B'}>
          NO LEÍDAS ({unreadCount})
        </ITText>
      </ITTouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: NotificationLogEntry }) => {
    const bgColor = TYPE_BG[item.type] || TYPE_BG.info;
    const dotColor = TYPE_DOT[item.type] || TYPE_DOT.info;

    return (
      <ITCard style={item.read ? { ...styles.card, ...styles.cardRead } : styles.card}>
        <ITTouchableOpacity
          onPress={() => !item.read && handleMarkRead(item.id)}
          style={styles.cardContent}
        >
          <View style={[styles.dot, { backgroundColor: item.read ? '#CBD5E1' : dotColor }]} />
          <View style={styles.cardInfo}>
            <View style={styles.cardTop}>
              <View style={[styles.typeBadge, { backgroundColor: bgColor }]}>
                <ITText variant="labelSmall" weight="900" color={dotColor}>
                  {item.type.toUpperCase()}
                </ITText>
              </View>
              <ITBadge
                variant={item.read ? 'secondary' : 'primary'}
                label={item.read ? 'Leída' : 'Nueva'}
                size="small"
                dot={!item.read}
              />
            </View>
            {item.title && (
              <ITText variant="bodySmall" weight="bold" color="#0F172A" style={styles.title}>
                {item.title}
              </ITText>
            )}
            <ITText variant="bodySmall" color="#475569" style={styles.message}>
              {item.message}
            </ITText>
            <ITText variant="labelSmall" color="#94A3B8">
              {dayjs(item.createdAt).format('DD [de] MMMM, YYYY [a las] HH:mm')}
            </ITText>
          </View>
          {!item.read && (
            <Icon source="check-circle-outline" size={20} color={theme.colors.primary} />
          )}
        </ITTouchableOpacity>
      </ITCard>
    );
  };

  return (
    <>
      <ITScreenDatatableLayout
        title="Notificaciones"
        totalItems={data.length}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchData(); }}
        searchQuery=""
        onSearchChange={() => {}}
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        filterBadges={filterBadges}
        showSearchBar={false}
        emptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="bell-off-outline" size={48} color="#CBD5E1" />
            <ITText variant="bodyMedium" color="#64748B" style={styles.emptyText}>
              No tienes notificaciones{'\n'}{unreadOnly ? 'no leídas' : ''}
            </ITText>
          </View>
        }
        fab={
          unreadCount > 0 ? (
            <ITButton
              label="Leer todas"
              mode="contained"
              icon="check-all"
              onPress={handleMarkAllRead}
              style={styles.fab}
            />
          ) : undefined
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  card: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardRead: { opacity: 0.7 },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  cardInfo: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  title: { marginTop: 2 },
  message: { lineHeight: 18 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { textAlign: 'center', marginTop: 12 },
  fab: { borderRadius: 16, height: 52, paddingHorizontal: 20 },
});
