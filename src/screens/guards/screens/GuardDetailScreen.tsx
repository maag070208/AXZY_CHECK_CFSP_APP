import {
  useFocusEffect,
  useIsFocused,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { FAB, Icon, Portal, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITBadge,
  ITCard,
  ITScreenWrapper,
  ITText,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { getAllAssignments } from '../../assignments/service/assignment.service';
import { AssignmentStatus } from '../../assignments/service/assignment.types';
import { getUserById } from '../../users/service/user.service';
import { AssignmentModal } from '../components/AssignmentModal';

export const GuardDetailScreen = () => {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { navigateToScreen } = useAppNavigation();
  const isFocused = useIsFocused();
  const { guard } = route.params;

  const [activeGuard, setActiveGuard] = useState<any>(guard);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredAssignments, setFilteredAssignments] = useState<any[]>([]);

  const loadGuardData = useCallback(async () => {
    try {
      const res = await getUserById(guard.id);
      if (res.success) {
        setActiveGuard(res.data);
      }
    } catch (error) {
      console.error(error);
    }
  }, [guard.id]);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(showLoader(true));
      const res = await getAllAssignments({ guardId: guard.id });
      if (res.success) {
        setAssignments(res.data || []);
        setFilteredAssignments(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      dispatch(showLoader(false));
    }
  }, [guard.id, dispatch]);

  useEffect(() => {
    const filtered = assignments.filter(a =>
      (a.location?.name || '').toLowerCase().includes(search.toLowerCase()),
    );
    setFilteredAssignments(filtered);
  }, [search, assignments]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadGuardData(), loadAssignments()]);
  }, [loadGuardData, loadAssignments]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  const getStatusConfig = (status: AssignmentStatus) => {
    switch (status) {
      case AssignmentStatus.PENDING:
        return {
          label: 'Pendiente',
          color: '#F59E0B',
          variant: 'warning' as const,
        };
      case AssignmentStatus.CHECKING:
        return {
          label: 'En Curso',
          color: theme.colors.primary,
          variant: 'primary' as const,
        };
      case AssignmentStatus.ANOMALY:
        return {
          label: 'Anomalía',
          color: '#EF4444',
          variant: 'error' as const,
        };
      default:
        return {
          label: status,
          color: theme.colors.slate500,
          variant: 'default' as const,
        };
    }
  };

  const renderAssignment = ({ item }: { item: any }) => {
    const statusConfig = getStatusConfig(item.status);
    const locationName = item.location?.name || 'Ubicación Desconocida';
    const taskCount = item.tasks?.length || 0;

    return (
      <ITCard
        style={styles.assignmentCard}
        onPress={() =>
          navigateToScreen('GUARDS_STACK', 'ASSIGNMENT_DETAIL', {
            assignment: item,
          })
        }
        mode="elevated"
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardAvatar}>
            <ITText style={styles.cardAvatarText}>
              {locationName.charAt(0).toUpperCase()}
            </ITText>
          </View>
          <View style={styles.cardInfo}>
            <ITText
              variant="titleSmall"
              weight="700"
              color={theme.colors.slate900}
            >
              {locationName}
            </ITText>
            <View style={styles.cardMeta}>
              <ITBadge
                label={statusConfig.label}
                variant={statusConfig.variant}
                size="small"
                dot
              />
              <View style={styles.dotSeparator} />
              <ITText variant="labelSmall" color={theme.colors.slate500}>
                {item.location?.zone?.name || 'General'}
              </ITText>
            </View>
          </View>
          <Icon source="chevron-right" size={20} color={theme.colors.primary} />
        </View>

        <View style={styles.cardFooterStats}>
          <View style={styles.statItem}>
            <Icon
              source="clipboard-list-outline"
              size={16}
              color={theme.colors.primary}
            />
            <ITText
              variant="labelSmall"
              weight="600"
              color={theme.colors.primary}
            >
              {taskCount} {taskCount === 1 ? 'Tarea' : 'Tareas'}
            </ITText>
          </View>
          <View style={styles.statItem}>
            <Icon
              source="calendar-outline"
              size={16}
              color={theme.colors.slate500}
            />
            <ITText variant="labelSmall" color={theme.colors.slate500}>
              Hoy
            </ITText>
          </View>
        </View>
      </ITCard>
    );
  };

  return (
    <ITScreenWrapper
      padding={false}
      scrollable={false}
      style={styles.container}
    >
      {/* PROFILE HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarLarge}>
            <ITText style={styles.avatarLargeText}>
              {activeGuard.name ? activeGuard.name[0].toUpperCase() : 'G'}
            </ITText>
            <View
              style={[
                styles.activeDot,
                { backgroundColor: activeGuard.active ? '#10B981' : '#EF4444' },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ITText
              variant="headlineSmall"
              weight="bold"
              color={theme.colors.slate900}
            >
              {activeGuard.name} {activeGuard.lastName}
            </ITText>
            <View style={styles.badgeRow}>
              <ITBadge
                label={activeGuard.role?.value || 'Guardia'}
                variant="primary"
                size="small"
                outline
              />
              <ITText variant="labelSmall" color={theme.colors.slate500}>
                @{activeGuard.username}
              </ITText>
            </View>
          </View>
        </View>

        {/* DASHBOARD STATS */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ITText
              variant="titleLarge"
              weight="bold"
              color={theme.colors.primary}
            >
              {assignments.length}
            </ITText>
            <ITText variant="labelSmall" color={theme.colors.slate500}>
              Rutas
            </ITText>
          </View>
          <View style={styles.statCard}>
            <ITText variant="titleLarge" weight="bold" color="#10B981">
              {
                assignments.filter(a => a.status === AssignmentStatus.CHECKING)
                  .length
              }
            </ITText>
            <ITText variant="labelSmall" color={theme.colors.slate500}>
              Activas
            </ITText>
          </View>
          <View style={styles.statCard}>
            <ITText
              variant="titleLarge"
              weight="bold"
              color={theme.colors.slate900}
            >
              {activeGuard.schedule ? activeGuard.schedule.startTime : '--:--'}
            </ITText>
            <ITText variant="labelSmall" color={theme.colors.slate500}>
              Entrada
            </ITText>
          </View>
        </View>
      </View>

      {/* SEARCH AND LIST */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <ITText
            variant="titleMedium"
            weight="bold"
            color={theme.colors.slate900}
          >
            Asignaciones de Hoy
          </ITText>
          <Searchbar
            placeholder="Buscar..."
            onChangeText={setSearch}
            value={search}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        </View>

        <FlatList
          data={filteredAssignments}
          renderItem={renderAssignment}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refreshAll}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Icon
                  source="clipboard-text-outline"
                  size={64}
                  color="#E2E8F0"
                />
                <ITText variant="bodyMedium" color={theme.colors.slate400}>
                  Sin asignaciones hoy
                </ITText>
              </View>
            ) : null
          }
        />
      </View>

      <Portal>
        {isFocused && (
          <FAB
            icon="plus"
            style={[
              styles.fab,
              {
                bottom: insets.bottom + 24,
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => setShowModal(true)}
            color="#FFFFFF"
          />
        )}
        <AssignmentModal
          visible={showModal}
          onDismiss={() => {
            setShowModal(false);
            loadGuardData();
          }}
          guardId={activeGuard.id}
          clientId={activeGuard.client?.id}
          onSuccess={() => {
            setShowModal(false);
            refreshAll();
          }}
        />
      </Portal>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  listSection: {
    flex: 1,
    marginTop: 12,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchInput: {
    fontSize: 13,
    minHeight: 0,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  assignmentCard: {
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.slate900,
  },
  cardInfo: {
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  cardFooterStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    borderRadius: 20,
  },
});
