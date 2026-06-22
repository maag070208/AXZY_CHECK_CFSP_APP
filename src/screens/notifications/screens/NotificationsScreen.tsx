import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Icon, Switch } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITAlert,
  ITBadge,
  ITCard,
  ITDialog,
  ITInput,
  ITScreenDatatableLayout,
  ITText,
  ITTouchableOpacity
} from '../../../shared/components';
import { ActionPickerModal } from '../../../shared/components/ActionPickerModal';
import { theme } from '../../../shared/theme/theme';
import {
  ScheduledNotification,
  createScheduledNotification,
  deleteScheduledNotification,
  getPaginatedNotifications,
  sendNotificationNow,
  updateScheduledNotification,
} from '../services/notification.service';

const FREQ_OPTIONS = [
  { id: 'ONCE', label: 'Una vez' },
  { id: 'DAILY', label: 'Diario' },
  { id: 'EVERY_2_DAYS', label: 'Cada 2 días' },
  { id: 'WEEKLY', label: 'Semanal' },
  { id: 'EVERY_2_WEEKS', label: 'Cada 2 semanas' },
  { id: 'MONTHLY', label: 'Mensual' },
];

const TYPE_OPTIONS = [
  { id: 'info', label: 'Informativa' },
  { id: 'success', label: 'Éxito' },
  { id: 'warning', label: 'Advertencia' },
  { id: 'error', label: 'Alerta' },
];

const TYPE_COLORS: Record<string, string> = {
  error: '#F43F5E',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

const TYPE_BG_COLORS: Record<string, string> = {
  error: '#FEF2F2',
  warning: '#FFFBEB',
  success: '#ECFDF5',
  info: '#EFF6FF',
};

export const NotificationsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const [data, setData] = useState<ScheduledNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ScheduledNotification | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    frequency: 'ONCE',
    timeOfDay: '08:00',
    scheduledAt: '',
    persistent: false,
    active: true,
  });

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (p = 1, append = false) => {
      if (!append) setLoading(true);
      try {
        const filters: any = {};
        if (statusFilter === 'ACTIVE') filters.status = 'active';
        if (statusFilter === 'INACTIVE') filters.status = 'inactive';

        const res = await getPaginatedNotifications({
          page: p,
          limit: 15,
          search,
          filters,
        });
        if (append) {
          setData(prev => [...prev, ...res.data]);
        } else {
          setData(res.data);
        }
        setTotal(res.total);
        setHasMore(res.data.length === 15);
        setPage(p);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData(1);
    }, [fetchData]),
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', message: '', type: 'info', frequency: 'ONCE', timeOfDay: '08:00', scheduledAt: '', persistent: false, active: true });
    setModalVisible(true);
  };

  const openEdit = (row: ScheduledNotification) => {
    setEditing(row);
    setForm({
      title: row.title || '',
      message: row.message,
      type: row.type,
      frequency: row.frequency || 'ONCE',
      timeOfDay: row.timeOfDay || '08:00',
      scheduledAt: row.scheduledAt ? dayjs(row.scheduledAt).format('YYYY-MM-DDTHH:mm') : '',
      persistent: row.persistent,
      active: row.active,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.message.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      };
      if (form.frequency === 'ONCE') {
        delete payload.timeOfDay;
      }
      const res = editing
        ? await updateScheduledNotification(editing.id, payload)
        : await createScheduledNotification(payload);
      if (res.success) {
        dispatch(showToast({ message: editing ? 'Actualizado' : 'Creado', type: 'success' }));
        setModalVisible(false);
        setEditing(null);
        fetchData(1);
      } else {
        dispatch(showToast({ message: res.messages?.[0] || 'Error', type: 'error' }));
      }
    } catch (err: any) {
      dispatch(showToast({ message: err?.messages?.[0] || 'Error', type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await deleteScheduledNotification(deleteId);
      if (res.success) {
        dispatch(showToast({ message: 'Eliminada', type: 'success' }));
        setDeleteId(null);
        fetchData(1);
      }
    } catch (err: any) {
      dispatch(showToast({ message: err?.messages?.[0] || 'Error', type: 'error' }));
    } finally {
      setDeleting(false);
    }
  };

  const handleSendNow = async (row: ScheduledNotification) => {
    setSendingId(row.id);
    try {
      const res = await sendNotificationNow({
        title: row.title,
        message: row.message,
        type: row.type,
        channel: row.channel || 'global',
        userId: row.userId || undefined,
        persistent: row.persistent,
      });
      if (res.success) {
        dispatch(showToast({ message: 'Notificación enviada', type: 'success' }));
      }
    } catch (err: any) {
      dispatch(showToast({ message: err?.messages?.[0] || 'Error', type: 'error' }));
    } finally {
      setSendingId(null);
    }
  };

  const filterBadges = (
    <View style={styles.filterRow}>
      {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
        <ITTouchableOpacity
          key={f}
          onPress={() => { setStatusFilter(f); setPage(1); }}
          style={[
            styles.filterChip,
            statusFilter === f && styles.filterChipActive,
          ]}
        >
          <ITText
            variant="labelSmall"
            weight="bold"
            color={statusFilter === f ? '#fff' : '#64748B'}
          >
            {f === 'ALL' ? 'TODAS' : f === 'ACTIVE' ? 'ACTIVAS' : 'PAUSADAS'}
          </ITText>
        </ITTouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: ScheduledNotification }) => {
    const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.info;
    const typeBg = TYPE_BG_COLORS[item.type] || TYPE_BG_COLORS.info;

    return (
      <ITCard style={styles.card} mode="elevated">
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeBg }]}>
            <Icon source="bell-ring-outline" size={20} color={typeColor} />
          </View>
          <View style={styles.headerInfo}>
            <ITText variant="titleSmall" weight="700" color="#0F172A" numberOfLines={1}>
              {item.title || 'Sin título'}
            </ITText>
            <ITText variant="bodySmall" color="#64748B" numberOfLines={1}>
              {item.message}
            </ITText>
          </View>
          <ITBadge
            variant={item.active ? 'success' : 'error'}
            label={item.active ? 'ACTIVO' : 'PAUSADO'}
            size="small"
            dot
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoItem}>
            <Icon source="calendar" size={16} color="#64748B" />
            <ITText variant="bodySmall" weight="500" color="#334155">
              {FREQ_OPTIONS.find(f => f.id === item.frequency)?.label || item.frequency}
              {item.timeOfDay && ` · ${item.timeOfDay} hrs`}
            </ITText>
          </View>
          <View style={styles.infoItem}>
            <Icon source="send" size={16} color="#64748B" />
            <ITText variant="bodySmall" weight="500" color="#334155">
              {item.sendCount} envíos
              {item.nextSendAt && ` · Próx: ${dayjs(item.nextSendAt).format('DD/MM HH:mm')}`}
            </ITText>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <ITTouchableOpacity
            style={styles.footerButton}
            onPress={() => handleSendNow(item)}
            disabled={sendingId === item.id}
          >
            {sendingId === item.id ? (
              <ActivityIndicator size={14} color={theme.colors.primary} />
            ) : (
              <Icon source="send" size={16} color={theme.colors.primary} />
            )}
            <ITText variant="labelSmall" weight="600" color={theme.colors.primary}>
              Enviar
            </ITText>
          </ITTouchableOpacity>

          <View style={styles.dividerVertical} />

          <ITTouchableOpacity style={styles.footerButton} onPress={() => openEdit(item)}>
            <Icon source="pencil" size={16} color="#F59E0B" />
            <ITText variant="labelSmall" weight="600" color="#F59E0B">
              Editar
            </ITText>
          </ITTouchableOpacity>

          <View style={styles.dividerVertical} />

          <ITTouchableOpacity style={styles.footerButton} onPress={() => setDeleteId(item.id)}>
            <Icon source="delete" size={16} color="#EF4444" />
            <ITText variant="labelSmall" weight="600" color="#EF4444">
              Eliminar
            </ITText>
          </ITTouchableOpacity>
        </View>
      </ITCard>
    );
  };

  return (
    <>
      <ITScreenDatatableLayout
        title="Notificaciones Programadas"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchData(1); }}
        searchQuery={search}
        onSearchChange={setSearch}
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        filterBadges={filterBadges}
        onLoadMore={() => hasMore && fetchData(page + 1, true)}
        onFilterPress={() => {}}
      />

      {/* Create / Edit Modal */}
      <ITDialog
        visible={modalVisible}
        onDismiss={() => { setModalVisible(false); setEditing(null); }}
        title=""
        icon="bell-ring-outline"
        iconBackgroundColor={theme.colors.primary + '20'}
        iconColor={theme.colors.primary}
        confirmLabel={editing ? 'Actualizar' : 'Crear'}
        onConfirm={handleSave}
        loading={saving}
        confirmDisabled={!form.message.trim()}
      >
        <View style={styles.formGrid}>
          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setShowTypePicker(true)}
          >
            <ITText variant="labelSmall" weight="bold" color="#64748B">Tipo</ITText>
            <View style={styles.selectValue}>
              <ITText variant="bodyMedium" color="#0F172A">
                {TYPE_OPTIONS.find(o => o.id === form.type)?.label || form.type}
              </ITText>
              <Icon source="chevron-down" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectField}
            onPress={() => setShowFreqPicker(true)}
          >
            <ITText variant="labelSmall" weight="bold" color="#64748B">Frecuencia</ITText>
            <View style={styles.selectValue}>
              <ITText variant="bodyMedium" color="#0F172A">
                {FREQ_OPTIONS.find(o => o.id === form.frequency)?.label || form.frequency}
              </ITText>
              <Icon source="chevron-down" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {form.frequency === 'ONCE' ? (
          <ITInput
            label="Fecha y hora de envío"
            value={form.scheduledAt}
            onChangeText={t => setForm(p => ({ ...p, scheduledAt: t }))}
            placeholder="YYYY-MM-DDTHH:mm"
          />
        ) : (
          <ITInput
            label="Hora de envío"
            value={form.timeOfDay}
            onChangeText={t => setForm(p => ({ ...p, timeOfDay: t }))}
            placeholder="HH:mm"
          />
        )}

        <ITInput
          label="Título (opcional)"
          value={form.title}
          onChangeText={t => setForm(p => ({ ...p, title: t }))}
          placeholder="Ej: Cambio de turno"
        />

        <ITInput
          label="Mensaje *"
          value={form.message}
          onChangeText={t => setForm(p => ({ ...p, message: t }))}
          multiline
          numberOfLines={3}
          placeholder="Escribe el mensaje..."
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <ITText variant="bodySmall" weight="bold" color="#334155">Notificación activa</ITText>
            <ITText variant="labelSmall" color="#94A3B8">Desactívala para pausar los envíos</ITText>
          </View>
          <Switch
            value={form.active}
            onValueChange={v => setForm(p => ({ ...p, active: v }))}
            color={theme.colors.primary}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <ITText variant="bodySmall" weight="bold" color="#334155">Notificación persistente</ITText>
            <ITText variant="labelSmall" color="#94A3B8">El usuario deberá descartarla manualmente</ITText>
          </View>
          <Switch
            value={form.persistent}
            onValueChange={v => setForm(p => ({ ...p, persistent: v }))}
            color={theme.colors.primary}
          />
        </View>
      </ITDialog>

      {/* Type Picker */}
      <ActionPickerModal
        visible={showTypePicker}
        onDismiss={() => setShowTypePicker(false)}
        title="Tipo de notificación"
        icon="bell-ring-outline"
        options={TYPE_OPTIONS.map(o => ({ ...o, selected: o.id === form.type }))}
        onSelect={o => { setForm(p => ({ ...p, type: o.id })); setShowTypePicker(false); }}
      />

      {/* Frequency Picker */}
      <ActionPickerModal
        visible={showFreqPicker}
        onDismiss={() => setShowFreqPicker(false)}
        title="Frecuencia"
        icon="calendar-repeat"
        options={FREQ_OPTIONS.map(o => ({ ...o, selected: o.id === form.frequency }))}
        onSelect={o => { setForm(p => ({ ...p, frequency: o.id })); setShowFreqPicker(false); }}
      />

      {/* Delete Confirmation */}
      <ITAlert
        visible={!!deleteId}
        title="Eliminar notificación"
        description="Esta acción es permanente."
        type="alert"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
        onDismiss={() => setDeleteId(null)}
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
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  cardBody: { gap: 8, marginBottom: 0 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  dividerVertical: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  formGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  selectField: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    width: '100%',
    marginBottom: 8,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
});
