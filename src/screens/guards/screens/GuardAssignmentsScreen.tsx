import { useFocusEffect, useIsFocused, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Icon } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITBadge,
  ITText,
  ITTouchableOpacity,
  ITScreenDatatableLayout,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { getPaginatedAssignments } from '../../assignments/service/assignment.service';
import {
  ASSIGNMENT_STATUS_LABEL,
  AssignmentStatus
} from '../../assignments/service/assignment.types';

const STATUS_CONFIG: Record<string, { variant: 'success' | 'error' | 'info' | 'default' | 'primary' | 'secondary' | 'warning'; icon: string; color: string }> = {
  PENDING: { variant: 'warning', icon: 'clock-outline', color: '#F59E0B' },
  CHECKING: { variant: 'info', icon: 'progress-check', color: '#3B82F6' },
  UNDER_REVIEW: { variant: 'secondary', icon: 'eye-outline', color: '#8B5CF6' },
  REVIEWED: { variant: 'success', icon: 'check-circle-outline', color: '#10B981' },
  ANOMALY: { variant: 'error', icon: 'alert-circle-outline', color: '#EF4444' },
};

export const GuardAssignmentsScreen = () => {
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const { navigateToScreen } = useAppNavigation();

  const guard = route.params?.guard;

  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const stats = useMemo(() => {
    const pending = assignments.filter(a => a.status === 'PENDING').length;
    const inProgress = assignments.filter(a => a.status === 'CHECKING' || a.status === 'UNDER_REVIEW').length;
    const completed = assignments.filter(a => a.status === 'REVIEWED').length;
    return { pending, inProgress, completed, total: assignments.length };
  }, [assignments]);

  const fetchAssignments = useCallback(
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

        const params = {
          page: pageNum,
          limit: 15,
          filters: {
            guardId: guard?.id,
          },
        };

        const res = await getPaginatedAssignments(params);

        if (res.success && res.data) {
          const newRows = res.data.rows || [];
          const totalRows = res.data.total || 0;

          setAssignments(prev => {
            const combined = pageNum === 1 ? newRows : [...prev, ...newRows];
            setHasMore(combined.length < totalRows);
            return combined;
          });

          setTotal(totalRows);
          setPage(pageNum);
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        dispatch(showLoader(false));
      }
    },
    [guard?.id, dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      if (guard?.id) fetchAssignments(1);
    }, [fetchAssignments, guard?.id]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchAssignments(page + 1);
    }
  };

  const renderHeaderInfo = () => {
    if (!guard) return null;
    const initial = guard.name ? guard.name.charAt(0).toUpperCase() : 'G';
    const lastName = guard.lastName ? guard.lastName.charAt(0).toUpperCase() : '';
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View style={styles.avatarContainer}>
            <ITText style={styles.avatarText}>{initial}{lastName}</ITText>
            <View style={[styles.activeDot, { backgroundColor: guard.active ? '#10B981' : '#EF4444' }]} />
          </View>
          <View style={styles.headerTextInfo}>
            <ITText variant="titleLarge" weight="bold" color={theme.colors.slate900}>
              {guard.name} {guard.lastName}
            </ITText>
            <View style={styles.headerMeta}>
              <ITBadge label={guard.role?.value || 'GUARDIA'} variant="primary" size="small" outline />
              {guard.client?.name && (
                <View style={styles.metaItem}>
                  <Icon source="domain" size={14} color={theme.colors.slate400} />
                  <ITText variant="labelSmall" color={theme.colors.slate500} style={{ marginLeft: 4 }}>
                    {guard.client.name}
                  </ITText>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: '#FEF3C7' }]}>
            <ITText variant="headlineSmall" weight="bold" color="#D97706">{stats.pending}</ITText>
            <ITText variant="labelSmall" color="#92400E">Pendientes</ITText>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#DBEAFE' }]}>
            <ITText variant="headlineSmall" weight="bold" color="#2563EB">{stats.inProgress}</ITText>
            <ITText variant="labelSmall" color="#1E40AF">En Curso</ITText>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#D1FAE5' }]}>
            <ITText variant="headlineSmall" weight="bold" color="#059669">{stats.completed}</ITText>
            <ITText variant="labelSmall" color="#065F46">Completadas</ITText>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusConfig = STATUS_CONFIG[item.status] || { variant: 'default' as const, icon: 'help-circle-outline', color: theme.colors.slate500 };
    return (
      <ITTouchableOpacity
        style={styles.itemCard}
        onPress={() =>
          (navigateToScreen as any)('GUARDS_STACK', 'ASSIGNMENT_DETAIL', {
            assignment: { id: item.id },
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Icon source={statusConfig.icon} size={20} color={statusConfig.color} />
          </View>
          <View style={styles.cardTitleArea}>
            <ITText style={styles.locationName}>
              {item.location?.name || 'Asignación'}
            </ITText>
            <View style={styles.cardMeta}>
              {item.tasks?.length > 0 && (
                <ITText variant="labelSmall" color={theme.colors.slate400}>
                  {item.tasks.length} tarea{item.tasks.length > 1 ? 's' : ''}
                </ITText>
              )}
            </View>
          </View>
          <ITBadge
            label={ASSIGNMENT_STATUS_LABEL[item.status as AssignmentStatus] || item.status}
            variant={statusConfig.variant}
            size="small"
          />
        </View>

        {item.notes ? (
          <View style={styles.cardNotes}>
            <Icon source="text-box-outline" size={14} color={theme.colors.slate400} />
            <ITText variant="bodySmall" color={theme.colors.slate500} style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </ITText>
          </View>
        ) : null}
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeaderInfo()}
      <ITScreenDatatableLayout
        title="Tareas Asignadas"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        data={assignments}
        renderItem={renderItem}
        keyExtractor={(item: any) => item?.id?.toString() || Math.random().toString()}
        searchQuery=""
        onSearchChange={() => {}}
        fab={
          isFocused ? (
            <FAB
              icon="plus"
              style={styles.fab}
              color="#FFFFFF"
              onPress={() =>
                (navigateToScreen as any)('GUARDS_STACK', 'GUARD_ASSIGNMENT_FORM', {
                  guard,
                })
              }
            />
          ) : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  headerTextInfo: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  itemCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleArea: {
    flex: 1,
    marginRight: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  notesText: {
    flex: 1,
    marginLeft: 8,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
  },
});
