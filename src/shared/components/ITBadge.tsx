import { StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { theme } from '../theme/theme';
import { ITText } from './ITText';
import { ITTouchableOpacity } from './ITTouchableOpacity';

interface ITBadgeProps {
  label: string;
  variant?:
    | 'primary'
    | 'secondary'
    | 'error'
    | 'success'
    | 'warning'
    | 'info'
    | 'default';
  outline?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  dot?: boolean; // Nueva prop para indicador de punto
  icon?: string; // Nueva prop para icono (opcional)
}

export const ITBadge: React.FC<ITBadgeProps> = ({
  label,
  variant = 'default',
  outline = false,
  style,
  labelStyle,
  size = 'medium',
  onPress,
  dot = false,
  icon,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: '#EEF2FF',
          text: theme.colors.primary,
          border: theme.colors.primary,
          dot: theme.colors.primary,
        };
      case 'secondary':
        return {
          bg: '#F1F5F9',
          text: '#64748B',
          border: '#64748B',
          dot: '#64748B',
        };
      case 'error':
        return {
          bg: '#FEF2F2',
          text: '#EF4444',
          border: '#EF4444',
          dot: '#EF4444',
        };
      case 'success':
        return {
          bg: '#F0FDF4',
          text: '#10B981',
          border: '#10B981',
          dot: '#10B981',
        };
      case 'warning':
        return {
          bg: '#FFFBEB',
          text: '#F59E0B',
          border: '#F59E0B',
          dot: '#F59E0B',
        };
      case 'info':
        return {
          bg: '#EFF6FF',
          text: '#3B82F6',
          border: '#3B82F6',
          dot: '#3B82F6',
        };
      default:
        return {
          bg: '#F8FAFC',
          text: '#475569',
          border: '#CBD5E1',
          dot: '#94A3B8',
        };
    }
  };

  const colors = getColors();

  const sizes = {
    small: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      fontSize: 'labelSmall' as const,
      dotSize: 6,
      borderRadius: 16,
    },
    medium: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      fontSize: 'labelMedium' as const,
      dotSize: 8,
      borderRadius: 20,
    },
    large: {
      paddingVertical: 8,
      paddingHorizontal: 18,
      fontSize: 'labelLarge' as const,
      dotSize: 10,
      borderRadius: 24,
    },
  };

  const currentSize = sizes[size];

  const content = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: outline ? 'transparent' : colors.bg,
          borderColor: colors.border,
          borderWidth: outline ? 1 : 0,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderRadius: currentSize.borderRadius,
        },
        style,
      ]}
    >
      <View style={styles.contentContainer}>
        {dot && !icon && (
          <View
            style={[
              styles.dot,
              {
                width: currentSize.dotSize,
                height: currentSize.dotSize,
                borderRadius: currentSize.dotSize / 2,
                backgroundColor: colors.dot,
              },
            ]}
          />
        )}
        <ITText
          variant={currentSize.fontSize}
          weight={outline ? '600' : '500'}
          color={outline ? colors.border : colors.text}
          style={[
            styles.label,
            labelStyle,
            (dot || icon) && styles.labelWithIcon,
          ]}
        >
          {label}
        </ITText>
      </View>
    </View>
  );

  if (onPress) {
    return <ITTouchableOpacity onPress={onPress}>{content}</ITTouchableOpacity>;
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    marginRight: 2,
  },
  label: {
    letterSpacing: -0.2,
  },
  labelWithIcon: {
    marginLeft: 0,
  },
});
