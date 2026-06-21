import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FAB, Icon, Searchbar } from 'react-native-paper';
import { useDispatch } from 'react-redux';

import { RouteProp, useRoute } from '@react-navigation/native';
import { showToast } from '../../../core/store/slices/toast.slice';
import { TResult } from '../../../core/types/TResult';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITText,
  ITBadge,
  ITTouchableOpacity,
  ITButton,
  ActionPickerModal,
  ITModal,
} from '../../../shared/components';
import { ITScreenDatatableLayout } from '../../../shared/components/ITScreenDatatableLayout';
import { getPaginatedUsers, updateUser } from '../../users/service/user.service';
import { IUser } from '../../users/service/user.types';
import { ClientStackParamList } from '../stack/ClientStack';
import { theme } from '../../../shared/theme/theme';
import { CLIENT_USER_ROLES } from '../../../core/constants/constants';
import { getSchedules } from '../../schedules/service/schedules.service';
import { getClients } from '../../clients/service/client.service';

type ClientGuardsRouteProp = RouteProp<ClientStackParamList, 'CLIENT_GUARDS'>;

export const ClientGuardsScreen = () => {
  const route = useRoute<ClientGuardsRouteProp>();
  const { clientId } = route.params;
  const dispatch = useDispatch();

  const [guards, setGuards] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const { navigateToScreen } = useAppNavigation();

  // Action modals
  const [changingGuard, setChangingGuard] = useState<IUser | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getSchedules().then(res => { if (res.success) setSchedules(res.data || []); });
    getClients().then(res => { if (res.success) setClients(res.data || []); });
  }, []);

  const handleScheduleChange = async (scheduleId: string) => {
    if (!changingGuard) return;
    setActionLoading(true);
    try {
      const res = await updateUser(changingGuard.id, { scheduleId });
      if (res.success) {
        dispatch(showToast({ message: 'Horario actualizado', type: 'success' }));
        setShowScheduleModal(false);
        fetchGuards(true);
      } else {
        dispatch(showToast({ message: res.messages?.[0] || 'Error', type: 'error' }));
      }
    } catch (e: any) {
      dispatch(showToast({ message: e?.messages?.[0] || 'Error', type: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClientChange = async (newClientId: string) => {
    if (!changingGuard) return;
    setActionLoading(true);
    try {
      const res = await updateUser(changingGuard.id, { clientId: newClientId });
      if (res.success) {
        dispatch(showToast({ message: 'Cliente actualizado', type: 'success' }));
        setShowClientModal(false);
        fetchGuards(true);
      } else {
        dispatch(showToast({ message: res.messages?.[0] || 'Error', type: 'error' }));
      }
    } catch (e: any) {
      dispatch(showToast({ message: e?.messages?.[0] || 'Error', type: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!changingGuard) return;
    setActionLoading(true);
    try {
      const res = await updateUser(changingGuard.id, { active: !changingGuard.active });
      if (res.success) {
        dispatch(showToast({ message: changingGuard.active ? 'Guardia desactivado' : 'Guardia activado', type: 'success' }));
        setShowToggleModal(false);
        fetchGuards(true);
      } else {
        dispatch(showToast({ message: res.messages?.[0] || 'Error', type: 'error' }));
      }
    } catch (e: any) {
      dispatch(showToast({ message: e?.messages?.[0] || 'Error', type: 'error' }));
    } finally {
      setActionLoading(false);
    }
  };

  const fetchGuards = async (isRefresh = false, isLoadMore = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const nextPage = isRefresh || !isLoadMore ? 1 : page + 1;
      const filters: any = { clientId };
      if (search) filters.name = search;
      if (roleFilter !== 'all') filters.role = roleFilter;

      const response = await getPaginatedUsers({
        page: nextPage,
        limit: 10,
        filters,
      });

      if (response.success && response.data) {
        if (isLoadMore) {
          setGuards(prev => [...prev, ...response.data.rows]);
          setPage(nextPage);
        } else {
          setGuards(response.data.rows);
          setPage(1);
        }
        setTotal(response.data.total);
      } else {
        dispatch(
          showToast({
            type: 'error',
            message: response.messages?.[0] || 'Error al cargar guardias',
          }),
        );
      }
    } catch (error) {
      const result = error as TResult<void>;
      dispatch(
        showToast({
          type: 'error',
          message: result?.messages?.[0] || 'Ocurrió un error en la solicitud',
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && !refreshing && guards.length < total) {
      fetchGuards(false, true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGuards();
    }, [clientId, search, roleFilter]),
  );

  const renderGuard = ({ item, index }: { item: IUser; index: number }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'G';

    return (
      <ITTouchableOpacity
        style={[styles.card, !item.active && styles.cardInactive]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <ITText style={styles.avatarText}>{initial}</ITText>
            <View style={[styles.statusDot, { backgroundColor: item.active ? '#10B981' : '#EF4444' }]} />
          </View>

          <View style={styles.headerInfo}>
            <ITText style={styles.guardName}>
              {item.name} {item.lastName}
            </ITText>
            <View style={styles.headerMeta}>
              <Icon source="at" size={12} color="#64748B" />
              <ITText variant="labelSmall" color="#64748B" style={{ marginLeft: 3 }}>
                {item.username}
              </ITText>
            </View>
          </View>

          <ITBadge
            label={item.active ? 'Activo' : 'Inactivo'}
            variant={item.active ? 'success' : 'error'}
            size="small"
            dot
          />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <Icon source="shield-outline" size={13} color="#64748B" />
          <ITText variant="labelSmall" color="#64748B" style={{ marginLeft: 4, marginRight: 12 }}>
            {CLIENT_USER_ROLES.find(r => r.value === item.role?.name)?.label || 'Sin rol'}
          </ITText>
          {item.schedule && (
            <>
              <Icon source="clock-outline" size={13} color="#64748B" />
              <ITText variant="labelSmall" color="#64748B" style={{ marginLeft: 4 }}>
                {item.schedule.name}
              </ITText>
            </>
          )}
        </View>

        {/* Footer actions */}
        <View style={styles.cardFooter}>
          <ITTouchableOpacity
            onPress={() => { setChangingGuard(item); setShowScheduleModal(true); }}
            style={styles.footerButton}
          >
            <Icon source="clock-outline" size={16} color="#F59E0B" />
            <ITText style={[styles.footerButtonText, { color: '#F59E0B' }] as any}>Horario</ITText>
          </ITTouchableOpacity>
          <View style={styles.footerDivider} />
          <ITTouchableOpacity
            onPress={() => { setChangingGuard(item); setShowClientModal(true); }}
            style={styles.footerButton}
          >
            <Icon source="domain" size={16} color="#3B82F6" />
            <ITText style={[styles.footerButtonText, { color: '#3B82F6' }] as any}>Cliente</ITText>
          </ITTouchableOpacity>
          <View style={styles.footerDivider} />
          <ITTouchableOpacity
            onPress={() => { setChangingGuard(item); setShowToggleModal(true); }}
            style={styles.footerButton}
          >
            <Icon source={item.active ? "power" : "power"} size={16} color={item.active ? '#EF4444' : '#10B981'} />
            <ITText style={[styles.footerButtonText, { color: item.active ? '#EF4444' : '#10B981' }] as any}>
              {item.active ? 'Desactivar' : 'Activar'}
            </ITText>
          </ITTouchableOpacity>
        </View>
      </ITTouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ITScreenDatatableLayout
        title="Guardias Asignados"
        totalItems={total}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => fetchGuards(true)}
        showSearchBar={true}
        searchQuery={search}
        onSearchChange={setSearch}
        searchBar={
          <Searchbar
            placeholder="Buscar guardia..."
            onChangeText={setSearch}
            value={search}
            mode="bar"
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            elevation={0}
          />
        }
        data={guards}
        renderItem={renderGuard}
        keyExtractor={item => item.id}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        fab={
          <FAB
            icon="shield-plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="white"
            onPress={() => {
              navigateToScreen('CLIENTS_STACK', 'CLIENT_USER_FORM', {
                clientId,
                allowedRoles: ['GUARD', 'SHIFT', 'MAINT'],
              });
            }}
          />
        }
      />

      {/* ===== MODAL ESTÁNDAR NATIVO: Cambiar Horario ===== */}
      <ActionPickerModal
        visible={showScheduleModal}
        onDismiss={() => setShowScheduleModal(false)}
        title="Cambiar Horario"
        icon="clock-outline"
        iconColor="#F59E0B"
        subtitle={`${changingGuard?.name} ${changingGuard?.lastName}`}
        options={schedules.map((s: any) => ({
          id: s.id,
          label: `${s.name} (${s.startTime} - ${s.endTime})`,
          icon: 'clock-outline',
          selected: changingGuard?.scheduleId === s.id,
        }))}
        onSelect={(opt) => handleScheduleChange(opt.id)}
        loading={actionLoading}
      />

      <ActionPickerModal
        visible={showClientModal}
        onDismiss={() => setShowClientModal(false)}
        title="Cambiar Cliente"
        icon="domain"
        iconColor="#3B82F6"
        subtitle={`${changingGuard?.name} ${changingGuard?.lastName}`}
        options={clients.map((c: any) => ({
          id: c.id,
          label: c.name,
          icon: 'domain',
          selected: changingGuard?.clientId === c.id,
        }))}
        onSelect={(opt) => handleClientChange(opt.id)}
        loading={actionLoading}
      />

      <ITModal
        visible={showToggleModal}
        onDismiss={() => setShowToggleModal(false)}
        title={changingGuard?.active ? 'Desactivar Guardia' : 'Activar Guardia'}
        icon={changingGuard?.active ? 'alert-circle-outline' : 'check-circle-outline'}
        iconColor={changingGuard?.active ? '#EF4444' : theme.colors.primary}
        confirmLabel={changingGuard?.active ? 'Desactivar' : 'Activar'}
        onConfirm={handleToggleStatus}
        confirmColor={changingGuard?.active ? '#EF4444' : theme.colors.primary}
        loading={actionLoading}
      >
        <ITText variant="bodyMedium" color="#334155" style={{ textAlign: 'center', paddingVertical: 8 }}>
          {changingGuard?.active
            ? 'El guardia perderá acceso inmediato a la aplicación.'
            : 'El guardia recuperará el acceso a la plataforma.'}
        </ITText>
      </ITModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    height: 48,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
    color: theme.colors.slate900,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  guardName: {
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  footerDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },

  // ====================================================
  //  NUEVO ESTÁNDAR DE MODAL: ULTRA-MINIMALISTA Y BLANCO
  // ====================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)', // Fondo oscuro traslúcido muy estético
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 24,         // Un espacio limpio pero sutil en el top
    paddingBottom: 4,        // Pegado de inmediato al contenido
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF', // Blanco absoluto garantizado
  },
  modalTitle: {
    fontSize: 19,
    color: '#0F172A',       // Texto oscuro legible
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 0,          // Eliminamos cualquier separación con el título
    paddingBottom: 24,
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 16,
    marginTop: 2,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F8FAFC', // Fondo gris claro muy limpio
  },
  modalItemSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  modalItemText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  confirmIconContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  confirmText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});