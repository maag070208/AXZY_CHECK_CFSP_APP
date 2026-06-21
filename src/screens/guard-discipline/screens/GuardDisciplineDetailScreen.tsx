import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import { UserRole } from '../../../core/types/IUser';
import {
  ITBadge,
  ITInput,
  ITModal,
  ITScreenWrapper,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { IGuardDiscipline, resolveDiscipline } from '../service/GuardDisciplineService';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Tijuana';

export const GuardDisciplineDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userState);

  const [record, setRecord] = useState<IGuardDiscipline>(route.params.record);
  const [resolving, setResolving] = useState(false);
  const [modalMode, setModalMode] = useState<'RESOLVED' | 'DISMISSED' | null>(null);
  const [comment, setComment] = useState('');

  const isPending = record.status === 'PENDING';
  const canResolve = isPending && (user.role === UserRole.ADMIN || user.role === UserRole.SHIFT);

  const date = dayjs(record.createdAt).tz(TZ);
  const formattedDate = date.format('DD MMM YYYY');
  const timeStr = date.format('HH:mm');

  const handleConfirm = async () => {
    if (!modalMode) return;
    const mode = modalMode;
    setResolving(true);
    const res = await resolveDiscipline(record.id, {
      status: mode,
      description: comment.trim() || undefined,
    });
    setResolving(false);
    setModalMode(null);
    setComment('');
    if (res.success && res.data) {
      setRecord(res.data as IGuardDiscipline);
      dispatch(
        showToast({
          message: mode === 'RESOLVED' ? 'Incidencia resuelta' : 'Incidencia desestimada',
          type: 'success',
        }),
      );
    } else {
      dispatch(showToast({ message: 'Error al actualizar', type: 'error' }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'PENDIENTE', variant: 'error' as const, dot: true };
      case 'RESOLVED':
        return { label: 'RESUELTO', variant: 'success' as const, dot: false };
      case 'DISMISSED':
        return { label: 'DESESTIMADO', variant: 'default' as const, dot: false };
      default:
        return { label: status, variant: 'default' as const, dot: false };
    }
  };

  const badge = getStatusBadge(record.status);

  return (
    <ITScreenWrapper padding={false} backgroundColor="#F8FAFC">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View style={styles.header}>
          <View style={styles.topRow}>
            <ITBadge
              label={badge.label}
              variant={badge.variant}
              size="medium"
              dot={badge.dot}
            />
            <View style={styles.topActions}>
              {canResolve && (
                <>
                  <ITTouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => { setComment(''); setModalMode('RESOLVED'); }}
                  >
                    <Icon source="check-circle" size={20} color="#10B981" />
                  </ITTouchableOpacity>
                  <ITTouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => { setComment(''); setModalMode('DISMISSED'); }}
                  >
                    <Icon source="close-circle" size={20} color="#EF4444" />
                  </ITTouchableOpacity>
                </>
              )}
            </View>
          </View>

          <ITText variant="headlineSmall" weight="bold" style={styles.title}>
            {record.title}
          </ITText>

          <View style={styles.categoryInfoRow}>
            {record.category && (
              <View
                style={[
                  styles.categoryIconBox,
                  { backgroundColor: (record.category.color || '#64748B') + '10' },
                ]}
              >
                <Icon
                  source={record.category.icon || 'alert-circle'}
                  size={18}
                  color={record.category.color || '#64748B'}
                />
              </View>
            )}
            <ITText
              variant="bodyMedium"
              weight="600"
              style={{ color: record.category?.color || '#64748B' }}
            >
              {record.category?.name || 'General'}
            </ITText>
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <View style={styles.metaIconBox}>
                <Icon source="calendar" size={16} color={theme.colors.primary} />
              </View>
              <ITText variant="bodySmall" style={styles.metaText}>
                {formattedDate}
              </ITText>
              <View style={styles.metaDot} />
              <View style={styles.metaIconBox}>
                <Icon source="clock-outline" size={16} color={theme.colors.primary} />
              </View>
              <ITText variant="bodySmall" style={styles.metaText}>
                {timeStr}
              </ITText>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <View style={styles.metaIconBox}>
                <Icon source="tag" size={16} color={theme.colors.primary} />
              </View>
              <ITText variant="bodySmall" style={styles.metaText}>
                {record.type?.name || 'Sin tipo'}
              </ITText>
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          <View>
            <ITText variant="labelSmall" style={styles.sectionLabel}>
              GUARDIA REPORTADO
            </ITText>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.avatar}>
                  <ITText style={styles.avatarText}>
                    {(record.guard?.name || 'G').charAt(0)}
                  </ITText>
                </View>
                <View>
                  <ITText variant="bodyLarge" weight="bold" style={styles.infoName}>
                    {record.guard?.name} {record.guard?.lastName || ''}
                  </ITText>
                  <ITText variant="labelSmall" style={styles.infoRole}>
                    @{record.guard?.username || ''}
                  </ITText>
                </View>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 24 }}>
            <ITText variant="labelSmall" style={styles.sectionLabel}>
              REPORTADO POR
            </ITText>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.avatar}>
                  <ITText style={styles.avatarText}>
                    {(record.createdBy?.name || 'U').charAt(0)}
                  </ITText>
                </View>
                <View>
                  <ITText variant="bodyLarge" weight="bold" style={styles.infoName}>
                    {record.createdBy?.name} {record.createdBy?.lastName || ''}
                  </ITText>
                  <ITText variant="labelSmall" style={styles.infoRole}>
                    @{record.createdBy?.username || ''}
                  </ITText>
                </View>
              </View>
            </View>
          </View>

          {record.description && (
            <View style={{ marginTop: 24 }}>
              <ITText variant="labelSmall" style={styles.sectionLabel}>
                OBSERVACIONES
              </ITText>
              <View style={styles.descCard}>
                <ITText variant="bodyMedium" style={styles.descText}>
                  {record.description}
                </ITText>
              </View>
            </View>
          )}

          {record.status === 'RESOLVED' && (
            <View style={{ marginTop: 24 }}>
              <View style={[styles.statusBanner, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
                <Icon source="check-circle" size={20} color="#059669" />
                <View style={{ flex: 1 }}>
                  <ITText weight="bold" color="#065F46" style={{ fontSize: 13 }}>
                    Resuelta
                  </ITText>
                  <ITText color="#047857" style={{ fontSize: 11 }}>
                    Esta incidencia ha sido marcada como resuelta.
                  </ITText>
                </View>
              </View>
            </View>
          )}

          {record.status === 'DISMISSED' && (
            <View style={{ marginTop: 24 }}>
              <View style={[styles.statusBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                <Icon source="close-circle" size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <ITText weight="bold" color="#991B1B" style={{ fontSize: 13 }}>
                    Desestimada
                  </ITText>
                  <ITText color="#B91C1C" style={{ fontSize: 11 }}>
                    Esta incidencia ha sido desestimada.
                  </ITText>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <ITModal
        visible={modalMode !== null}
        onDismiss={() => { setModalMode(null); setComment(''); }}
        title={modalMode === 'RESOLVED' ? 'Resolver Incidencia' : 'Desestimar Incidencia'}
        icon={modalMode === 'RESOLVED' ? 'check-circle' : 'close-circle'}
        iconColor={modalMode === 'RESOLVED' ? '#10B981' : '#EF4444'}
        confirmLabel="Confirmar"
        onConfirm={handleConfirm}
        confirmColor={modalMode === 'RESOLVED' ? '#10B981' : '#EF4444'}
        loading={resolving}
      >
        <ITInput
          label="Motivo (opcional)"
          placeholder="Agrega un comentario..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />
      </ITModal>
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
  resolveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  dismissBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
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
    shadowRadius: 8,
    elevation: 1,
  },
  metaRow: {
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
  metaDot: {
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  infoName: {
    color: '#0F172A',
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  infoRole: {
    color: '#64748B',
    fontSize: 11,
  },
  descCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  descText: {
    lineHeight: 22,
    color: '#334155',
    fontSize: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
});