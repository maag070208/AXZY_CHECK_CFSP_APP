import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { useAppSelector } from '../../../core/store/hooks';
import { RootState } from '../../../core/store/redux.config';
import {
  getStatusColor,
  getStatusText,
} from '../../../shared/utils/revision-status';
import { getMyAssignments } from '../../assignments/service/assignment.service';
import {
  AssignmentStatus,
  IAssignment,
} from '../../assignments/service/assignment.types';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';

export const MyAssignmentsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const user = useAppSelector((state: RootState) => state.userState);
  const [assignments, setAssignments] = useState<IAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAssignments = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getMyAssignments(user.id?.toString() ?? '');
      const allAssignments = (response.data as any[]) ?? [];
      const filtered = allAssignments.filter(a => a.status !== 'REVIEWED');
      setAssignments(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, []),
  );

  const onRefresh = () => loadAssignments(true);

  const filteredData = searchQuery
    ? assignments.filter(a =>
        a.location?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : assignments;

  const handlePress = (item: IAssignment) => {
    if (
      item.status === AssignmentStatus.REVIEWED ||
      item.status === AssignmentStatus.UNDER_REVIEW
    ) {
      Alert.alert(
        'Inspección Completada',
        'Esta asignación esta siendo revisada.',
      );
      return;
    }
    navigation.navigate('CHECK_STACK', {
      screen: 'CHECK_SCAN',
      params: {
        assignmentId: item.id,
        expectedLocationId: item.locationId,
        expectedLocationName: item.location?.name,
      },
    });
  };

  const renderItem = ({ item }: { item: IAssignment }) => {
    const totalTasks = item.tasks?.length || 0;
    const completedTasks = item.tasks?.filter(t => t.completed).length || 0;
    const statusColor = getStatusColor(item.status);

    return (
      <ITTouchableOpacity
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
        style={styles.cardContainer}
      >
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <ITText variant="titleSmall" weight="bold" numberOfLines={2}>
                  {item.location?.name || 'Ubicación Desconocida'}
                </ITText>
                <ITText variant="bodySmall" color="#64748b" style={{ marginTop: 2 }}>
                  {item.location?.aisle
                    ? `Pasillo ${item.location.aisle} • ${item.location.number}`
                    : 'Zona General'}
                </ITText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <ITText variant="labelSmall" weight="bold" color={statusColor}>
                  {getStatusText(item.status)}
                </ITText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon
                  source="calendar-clock"
                  size={16}
                  color="#64748b"
                />
                <ITText variant="bodySmall" color="#64748b" style={{ marginLeft: 6 }}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </ITText>
              </View>
              {totalTasks > 0 && (
                <View style={styles.infoItem}>
                  <Icon
                    source="checkbox-marked-circle-outline"
                    size={16}
                    color="#065911"
                  />
                  <ITText variant="bodySmall" color="#065911" style={{ marginLeft: 6 }}>
                    {completedTasks}/{totalTasks} Tareas
                  </ITText>
                </View>
              )}
            </View>

            {item.notes && (
              <View style={styles.notesContainer}>
                <ITText
                  variant="bodySmall"
                  color="#475569"
                  style={{ fontStyle: 'italic' }}
                  numberOfLines={1}
                >
                  "{item.notes}"
                </ITText>
              </View>
            )}

            {item.status !== AssignmentStatus.REVIEWED && (
              <View style={styles.actionRow}>
                <ITText variant="labelSmall" weight="bold" color="#065911" style={{ marginRight: 6 }}>
                  Tocar para escanear
                </ITText>
                <Icon
                  source="line-scan"
                  size={18}
                  color="#065911"
                />
              </View>
            )}
          </View>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <ITScreenDatatableLayout
      title="Asignaciones"
      totalItems={filteredData.length}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      data={filteredData}
      renderItem={renderItem}
      keyExtractor={item => item.id.toString()}
      emptyComponent={
        <View style={styles.emptyContainer}>
          <Icon
            source="clipboard-check-outline"
            size={48}
            color="#cbd5e1"
          />
          <ITText
            variant="titleMedium"
            weight="bold"
            color="#1e293b"
            center
            style={{ marginTop: 16 }}
          >
            ¡Todo listo!
          </ITText>
          <ITText
            variant="bodySmall"
            color="#94a3b8"
            center
            style={{ marginTop: 8 }}
          >
            No tienes asignaciones pendientes por ahora.
          </ITText>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 20,
     // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevación para Android
    elevation: 3,
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  notesContainer: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
