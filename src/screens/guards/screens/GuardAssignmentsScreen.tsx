import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITBadge,
  ITCard,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { getPaginatedAssignments } from '../../assignments/service/assignment.service';
import { 
  ASSIGNMENT_STATUS_LABEL, 
  AssignmentStatus 
} from '../../assignments/service/assignment.types';

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
    return (
      <View style={styles.headerInfoContainer}>
        <View style={styles.avatarContainer}>
          <ITText style={styles.avatarText}>{initial}</ITText>
        </View>
        <View style={styles.headerTextInfo}>
          <ITText variant="titleMedium" weight="bold">
            {guard.name} {guard.lastName}
          </ITText>
          <ITText variant="bodySmall" color={theme.colors.slate500}>
            {guard.role?.value || 'GUARDIA'}
          </ITText>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <ITCard
      style={styles.itemCard}
      onPress={() =>
        navigateToScreen('GUARDS_STACK', 'ASSIGNMENT_DETAIL', {
          assignmentId: item.id,
        })
      }
      mode="elevated"
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerTitle}>
          <Icon source="clipboard-text-outline" size={20} color={theme.colors.primary} />
          <ITText variant="titleMedium" weight="bold" style={{ marginLeft: 8 }}>
            {item.location?.name || 'Asignación'}
          </ITText>
        </View>
        <ITBadge
          label={ASSIGNMENT_STATUS_LABEL[item.status as AssignmentStatus] || item.status}
          variant={item.status === 'COMPLETED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'primary'}
          size="small"
        />
      </View>
      <View style={styles.cardBody}>
        <ITText variant="bodySmall" color={theme.colors.slate500}>
          Ubicación: {item.location?.zone?.client?.name || ''} - {item.location?.zone?.name || ''} - {item.location?.name || ''}
        </ITText>
        {item.notes ? (
          <ITText variant="bodySmall" style={{ marginTop: 4 }}>
            {item.notes}
          </ITText>
        ) : null}
      </View>
    </ITCard>
  );

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
        keyExtractor={item => item.id.toString()}
        fab={
          isFocused ? (
            <FAB
              icon="plus"
              style={styles.fab}
              color="#FFFFFF"
              onPress={() =>
                navigateToScreen('GUARDS_STACK', 'GUARD_ASSIGNMENT_FORM', {
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
  headerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  headerTextInfo: {
    flex: 1,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    marginTop: 4,
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
