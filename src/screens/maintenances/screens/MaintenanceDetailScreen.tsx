import { useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import {
  ITAlert,
  ITBadge,
  ITMediaPreviewSection,
  ITScreenWrapper,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { CATEGORIES_INFO as CATEGORIES } from '../../../shared/utils/constants';
import {
  deleteMaintenance,
  resolveMaintenance,
} from '../service/maintenance.service';

const { width } = Dimensions.get('window');

export const MaintenanceDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const { goBack } = useAppNavigation();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);

  const [maintenance, setMaintenance] = useState(route.params.maintenance);
  const [resolving, setResolving] = useState(false);
  const [showResolveAlert, setShowResolveAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const getCategoryInfo = (category: any) => {
    if (category && typeof category === 'object') {
      return {
        label: category.name || category.value || 'General',
        color: category.color || '#64748B',
        icon: category.icon || 'wrench',
      };
    }
    return (
      CATEGORIES[category as keyof typeof CATEGORIES] || {
        label: category || 'Mantenimiento',
        color: '#64748B',
        icon: 'wrench',
      }
    );
  };

  const onConfirmResolve = async () => {
    setShowResolveAlert(false);
    setResolving(true);
    const res = await resolveMaintenance(maintenance.id);
    setResolving(false);

    if (res.success && res.data) {
      setMaintenance(res.data);
      dispatch(
        showToast({ message: 'Atendido correctamente', type: 'success' }),
      );
      setTimeout(() => goBack(), 500);
    } else {
      dispatch(showToast({ message: 'Error al actualizar', type: 'error' }));
    }
  };

  const onConfirmDelete = async () => {
    setShowDeleteAlert(false);
    setResolving(true);
    const res = await deleteMaintenance(maintenance.id);
    setResolving(false);

    if (res.success) {
      dispatch(
        showToast({ message: 'Eliminado correctamente', type: 'success' }),
      );
      goBack();
    } else {
      dispatch(showToast({ message: 'Error al eliminar', type: 'error' }));
    }
  };

  const getDateTime = (date: string) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('es-ES', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const categoryInfo = getCategoryInfo(maintenance.category);
  const dateTime = getDateTime(maintenance.createdAt);

  const isPending = maintenance.status === 'PENDING' || !maintenance.status;
  const canResolve =
    isPending &&
    (user.role === UserRole.ADMIN ||
      user.role === UserRole.SHIFT ||
      user.role === UserRole.MAINT);

  return (
    <ITScreenWrapper padding={false} backgroundColor="#F8FAFC">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <ITBadge
              label={isPending ? 'PENDIENTE' : 'ATENDIDO'}
              variant={isPending ? 'error' : 'success'}
              size="medium"
              dot={isPending}
            />

            <View style={styles.topActions}>
              {canResolve && (
                <ITTouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={() => setShowResolveAlert(true)}
                >
                  <Icon source="check-circle" size={20} color="#10B981" />
                </ITTouchableOpacity>
              )}
              {user.role === UserRole.ADMIN && (
                <ITTouchableOpacity
                  style={[styles.headerActionBtn, styles.deleteBtn]}
                  onPress={() => setShowDeleteAlert(true)}
                >
                  <Icon source="delete" size={20} color="#EF4444" />
                </ITTouchableOpacity>
              )}
            </View>
          </View>

          <ITText variant="headlineSmall" weight="bold" style={styles.title}>
            {maintenance.title}
          </ITText>

          <View style={styles.categoryInfoRow}>
            <View
              style={[
                styles.categoryIconBox,
                { backgroundColor: categoryInfo.color + '10' },
              ]}
            >
              <Icon
                source={categoryInfo.icon}
                size={18}
                color={categoryInfo.color}
              />
            </View>
            <ITText
              variant="bodyMedium"
              weight="600"
              style={{ color: categoryInfo.color }}
            >
              {categoryInfo.label}
            </ITText>
          </View>
        </View>

        {/* Meta Information */}
        <View style={styles.metaSection}>
          <View style={styles.metaCard}>
            <View style={styles.metaItem}>
              <View style={styles.metaIconBox}>
                <Icon
                  source="calendar"
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <ITText variant="bodySmall" style={styles.metaText}>
                {dateTime.date}
              </ITText>
              <View style={styles.metaSeparator} />
              <View style={styles.metaIconBox}>
                <Icon
                  source="clock-outline"
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <ITText variant="bodySmall" style={styles.metaText}>
                {dateTime.time}
              </ITText>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaItem}>
              <View style={styles.metaIconBox}>
                <Icon
                  source="office-building"
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <ITText variant="bodySmall" style={styles.metaText}>
                {maintenance.client?.name || 'Sin cliente'}
              </ITText>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Reported By */}
          <View>
            <ITText variant="labelSmall" style={styles.sectionLabel}>
              REPORTADO POR
            </ITText>
            <View style={styles.guardCard}>
              <View style={styles.guardInfo}>
                <View style={styles.guardAvatar}>
                  <ITText style={styles.guardAvatarText}>
                    {maintenance.guard?.name?.charAt(0) || 'G'}
                  </ITText>
                </View>
                <View>
                  <ITText
                    variant="bodyLarge"
                    weight="bold"
                    style={styles.guardName}
                  >
                    {maintenance.guard?.name || 'Desconocido'}
                  </ITText>
                  <ITText variant="labelSmall" style={styles.guardRole}>
                    Personal de Seguridad
                  </ITText>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          <View>
            <ITText
              variant="labelSmall"
              style={[styles.sectionLabel, { marginTop: 24 }]}
            >
              DETALLES DEL TRABAJO
            </ITText>
            <View style={styles.descriptionCard}>
              <ITText variant="bodyMedium" style={styles.description}>
                {maintenance.description || 'Sin descripción adicional.'}
              </ITText>
            </View>
          </View>

          {/* Media Section */}
          <ITMediaPreviewSection media={maintenance.media} />
        </View>
      </ScrollView>

      <ITAlert
        visible={showResolveAlert}
        title="Finalizar Mantenimiento"
        description="¿Confirmas que el trabajo ha sido completado correctamente?"
        confirmLabel="Confirmar"
        onDismiss={() => setShowResolveAlert(false)}
        onConfirm={onConfirmResolve}
        loading={resolving}
      />

      <ITAlert
        visible={showDeleteAlert}
        title="Eliminar Reporte"
        description="Esta acción es permanente. ¿Estás seguro de que deseas eliminar este reporte?"
        confirmLabel="Eliminar"
        type="alert"
        onDismiss={() => setShowDeleteAlert(false)}
        onConfirm={onConfirmDelete}
        loading={resolving}
      />
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  deleteBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 12,
    lineHeight: 28,
  },
  categoryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaSection: {
    paddingHorizontal: 20,
    marginTop: -16,
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    color: '#334155',
    fontSize: 13,
  },
  metaSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  guardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  guardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guardAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  guardName: {
    color: '#0F172A',
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  guardRole: {
    color: '#64748B',
    fontSize: 11,
  },
  descriptionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  description: {
    lineHeight: 22,
    color: '#334155',
    fontSize: 14,
  },
});
