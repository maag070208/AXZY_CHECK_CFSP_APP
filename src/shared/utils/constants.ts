export const COLORS = {
  primary: '#e65100', // Naranja oscuro
  primaryLight: '#fff3e0', // Naranja muy claro
  secondary: '#ff9800', // Naranja medio
  tertiary: '#ffb74d', // Naranja claro
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  pendingCard: '#FFF8F1', // Naranja suave para cards pendientes
  pendingBorder: '#FFE0B2',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',
  error: '#D32F2F',
  warning: '#FF9800',
  success: '#4CAF50',
  complete: '#4CAF50',
  pending: '#FF9800',

  // Tailwind-like shades often used in the app
  emerald: '#059669',
  red: '#DC2626',
  redLight: '#FEE2E2',
  orange: '#EA580C',
  orangeLight: '#FFEDD5',
  slate: '#64748B',
  slateLight: '#F1F5F9',
  blue: '#2563eb',
  purple: '#7c3aed',
  pink: '#db2777',
  cyan: '#0891b2',
  indigo: '#4f46e5',
  amber: '#f59e0b',
  white: '#FFFFFF',
  // Module Semantic Colors
  rounds: '#7c3aed', // Morado
  incidents: '#DC2626', // Rojo
  maintenance: '#f59e0b', // Amarillo/Amber
};

export const CATEGORIES_INFO: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  PLOMERIA: { label: 'PLOMERÍA', color: '#0288d1', icon: 'water-pump' },
  ELECTRICIDAD: {
    label: 'ELECTRICIDAD',
    color: '#fbc02d',
    icon: 'lightning-bolt',
  },
  ESTRUCTURA: { label: 'ESTRUCTURA', color: '#7b1fa2', icon: 'home-city' },
  JARDINERIA: { label: 'JARDINERÍA', color: '#388e3c', icon: 'pine-tree' },
  GENERAL: { label: 'GENERAL', color: '#e65100', icon: 'toolbox' },
};
