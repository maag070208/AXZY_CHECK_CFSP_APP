import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITAlert,
  ITBadge,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { ScheduleFormModal } from '../components/ScheduleFormModal';
import {
  deleteSchedule,
  getPaginatedSchedules,
  ISchedule,
} from '../service/schedules.service';

export const SchedulesListScreen = () => {
  const dispatch = useDispatch();

  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ISchedule | null>(
    null,
  );

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(
    async (pageNum = 1) => {
      try {
        if (pageNum === 1) setLoading(true);

        const filters: any = {};
        if (search) filters.name = search;
        if (status === 'active') filters.active = true;
        if (status === 'inactive') filters.active = false;

        const res = await getPaginatedSchedules({
          page: pageNum,
          limit: 10,
          filters,
        });

        if (res.success && res.data) {
          setSchedules(prev =>
            pageNum === 1 ? res.data.rows : [...prev, ...res.data.rows],
          );
          setTotal(res.data.total || 0);
          setPage(pageNum);
        }
      } catch (error) {
        dispatch(
          showToast({ message: 'Error al cargar horarios', type: 'error' }),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData(1);
    }, [fetchData]),
  );

  const handleDeletePress = (id: number) => {
    setScheduleToDelete(id);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteSchedule(scheduleToDelete);
      if (res.success) {
        dispatch(showToast({ message: 'Horario eliminado', type: 'success' }));
        fetchData(1);
      } else {
        dispatch(showToast({ message: 'Error al eliminar', type: 'error' }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Error inesperado', type: 'error' }));
    } finally {
      setIsDeleting(false);
      setDeleteDialogVisible(false);
      setScheduleToDelete(null);
    }
  };

  const renderItem = ({ item }: { item: ISchedule }) => (
    <ITTouchableOpacity
      style={styles.card}
      onPress={() => {
        setEditingSchedule(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardContent}>
        {/* Left: Time Range Visualization */}
        <View style={styles.timeSection}>
          <View style={styles.timePoint}>
            <ITText
              variant="labelSmall"
              weight="bold"
              color={theme.colors.primary}
            >
              {item.startTime}
            </ITText>
          </View>
          <View style={styles.timeLine} />
          <View style={styles.timePoint}>
            <ITText variant="labelSmall" weight="bold" color="#94A3B8">
              {item.endTime}
            </ITText>
          </View>
        </View>

        {/* Center: Info */}
        <View style={styles.infoSection}>
          <ITText variant="bodyLarge" weight="bold" color="#0F172A">
            {item.name}
          </ITText>
          <View style={styles.metaRow}>
            <ITBadge
              label={item.active ? 'Activo' : 'Inactivo'}
              variant={item.active ? 'primary' : 'surface'}
              size="small"
            />
            <ITText
              variant="labelSmall"
              color="#94A3B8"
              style={{ marginLeft: 8 }}
            >
              {item.active ? 'Turno operacional' : 'Fuera de servicio'}
            </ITText>
          </View>
        </View>

        {/* Right: Actions */}
        <View style={styles.actionSection}>
          <ITTouchableOpacity
            onPress={() => handleDeletePress(item.id)}
            style={styles.deleteBtn}
          >
            <Icon source="trash-can-outline" size={20} color="#EF4444" />
          </ITTouchableOpacity>
          <Icon source="chevron-right" size={20} color="#CBD5E1" />
        </View>
      </View>
    </ITTouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Gestión de Horarios"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchData(1)}
        showSearchBar={true}
        searchBar={
          <Searchbar
            placeholder="Buscar horario..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={theme.colors.primary}
            placeholderTextColor="#94A3B8"
            elevation={0}
          />
        }
        data={schedules}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        onEndReached={() => fetchData(page + 1)}
        fab={
          <FAB
            icon="plus"
            onPress={() => {
              setEditingSchedule(null);
              setModalVisible(true);
            }}
            style={styles.fab}
            color="#FFFFFF"
          />
        }
      />

      <ScheduleFormModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        onSuccess={() => fetchData(1)}
        initialData={editingSchedule}
      />

      <ITAlert
        visible={deleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={confirmDelete}
        title="Eliminar Horario"
        description="Esta acción eliminará permanentemente el horario del sistema. ¿Deseas continuar?"
        confirmLabel="Eliminar"
        type="alert"
        loading={isDeleting}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
    color: '#0F172A',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  timeSection: {
    alignItems: 'center',
    width: 60,
    gap: 4,
  },
  timePoint: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 1,
  },
  infoSection: {
    flex: 1,
    marginLeft: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  fab: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    marginBottom: 16,
  },
});
