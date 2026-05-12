import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppNavigation } from '../../../navigation/hooks/useAppNavigation';
import { ITText } from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';

interface HomeItemComponentProps {
  icon: string;
  label: string;
  stack: any;
  screen: any;
  color?: string;
  badge?: number;
  params?: any;
}

export const HomeItemComponent = ({
  icon,
  label,
  stack,
  screen,
  color = theme.colors.primary,
  badge,
  params,
}: HomeItemComponentProps) => {
  const { resetToModule } = useAppNavigation();

  // Color de fondo suave para el icono
  const softBg = `${color}15`;

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => resetToModule(stack, screen, params)}
    >
      <View style={styles.contentContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: softBg }]}>
          <Icon source={icon} size={22} color={color} />
        </View>

        <ITText
          variant="labelMedium"
          weight="bold"
          color="#1E293B"
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </ITText>

        {badge ? (
          <View style={[styles.notificationBadge, { backgroundColor: color }]}>
            <ITText variant="labelSmall" weight="bold" color="#FFFFFF">
              {badge > 99 ? '+99' : badge}
            </ITText>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    height: 100,
    borderRadius: 24, // More curved, friendly look
    backgroundColor: '#FFFFFF',
    padding: 12,
    // Removed borderWidth and borderColor for a cleaner float
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22, // Perfect circle icon backgrounds
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    textAlign: 'center',
    width: '100%',
    color: '#334155', // slightly softer text
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF', // Cut out effect
  },
});
