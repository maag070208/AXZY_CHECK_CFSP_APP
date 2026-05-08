import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import {
  Avatar,
  IconButton,
  Portal,
  FAB,
  Divider,
  Searchbar,
} from 'react-native-paper';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import { AssignmentModal } from '../components/AssignmentModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import {
  ITScreenWrapper,
  ITCard,
  ITText,
  ITBadge,
  ITButton,
} from '../../../shared/components';
import { COLORS } from '../../../shared/utils/constants';
import { getAllAssignments } from '../../assignments/service/assignment.service';
import { getUserById } from '../../users/service/user.service';
import { AssignmentStatus } from '../../assignments/service/assignment.types';
import { LoaderComponent } from '../../../shared/components/LoaderComponent';
import { showLoader } from '../../../core/store/slices/loader.slice';
import ModernStyles from '../../../shared/theme/app.styles';

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
        return { label: 'Pendiente', color: '#F59E0B' };
      case AssignmentStatus.CHECKING:
        return { label: 'En Curso', color: COLORS.primary };
      case AssignmentStatus.ANOMALY:
        return { label: 'Anomalía', color: COLORS.error };
      default:
        return { label: status, color: '#64748B' };
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
      >
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.avatarSection}>
              <Avatar.Text
                size={44}
                label={locationName[0].toUpperCase()}
                style={[
                  styles.avatarCard,
                  { backgroundColor: statusConfig.color + '10' },
                ]}
                labelStyle={{
                  color: statusConfig.color,
                  fontWeight: 'bold',
                  fontSize: 18,
                }}
              />
            </View>

            <View style={styles.infoSectionCard}>
              <View style={styles.titleRow}>
                <ITText
                  variant="titleSmall"
                  weight="bold"
                  color={COLORS.textPrimary}
                  numberOfLines={1}
                  style={{ flex: 1, marginRight: 8 }}
                >
                  {locationName}
                </ITText>
              </View>

              <View style={styles.metaRowCard}>
                <View style={styles.detailItemCard}>
                  <ITBadge
                    label={statusConfig.label.toUpperCase()}
                    style={{
                      backgroundColor: statusConfig.color + '15',
                    }}
                    labelStyle={{
                      color: statusConfig.color,
                      fontSize: 8,
                    }}
                  />
                  <IconButton
                    icon="clipboard-list"
                    size={14}
                    iconColor={COLORS.indigo}
                    style={{ margin: 0, padding: 0 }}
                  />
                  <ITText
                    variant="labelSmall"
                    color={COLORS.indigo}
                    weight="bold"
                    style={{ marginLeft: -2 }}
                  >
                    {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
                  </ITText>
                </View>

                <View style={[styles.detailItemCard, { marginLeft: 16 }]}>
                  <IconButton
                    icon="map-marker"
                    size={14}
                    iconColor="#64748B"
                    style={{ margin: 0, padding: 0 }}
                  />
                  <ITText
                    variant="labelSmall"
                    color="#64748B"
                    weight="medium"
                    style={{ marginLeft: -2 }}
                  >
                    {item.location?.zone?.name || 'General'}
                  </ITText>
                </View>
              </View>
            </View>

            <IconButton
              icon="chevron-right"
              size={20}
              iconColor="#CBD5E1"
              style={{ marginRight: -8 }}
            />
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.profileRow}>
          <Avatar.Text
            size={72}
            label={activeGuard.name ? activeGuard.name[0].toUpperCase() : 'G'}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <View style={styles.nameSection}>
            <ITText
              variant="headlineSmall"
              weight="bold"
              color={COLORS.textPrimary}
            >
              {activeGuard.name} {activeGuard.lastName}
            </ITText>
            <View style={styles.subInfo}>
              <ITBadge
                label={activeGuard.role?.value || 'Guardia'}
                variant="primary"
                size="small"
                style={{ marginRight: 8 }}
              />
              <ITText variant="labelSmall" color={COLORS.textSecondary}>
                @{activeGuard.username}
              </ITText>
            </View>
            <View style={styles.scheduleRow}>
              <IconButton
                icon="clock-outline"
                size={16}
                iconColor={COLORS.primary}
                style={{ margin: 0, marginLeft: -4 }}
              />
              <ITText variant="labelSmall" weight="bold" color={COLORS.primary}>
                {activeGuard.schedule
                  ? activeGuard.schedule.name
                  : 'Sin Horario'}
              </ITText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <ITText
            variant="titleMedium"
            weight="bold"
            color={COLORS.textPrimary}
          >
            Asignaciones
          </ITText>
        </View>
        <ITBadge
          label={assignments.length.toString()}
          variant="surface"
          size="small"
        />
      </View>

      <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
        <Searchbar
          placeholder="Buscar ubicación..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={COLORS.primary}
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
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <IconButton
                icon="clipboard-text-outline"
                size={48}
                iconColor="#E2E8F0"
              />
              <ITText variant="bodyMedium" color="#94A3B8">
                Sin asignaciones registradas
              </ITText>
            </View>
          ) : null
        }
      />

      <Portal>
        {isFocused && (
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: insets.bottom + 24 }]}
            onPress={() => setShowModal(true)}
            color="#FFFFFF"
          />
        )}
        <AssignmentModal
          visible={showModal}
          onDismiss={() => {
            setShowModal(false);
            loadGuardData(); // Refresh guard data on close to sync client
          }}
          guardId={activeGuard.id}
          clientId={activeGuard.client?.id}
          onSuccess={() => {
            setShowModal(false);
            refreshAll();
          }}
        />
      </Portal>
      <LoaderComponent />
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
    padding: 24,
    paddingTop: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...ModernStyles.shadowSm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: COLORS.surface,
    marginRight: 20,
  },
  avatarLabel: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  nameSection: {
    flex: 1,
    justifyContent: 'center',
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  assignmentCard: {
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...ModernStyles.shadowSm,
  },
  cardContent: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSection: {
    marginRight: 12,
  },
  avatarCard: {
    borderWidth: 0,
  },
  infoSectionCard: {
    flex: 1,
    justifyContent: 'center',
  },
  metaRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadgeCard: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detailsRowCard: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerCard: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 48,
    ...ModernStyles.shadowSm,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  footerBtnCard: {
    flex: 1,
    borderRadius: 0,
    height: '100%',
    justifyContent: 'center',
    marginVertical: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  fab: {
    position: 'absolute',
    right: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
});
