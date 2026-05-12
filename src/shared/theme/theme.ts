import { MD3LightTheme } from 'react-native-paper';

// Paleta base
const baseColors = {
  primary: '#46a545',
  onPrimary: '#FFFFFF',
  primaryContainer: '#d0f8d3',
  onPrimaryContainer: '#022104',
  secondary: '#54634d',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#d7e8cd',
  onSecondaryContainer: '#121f0e',
  tertiary: '#38656a',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#bcebf0',
  onTertiaryContainer: '#002022',
  error: '#BA1A1A',
  gray: '#c5c4c4ff',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#f8f8f8',
  onBackground: '#1B1B1F',
  surface: '#FBFDF7',
  onSurface: '#1B1B1F',
  surfaceVariant: '#dcddd8ff',
  onSurfaceVariant: '#44483D',
  outline: '#75796C',
  outlineVariant: '#C5C8BA',
  inverseSurface: '#2F312C',
  inverseOnSurface: '#F1F1EA',
  inversePrimary: '#d23c00ff',
  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(46, 48, 56, 0.4)',

  // Compatibilidad con componentes viejos
  activeSubstanceLink: '#065911',
  addressButton: '#065911',
  paragraph: '#666',
  graySystem: '#F4F4F4',
  grayDark: '#8d8d8d',
  lightGray: '#F4F4F4',
  darkGray: '#3C3C3C',
  success: '#065911',
  onSuccess: '#FFFFFF',
  successContainer: '#d0f8d3',
  onSuccessContainer: '#002201',
  warning: '#795900',
  onWarning: '#FFFFFF',
  warningContainer: '#ffdfa0',
  onWarningContainer: '#261a00',
  info: '#1c98dbff',
  onInfo: '#FFFFFF',
  infoContainer: '#cee5ff',
  onInfoContainer: '#001d32',
  TabNavigationBackground: '#f8f8f8',
  TabNavigationIcon: '#c1c1c4',
  TabNavigationIconFocused: '#065911',

  indigo: '#1fd036ff',
  indigo500: '#010101ff',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
};

export const ITTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...baseColors,
  },
  roundness: 3,
};

// Exportación como 'theme' para compatibilidad con importaciones viejas
export const theme = ITTheme;

export const AppStyles = {
  container: {
    flex: 1,
    backgroundColor: baseColors.background,
  },
  padding: {
    paddingHorizontal: 20,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
};
