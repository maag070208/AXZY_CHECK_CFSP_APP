import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Divider } from 'react-native-paper';
import { ITCard, ITText, ITButton } from '../../../shared/components';
import { IUser, UserRole } from '../../../core/types/IUser';
import { COLORS } from '../../../shared/utils/constants';
import { theme } from '../../../shared/theme/theme';

interface UserListItemProps {
  item: IUser;
  onPress: (user: IUser) => void;
  onDelete: (id: string) => void;
  onResetPassword: (user: IUser) => void;
}

export const UserListItem = ({
  item,
  onPress,
  onDelete,
  onResetPassword,
}: UserListItemProps) => {
  const getRoleConfig = (role: any) => {
    const roleName = typeof role === 'object' ? role.name : role;
    const roleValue = typeof role === 'object' ? role.value : role;

    switch (roleName) {
      case UserRole.ADMIN:
        return { bg: '#FEE2E2', color: COLORS.red, label: roleValue };
      case UserRole.SHIFT:
        return { bg: '#E0E7FF', color: COLORS.indigo, label: roleValue };
      case UserRole.GUARD:
        return { bg: '#F5F3FF', color: COLORS.rounds, label: roleValue };
      case UserRole.MAINT:
        return { bg: '#FFFBEB', color: COLORS.maintenance, label: roleValue };
      case UserRole.RESDN:
        return { bg: '#F1F5F9', color: '#64748B', label: roleValue };
      default:
        return {
          bg: '#F8FAFC',
          color: '#94A3B8',
          label: roleValue || 'Usuario',
        };
    }
  };

  const config = getRoleConfig(item.role);

  return (
    <ITCard
      style={styles.itemCard}
      onPress={() => onPress(item)}
      mode="elevated"
    >
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.avatarSection}>
            <Avatar.Text
              size={52}
              label={item.name ? item.name[0].toUpperCase() : 'U'}
              style={[styles.avatar, { backgroundColor: config.bg }]}
              labelStyle={{ color: config.color, fontWeight: 'bold' }}
            />
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: item.active ? '#10B981' : '#CBD5E1' },
              ]}
            />
          </View>

          <View style={styles.infoSection}>
            <ITText variant="titleMedium" weight="bold" style={styles.userName}>
              {item.name} {item.lastName}
            </ITText>
            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
                <ITText
                  variant="labelSmall"
                  weight="bold"
                  color={config.color}
                  style={{ fontSize: 10 }}
                >
                  {config.label?.toUpperCase()}
                </ITText>
              </View>
              <ITText variant="labelSmall" color="#94A3B8">
                @{item.username}
              </ITText>
            </View>
          </View>
        </View>

        <View style={styles.detailsRow}>
           {item.schedule && (
              <View style={styles.detailItem}>
                <ITText variant="labelSmall" color="#64748B" weight="medium">
                    Horario: <ITText variant="labelSmall" color="#1E293B" weight="bold">{item.schedule.name}</ITText>
                </ITText>
              </View>
            )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.footer}>
            <ITButton 
                label="Seguridad"
                mode="text"
                icon="key-variant"
                onPress={() => onResetPassword(item)}
                style={styles.footerBtn}
                labelStyle={{ fontSize: 13, color: theme.colors.primary }}
            />
            <View style={styles.vDivider} />
            <ITButton 
                label="Eliminar"
                mode="text"
                icon="trash-can-outline"
                onPress={() => onDelete(item.id)}
                style={styles.footerBtn}
                labelStyle={{ fontSize: 13, color: theme.colors.error }}
            />
        </View>
      </View>
    </ITCard>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    borderWidth: 0,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoSection: {
    flex: 1,
  },
  userName: {
    color: '#1E293B',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  detailsRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 0,
    height: '100%',
    justifyContent: 'center',
  },
  vDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  }
});
