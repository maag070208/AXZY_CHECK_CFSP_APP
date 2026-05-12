export const ROLE_GUARD = 'GUARD';
export const ROLE_SHIFT = 'SHIFT';
export const ROLE_MAINTENANCE = 'MAINT';
export const ROLE_ADMIN = 'ADMIN';
export const ROLE_CLIENT = 'RESDN';

export const OPERATIONAL_ROLES = [ROLE_GUARD, ROLE_SHIFT, ROLE_MAINTENANCE];

export const CLIENT_USER_ROLES = [
  { label: 'Usuario', value: 'RESDN' },
  { label: 'Jefe Guardias', value: 'SHIFT' },
  { label: 'Mantenimiento', value: 'MAINT' },
  { label: 'Guardia', value: 'GUARD' },
];

// Round Status
export const ROUND_STATUS_IN_PROGRESS = 'IN_PROGRESS';
export const ROUND_STATUS_COMPLETED = 'COMPLETED';

// Maintenance Status
export const MAINTENANCE_STATUS_PENDING = 'PENDING';
export const MAINTENANCE_STATUS_ATTENDED = 'ATTENDED';

// Incident Status
export const INCIDENT_STATUS_PENDING = 'PENDING';
export const INCIDENT_STATUS_ATTENDED = 'ATTENDED';

// Assignment Status
export const ASSIGNMENT_STATUS_PENDING = 'PENDING';
export const ASSIGNMENT_STATUS_CHECKING = 'CHECKING';
export const ASSIGNMENT_STATUS_UNDER_REVIEW = 'UNDER_REVIEW';
export const ASSIGNMENT_STATUS_REVIEWED = 'REVIEWED';
export const ASSIGNMENT_STATUS_ANOMALY = 'ANOMALY';

// Scan Type
export const SCAN_TYPE_ASSIGNMENT = 'ASSIGNMENT';
export const SCAN_TYPE_RECURRING = 'RECURRING';
export const SCAN_TYPE_FREE = 'FREE';

// Category Types
export const CATEGORY_TYPE_INCIDENT = 'INCIDENT';
export const CATEGORY_TYPE_MAINTENANCE = 'MAINTENANCE';

// Timeline Event Types
export const TIMELINE_EVENT_START = 'START';
export const TIMELINE_EVENT_END = 'END';
export const TIMELINE_EVENT_SCAN = 'SCAN';
export const TIMELINE_EVENT_INCIDENT = 'INCIDENT';
