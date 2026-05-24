import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import { get, post } from '../axios';

// Mapeo de nombres de tablas locales (WatermelonDB) a modelos de la API (Prisma)
const LOCAL_TO_API_MAP: Record<string, string> = {
  roles: 'role',
  clients: 'client',
  zones: 'zone',
  users: 'user',
  schedules: 'schedule',
  locations: 'location',
  location_tasks: 'locationTask',
  kardex: 'kardex',
  assignments: 'assignment',
  assignment_tasks: 'assignmentTask',
  incident_categories: 'incidentCategory',
  incident_types: 'incidentType',
  incidents: 'incident',
  rounds: 'round',
  maintenances: 'maintenance',
  recurring_configurations: 'recurringConfiguration',
  recurring_locations: 'recurringLocation',
  recurring_tasks: 'recurringTask',
};

const API_TO_LOCAL_MAP: Record<string, string> = Object.entries(LOCAL_TO_API_MAP).reduce(
  (acc, [local, api]) => {
    acc[api] = local;
    return acc;
  },
  {} as Record<string, string>
);

// Conversión de nomenclatura snake_case <-> camelCase para mapear BD local con JSON API
function toCamelCase(str: string): string {
  if (str === 'id' || str === 'created_at' || str === 'updated_at' || str === 'deleted_at') {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  if (str === 'id' || str === 'createdAt' || str === 'updatedAt' || str === 'deletedAt') {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function isDateField(key: string, val: any): boolean {
  const k = key.toLowerCase();
  
  // Schedules use "start_time" and "end_time" as "HH:mm" strings
  if (typeof val === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(val)) {
    return false;
  }
  
  return k.endsWith('_at') || k.endsWith('at') || k.endsWith('_time') || k.endsWith('time') || k === 'timestamp';
}

function convertKeys(obj: any, transformFn: (s: string) => string, isPull: boolean): any {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeys(item, transformFn, isPull));
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      const newKey = transformFn(key);
      let finalVal = val;

      if (isDateField(key, val)) {
        if (isPull && typeof val === 'string') {
          finalVal = val ? new Date(val).getTime() : null;
        } else if (!isPull && typeof val === 'number') {
          finalVal = val ? new Date(val).toISOString() : null;
        }
      } else {
        finalVal = convertKeys(val, transformFn, isPull);
      }

      acc[newKey] = finalVal;
      return acc;
    }, {} as any);
  }
  return obj;
}

export async function syncLocalDatabase(onStepChange?: (step: 'pull' | 'push') => void): Promise<void> {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      if (onStepChange) onStepChange('pull');

      // Check which local tables are empty to request a full pull for those tables
      const resetModels: string[] = [];
      const tablesToCheck = [
        'roles',
        'clients',
        'zones',
        'users',
        'schedules',
        'locations',
        'location_tasks',
        'incident_categories',
        'incident_types',
        'recurring_configurations',
        'recurring_locations',
        'recurring_tasks',
      ];

      for (const table of tablesToCheck) {
        try {
          const count = await database.get(table).query().fetchCount();
          if (count === 0) {
            const apiModel = LOCAL_TO_API_MAP[table];
            if (apiModel) {
              resetModels.push(apiModel);
            }
          }
        } catch (e) {
          console.warn(`[sync] Error checking count for table ${table}:`, e);
        }
      }

      let url = `/sync?last_pulled_at=${lastPulledAt || 0}`;
      if (resetModels.length > 0) {
        url += `&reset_models=${resetModels.join(',')}`;
        console.log(`[sync] Requesting full sync for empty tables: ${resetModels.join(', ')}`);
      }

      // 1. Obtener cambios del servidor (API -> App)
      const response = await get<any>(url, { timeout: 30000 });
      
      if (!response.success || !response.data) {
        throw new Error(response.messages?.[0] || 'Error al descargar cambios del servidor');
      }

      const { changes: serverChanges, timestamp } = response.data;
      
      // Guardar el timestamp en AsyncStorage de forma explícita para el chequeo rápido
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('last_sync_timestamp', timestamp.toString()).catch(() => {});

      const formattedChanges: any = {};

      // Traducir tablas y llaves del formato API (camelCase) al formato Local (snake_case)
      for (const [apiModel, change] of Object.entries(serverChanges)) {
        const localTable = API_TO_LOCAL_MAP[apiModel];
        if (!localTable) continue;

        const typedChange = change as { created: any[]; updated: any[]; deleted: string[] };

        formattedChanges[localTable] = {
          created: convertKeys(typedChange.created, toSnakeCase, true),
          updated: convertKeys(typedChange.updated, toSnakeCase, true),
          deleted: typedChange.deleted,
        };
      }

      return { changes: formattedChanges, timestamp };
    },
    pushChanges: async ({ changes }) => {
      if (onStepChange) onStepChange('push');
      const apiChanges: any = {};

      // Traducir tablas y llaves del formato Local (snake_case) al formato API (camelCase)
      for (const [localTable, change] of Object.entries(changes)) {
        const apiModel = LOCAL_TO_API_MAP[localTable];
        if (!apiModel) continue;

        apiChanges[apiModel] = {
          created: convertKeys(change.created, toCamelCase, false),
          updated: convertKeys(change.updated, toCamelCase, false),
          deleted: change.deleted,
        };
      }

      // 2. Enviar cambios locales al servidor (App -> API)
      const response = await post<any>('/sync', { changes: apiChanges }, { timeout: 30000 });
      
      if (!response.success) {
        throw new Error(response.messages?.[0] || 'Error al subir cambios al servidor');
      }
    },
  });
}

import { Q } from '@nozbe/watermelondb';

/**
 * Verifica si hay registros locales creados o actualizados que estén pendientes de sincronizarse.
 */
export async function hasUnsyncedLocalChanges(): Promise<boolean> {
  const tables = ['users', 'locations', 'kardex'];
  for (const table of tables) {
    try {
      const count = await database.get(table).query(
        Q.unsafeRaw("id in (select id from " + table + " where _status is not null and _status != 'synced')")
      ).fetchCount();
      if (count > 0) return true;
    } catch (error) {
      console.warn(`Error al verificar cambios locales en tabla ${table}:`, error);
    }
  }
  return false;
}

/**
 * Verifica si el servidor tiene actualizaciones disponibles desde la última sincronización.
 */
export async function hasPendingServerChanges(): Promise<boolean> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const lastSyncStr = await AsyncStorage.getItem('last_sync_timestamp');
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;

    const response = await get<{ hasChanges: boolean }>(`/sync/check?last_pulled_at=${lastSync}`);
    return response.success && !!response.data?.hasChanges;
  } catch (error) {
    console.warn('Error al verificar cambios en el servidor:', error);
    return false;
  }
}
