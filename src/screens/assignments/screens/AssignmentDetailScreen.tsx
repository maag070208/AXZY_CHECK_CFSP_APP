import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { List, Divider, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ITScreenWrapper,
  ITCard,
  ITText,
  ITBadge,
} from '../../../shared/components';
import { COLORS } from '../../../shared/utils/constants';
import { IAssignment, AssignmentStatus } from '../service/assignment.types';
import ModernStyles from '../../../shared/theme/app.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AssignmentDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { assignment } = route.params as { assignment: IAssignment };

  const getStatusConfig = (status: AssignmentStatus) => {
    switch (status) {
      case AssignmentStatus.PENDING:
        return { label: 'Pendiente', color: '#F59E0B' };
      case AssignmentStatus.CHECKING:
        return { label: 'En Curso', color: COLORS.primary };
      case AssignmentStatus.ANOMALY:
        return { label: 'Anomalía', color: COLORS.error };
      case AssignmentStatus.REVIEWED:
        return { label: 'Revisado', color: '#10B981' };
      default:
        return { label: status, color: '#64748B' };
    }
  };

  const statusConfig = getStatusConfig(assignment.status);

  return (
    <ITScreenWrapper padding={false} style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Header Section */}
        <View style={styles.header}>
          <ITText variant="headlineSmall" weight="bold" color={COLORS.textPrimary}>
            Detalle de Asignación
          </ITText>
          <ITText variant="bodyMedium" color={COLORS.textSecondary}>
            ID: {assignment.id.slice(0, 8)}...
          </ITText>
        </View>

        {/* Info Card */}
        <ITCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <ITText variant="titleLarge" weight="bold" color={COLORS.textPrimary}>
                {assignment.location?.name || 'Ubicación'}
              </ITText>
              <ITText variant="labelMedium" color={COLORS.textSecondary}>
                Zona: {assignment.location?.aisle || 'General'}
              </ITText>
            </View>
            <ITBadge
              label={statusConfig.label}
              style={{ backgroundColor: statusConfig.color + '15' }}
              labelStyle={{ color: statusConfig.color }}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <IconButton icon="calendar" size={20} iconColor={COLORS.primary} style={styles.metaIcon} />
              <View>
                <ITText variant="labelSmall" color={COLORS.textSecondary}>Fecha</ITText>
                <ITText variant="labelMedium" weight="bold">{new Date(assignment.createdAt).toLocaleDateString()}</ITText>
              </View>
            </View>
            <View style={styles.metaItem}>
              <IconButton icon="clock-outline" size={20} iconColor={COLORS.primary} style={styles.metaIcon} />
              <View>
                <ITText variant="labelSmall" color={COLORS.textSecondary}>Hora</ITText>
                <ITText variant="labelMedium" weight="bold">{new Date(assignment.createdAt).toLocaleTimeString()}</ITText>
              </View>
            </View>
          </View>
        </ITCard>

        {/* Notes */}
        {assignment.notes && (
          <View style={styles.section}>
            <ITText variant="titleMedium" weight="bold" style={styles.sectionTitle}>
              Notas
            </ITText>
            <ITCard style={styles.notesCard}>
              <ITText variant="bodyMedium" color={COLORS.textPrimary}>
                {assignment.notes}
              </ITText>
            </ITCard>
          </View>
        )}

        {/* Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ITText variant="titleMedium" weight="bold">
              Tareas Asignadas
            </ITText>
            <ITBadge
              label={assignment.tasks?.length.toString() || '0'}
              variant="surface"
              size="small"
            />
          </View>
          
          <ITCard style={styles.tasksCard}>
            {assignment.tasks && assignment.tasks.length > 0 ? (
              assignment.tasks.map((task, index) => (
                <View key={task.id}>
                  <List.Item
                    title={task.description}
                    titleStyle={[
                      styles.taskTitle,
                      task.completed && styles.completedTaskTitle
                    ]}
                    left={props => (
                      <IconButton
                        {...props}
                        icon={task.completed ? "check-circle" : "circle-outline"}
                        iconColor={task.completed ? "#10B981" : "#CBD5E1"}
                        size={24}
                      />
                    )}
                    right={props => task.reqPhoto ? (
                      <IconButton {...props} icon="camera" size={18} iconColor="#94A3B8" />
                    ) : null}
                  />
                  {index < assignment.tasks!.length - 1 && <Divider />}
                </View>
              ))
            ) : (
              <View style={styles.emptyTasks}>
                <ITText variant="bodyMedium" color="#94A3B8">
                  No hay tareas específicas asignadas
                </ITText>
              </View>
            )}
          </ITCard>
        </View>
      </ScrollView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...ModernStyles.shadowSm,
    marginBottom: 24,
  },
  infoCard: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    margin: 0,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  notesCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  tasksCard: {
    padding: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  taskTitle: {
    fontSize: 14,
    color: '#1E293B',
  },
  completedTaskTitle: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  emptyTasks: {
    padding: 24,
    alignItems: 'center',
  },
});
