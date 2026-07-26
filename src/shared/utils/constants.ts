/**
 * @deprecated Import from 'src/shared/theme/theme' or 'src/shared/utils/categories.constants' instead.
 * This file is kept as a thin shim to avoid breaking existing imports during migration.
 */
import { theme } from '../theme/theme';

export const COLORS = {
  primary: theme.colors.primary,
  primaryLight: theme.colors.primaryContainer,
  secondary: theme.colors.secondary,
  tertiary: theme.colors.tertiary,
  textPrimary: theme.colors.onBackground,
  textSecondary: theme.colors.slate500,
  pendingCard: theme.colors.pendingCard,
  pendingBorder: theme.colors.pendingBorder,
  background: theme.colors.background,
  surface: theme.colors.surface,
  surfaceVariant: theme.colors.surfaceVariant,
  border: theme.colors.border,
  error: theme.colors.error,
  warning: theme.colors.amber,
  success: theme.colors.success,
  complete: theme.colors.complete,
  pending: theme.colors.pending,
  emerald: theme.colors.emerald,
  red: theme.colors.red,
  redLight: theme.colors.redLight,
  orange: theme.colors.orange,
  orangeLight: theme.colors.orangeLight,
  slate: theme.colors.slate500,
  slateLight: theme.colors.slate100,
  blue: theme.colors.blue,
  purple: theme.colors.purple,
  pink: theme.colors.pink,
  cyan: theme.colors.cyan,
  indigo: theme.colors.indigoBrand,
  amber: theme.colors.amber,
  white: theme.colors.white,
  rounds: theme.colors.rounds,
  incidents: theme.colors.incidents,
  maintenance: theme.colors.maintenance,
};

export { CATEGORIES_INFO } from './categories.constants';
