import { Icon } from 'react-native-paper';
import {
  ITBadge,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';
import { IUser } from '../service/user.types';
import { StyleSheet, View } from 'react-native';

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
  const initial = item.name ? item.name.charAt(0).toUpperCase() : 'U';

  const getRoleVariant = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return 'error';
      case 'SUPERVISOR':
        return 'primary';
      case 'GUARD':
        return 'success';
      default:
        return 'default';
    }
  };

  const isActive = item.active;

  return (
    <ITTouchableOpacity onPress={() => onPress(item)}>
      <View style={[styles.card, !isActive && styles.cardInactive]}>
        {/* Header: Avatar + Info + Status */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <ITText style={styles.avatarText}>{initial}</ITText>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isActive ? '#10B981' : '#EF4444' },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ITText
                variant="titleSmall"
                weight="bold"
                style={styles.userName}
                numberOfLines={1}
              >
                {item.name} {item.lastName}
              </ITText>
              <ITBadge
                style={{ alignSelf: 'flex-start', margin: 0 }}
                labelStyle={{
                  fontSize: 10,
                }}
                label={item.role?.value?.toUpperCase() || 'USUARIO'}
                variant={getRoleVariant(item.role?.name)}
                size="small"
                outline
              />
              <View style={styles.headerMeta}>
                <View style={styles.metaChip}>
                  <ITText variant="labelSmall" style={styles.metaChipText}>
                    @{item.username}
                  </ITText>
                </View>
              </View>
            </View>
          </View>

          <ITBadge
            label={isActive ? 'Activo' : 'Inactivo'}
            variant={isActive ? 'success' : 'error'}
            size="small"
            dot={isActive}
          />
        </View>

        {/* Body: Relation Info */}
        <View style={styles.cardBody}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Icon source="office-building" size={12} color={theme.colors.primary} />
              </View>
              <ITText
                variant="labelSmall"
                style={styles.infoText}
                numberOfLines={1}
              >
                {item.client?.name || 'Sin cliente'}
              </ITText>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Icon
                  source="clock-outline"
                  size={12}
                  color={theme.colors.primary}
                />
              </View>
              <ITText
                variant="labelSmall"
                style={styles.infoText}
                numberOfLines={1}
              >
                {item.schedule ? `${item.schedule.name}` : 'Sin horario'}
              </ITText>
            </View>
          </View>
        </View>

        {/* Footer: Quick Actions */}
        <View style={styles.cardFooter}>
          <ITTouchableOpacity
            style={styles.footerButton}
            onPress={() => onResetPassword(item)}
          >
            <Icon
              source="shield-key-outline"
              size={16}
              color={theme.colors.primary}
            />
            <ITText style={styles.footerButtonText}>Seguridad</ITText>
          </ITTouchableOpacity>

          <View style={styles.footerSeparator} />

          <ITTouchableOpacity
            style={styles.footerButton}
            onPress={() => onDelete(item.id)}
          >
            <Icon source="trash-can-outline" size={16} color="#EF4444" />
            <ITText style={[styles.footerButtonText, { color: '#EF4444' }]}>
              Eliminar
            </ITText>
          </ITTouchableOpacity>
        </View>
      </View>
    </ITTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardInactive: {
    backgroundColor: '#F8FAFC',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    color: '#0F172A',
    fontSize: 15,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaChipText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  infoIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#475569',
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
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
  footerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  footerSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
});
