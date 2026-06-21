import React from 'react';
import { ViewStyle, TextStyle, StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

interface ITButtonProps {
  label?: string;
  onPress: () => void;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  variant?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: any;
  labelStyle?: any;
  color?: string;
  textColor?: string;
  iconColor?: string;
  children?: React.ReactNode;
  testID?: string;
}

const sizeStyles = {
  sm: { height: 36, fontSize: 13 },
  md: { height: 48, fontSize: 16 },
  lg: { height: 56, fontSize: 18 },
};

export const ITButton: React.FC<ITButtonProps> = ({
  label,
  onPress,
  mode: modeProp,
  variant,
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  labelStyle,
  color,
  textColor,
  iconColor,
  children,
  testID,
}) => {
  const theme = useTheme();
  const mode = variant || modeProp || 'contained';
  const currentSize = sizeStyles[size];

  return (
    <Button
      testID={testID}
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      compact={size === 'sm'}
      style={[styles.button, style]}
      labelStyle={[styles.label, { fontSize: currentSize.fontSize }, labelStyle]}
      contentStyle={[styles.content, { height: currentSize.height }]}
      buttonColor={color}
      textColor={textColor}
    >
      {children || label}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
