import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Divider, Icon } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ITScreenWrapper,
  ITText,
} from '../../../shared/components';
import { COLORS } from '../../../shared/utils/constants';
import { getAllAssignments } from '../service/assignment.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';

const STATUS_MAP: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  PENDING: { label: 'Pendiente', color: '#F59E0B', icon: 'clock-outline', bg: '#FEF3C7' },
  CHECKING: { label: 'En Curso', color: '#3B82F6', icon: 'progress-check', bg: '#DBEAFE' },
  UNDER_REVIEW: { label: 'En Revisión', color: '#8B5CF6', icon: 'eye-outline', bg: '#EDE9FE' },
  REVIEWED: { label: 'Completado', color: '#10B981', icon: 'check-circle-outline', bg: '#D1FAE5' },
  ANOMALY: { label: 'Anomalía', color: '#EF4444', icon: 'alert-circle-outline', bg: '#FEE2E2' },
};

export const AssignmentDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { assignment } = route.params as { assignment: any };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (assignment?.id) {
      setLoading(true);
      getAllAssignments({ id: assignment.id })
        .then(res => {
          if (res.success && res.data?.length > 0) {
            setData(res.data[0]);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [assignment?.id]);

  const item = data || assignment;
  const statusCfg = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
  const location = item.location;
  const tasks = item.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.completed).length;

  if (loading) {
    return (
      <ITScreenWrapper padding={false} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ITScreenWrapper>
    );
  }

  return (
    <ITScreenWrapper padding={false} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Icon source={statusCfg.icon} size={48} color={statusCfg.color} />
          <View style={styles.statusInfo}>
            <ITText variant="titleMedium" weight="bold" color="#0F172A">
              {statusCfg.label}
            </ITText>
            <ITText variant="labelSmall" color="#64748B">
              {item.createdAt
                ? `Creado ${dayjs(item.createdAt).format('DD MMM YYYY')}`
                : 'Sin fecha'}
            </ITText>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Icon source="map-marker" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.cardSectionText}>
              <ITText variant="labelSmall" color="#94A3B8">Ubicación</ITText>
              <ITText variant="titleMedium" weight="bold" color="#0F172A">
                {location?.name || 'Sin nombre'}
              </ITText>
            </View>
          </View>

          <Divider style={styles.innerDivider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Icon source="calendar" size={18} color="#64748B" />
              <View style={styles.infoText}>
                <ITText variant="labelSmall" color="#94A3B8">Fecha</ITText>
                <ITText variant="labelMedium" weight="bold" color="#0F172A">
                  {dayjs(item.createdAt).format('DD/MM/YYYY')}
                </ITText>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Icon source="clock-outline" size={18} color="#64748B" />
              <View style={styles.infoText}>
                <ITText variant="labelSmall" color="#94A3B8">Hora</ITText>
                <ITText variant="labelMedium" weight="bold" color="#0F172A">
                  {dayjs(item.createdAt).format('HH:mm')}
                </ITText>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {item.notes ? (
          <View style={styles.card}>
            <View style={styles.cardSection}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Icon source="text-box-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.cardSectionText}>
                <ITText variant="labelSmall" color="#94A3B8">Notas del Guardia</ITText>
                <ITText variant="bodyMedium" color="#334155" style={{ lineHeight: 22 }}>
                  {item.notes}
                </ITText>
              </View>
            </View>
          </View>
        ) : null}

        {/* Tasks */}
        <View style={styles.card}>
          <View style={styles.cardSection}>
            <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Icon source="clipboard-check-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.cardSectionText}>
              <ITText variant="labelSmall" color="#94A3B8">
                Tareas ({completedTasks}/{tasks.length})
              </ITText>
            </View>
          </View>

          {tasks.length > 0 ? (
            <View style={styles.tasksList}>
              {tasks.map((task: any, index: number) => (
                <View key={task.id || index}>
                  {index > 0 && <Divider style={styles.taskDivider} />}
                  <View style={styles.taskItem}>
                    <Icon
                      source={task.completed ? 'check-circle' : 'circle-outline'}
                      size={22}
                      color={task.completed ? '#10B981' : '#CBD5E1'}
                    />
                    <ITText
                      variant="bodyMedium"
                      style={[
                        styles.taskText,
                        task.completed && styles.taskCompleted,
                      ] as any}
                    >
                      {task.description}
                    </ITText>
                    {task.reqPhoto && (
                      <Icon source="camera" size={16} color="#94A3B8" />
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTasks}>
              <Icon source="clipboard-text-outline" size={32} color="#CBD5E1" />
              <ITText variant="bodySmall" color="#94A3B8" style={{ marginTop: 8 }}>
                Sin tareas asignadas
              </ITText>
            </View>
          )}
        </View>
      </ScrollView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: COLORS.primary,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerInfo: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: -16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statusInfo: {
    marginLeft: 14,
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardSectionText: {
    flex: 1,
  },
  innerDivider: {
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: 'row',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    marginLeft: 10,
  },
  tasksList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  taskText: {
    flex: 1,
    marginLeft: 12,
    color: '#0F172A',
    fontSize: 14,
  },
  taskCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  taskDivider: {
    backgroundColor: '#F1F5F9',
  },
  emptyTasks: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
