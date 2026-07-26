export interface CategoryInfo {
  label: string;
  color: string;
  icon: string;
}

export const CATEGORIES_INFO: Record<string, CategoryInfo> = {
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
