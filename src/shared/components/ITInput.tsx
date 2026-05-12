import React, { useState } from 'react';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { theme } from '../theme/theme';

interface ITInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: (e: any) => void;
  error?: any; // Soporta FormikErrors
  touched?: any; // Soporta FormikTouched
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  placeholder?: string;
  mode?: 'flat' | 'outlined';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  showCharCount?: boolean;
  rows?: number;
  rowsMax?: number;
  testID?: string;
}

export const ITInput: React.FC<ITInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  touched,
  secureTextEntry,
  keyboardType = 'default',
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  style,
  inputStyle,
  placeholder,
  mode = 'outlined',
  autoCapitalize = 'sentences',
  maxLength,
  showCharCount = false,
  rows,
  rowsMax,
  testID,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const hasError = touched && !!error;
  const characterCount = value.length;

  // Determinar líneas para multiline
  const getNumberOfLines = () => {
    if (rows) return rows;
    if (multiline) return numberOfLines;
    return 1;
  };

  // Calcular altura dinámica para multiline
  const getMultilineHeight = () => {
    if (!multiline) return undefined;
    if (rows) return rows * 24;
    return numberOfLines * 24;
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        testID={testID}
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={e => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        onFocus={() => setIsFocused(true)}
        error={hasError}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={getNumberOfLines()}
        disabled={disabled}
        placeholder={placeholder}
        mode={mode}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          { minHeight: getMultilineHeight() },
          isFocused && !hasError && styles.inputFocused,
          hasError && styles.inputError,
          inputStyle,
        ]}
        outlineStyle={[
          styles.outline,
          isFocused && !hasError && styles.outlineFocused,
          hasError && styles.outlineError,
        ]}
        contentStyle={multiline && styles.multilineContent}
        theme={{
          colors: {
            primary: theme.colors.primary,
            error: '#EF4444',
            background: 'transparent',
          },
        }}
        left={
          leftIcon ? (
            <TextInput.Icon
              icon={leftIcon}
              color={
                hasError
                  ? '#EF4444'
                  : isFocused
                  ? theme.colors.primary
                  : '#94A3B8'
              }
              forceTextInputFocus={false}
            />
          ) : null
        }
        right={
          rightIcon ? (
            <TextInput.Icon
              icon={rightIcon}
              onPress={onRightIconPress}
              color={
                hasError
                  ? '#EF4444'
                  : isFocused
                  ? theme.colors.primary
                  : '#94A3B8'
              }
              forceTextInputFocus={false}
            />
          ) : null
        }
      />

      {/* Char Counter para multiline */}
      {showCharCount && multiline && maxLength && (
        <View style={styles.charCountContainer}>
          <Text
            style={[
              styles.charCountText,
              characterCount > maxLength * 0.9 && styles.charCountWarning,
              characterCount >= maxLength && styles.charCountError,
            ]}
          >
            {characterCount} / {maxLength}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {hasError && (
        <Text style={[styles.errorText, { color: '#EF4444' }]}>
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    minHeight: 48,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },
  multilineContent: {
    paddingVertical: 12,
  },
  inputFocused: {
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    backgroundColor: '#FEF2F2',
  },
  outline: {
    borderRadius: 14,
    borderWidth: 1,
  },
  outlineFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  outlineError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginRight: 4,
  },
  charCountText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  charCountWarning: {
    color: '#F59E0B',
  },
  charCountError: {
    color: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
});
