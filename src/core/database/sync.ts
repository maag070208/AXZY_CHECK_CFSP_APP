import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './database';
import { get, post } from '../axios';
import { uploadFile } from '../../shared/service/upload.service';

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

const MODEL_TRANSLATIONS: Record<string, string> = {
  role: 'Roles',
  client: 'Clientes',
  zone: 'Zonas',
  user: 'Personal / Guardias',
  schedule: 'Horarios',
  location: 'Puntos de control',
  locationTask: 'Tareas de ubicación',
  kardex: 'Registros de bitácora',
  assignment: 'Asignaciones',
  assignmentTask: 'Tareas asignadas',
  incidentCategory: 'Categorías de incidencias',
  incidentType: 'Tipos de incidencias',
  incident: 'Reportes de incidencias',
  round: 'Recorridos / Rondas',
  maintenance: 'Reportes de mantenimiento',
  recurringConfiguration: 'Rondas recurrentes',
  recurringLocation: 'Puntos recurrentes',
  recurringTask: 'Tareas recurrentes',
};

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
      // Exclude WatermelonDB internal fields (like _status, _changed) when pushing to API
      if (!isPull && key.startsWith('_')) {
        return acc;
      }

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

// Helper to upload offline media files and update SQLite database before pushing changes
async function uploadOfflineMediaForTable(
  tableName: string,
  records: any[],
  progressTracker: { current: number; total: number },
  onStepChange?: (step: SyncStep) => void
): Promise<void> {
  for (const record of records) {
    if (!record.media) continue;
    try {
      const mediaList = JSON.parse(record.media);
      if (!Array.isArray(mediaList)) continue;

      const newMediaList: string[] = [];
      let modified = false;

      for (const uri of mediaList) {
        // If the URI is a local path (starts with file:// or / or ph:// or content://)
        if (
          uri &&
          (uri.startsWith('file://') ||
            uri.startsWith('/') ||
            uri.startsWith('ph://') ||
            uri.startsWith('content://'))
        ) {
          progressTracker.current++;
          if (onStepChange) {
            onStepChange({
              type: 'media_upload_progress',
              current: progressTracker.current,
              total: progressTracker.total,
              tableName,
            });
          }

          console.log(`[Sync] Uploading offline media (${progressTracker.current}/${progressTracker.total}): ${uri}`);

          // Determine type (video vs image)
          const isVideo =
            uri.toLowerCase().endsWith('.mp4') ||
            uri.toLowerCase().endsWith('.mov') ||
            uri.toLowerCase().endsWith('.3gp');
          const type = isVideo ? 'video' : 'image';

          // Determine upload path mapping to singular for backend subfolder naming
          let uploadPath = tableName;
          if (tableName === 'incidents') uploadPath = 'incident';
          if (tableName === 'maintenances') uploadPath = 'maintenance';

          // Upload the file
          const uploadRes = await uploadFile(uri, type, uploadPath);

          if (uploadRes.success && uploadRes.url) {
            newMediaList.push(uploadRes.url);
            modified = true;
            console.log(`[Sync] Offline media uploaded successfully: ${uploadRes.url}`);
          } else {
            console.error(`[Sync] Failed to upload offline media ${uri}:`, uploadRes.error);
            throw new Error(uploadRes.error || 'Error al subir archivo offline');
          }
        } else {
          newMediaList.push(uri);
        }
      }

      if (modified) {
        const finalMediaStr = JSON.stringify(newMediaList);
        // 1. Update the database record locally so we don't upload again
        await database.write(async () => {
          const dbRecord = await database.get(tableName).find(record.id);
          await dbRecord.update((r: any) => {
            r.media = finalMediaStr;
          });
        });
        // 2. Update the in-memory record for the API push
        record.media = finalMediaStr;
      }
    } catch (e: any) {
      console.error(`[Sync] Error processing offline media for ${tableName} record ${record.id}:`, e);
      throw e;
    }
  }
}

export type SyncStep =
  | 'pull'
  | 'push'
  | { type: 'pull' }
  | { type: 'pull_data_received'; total: number; details: Array<{ model: string; count: number }> }
  | { type: 'push' }
  | { type: 'media_upload_start'; total: number }
  | { type: 'media_upload_progress'; current: number; total: number; tableName: string };

export async function syncLocalDatabase(onStepChange?: (step: SyncStep) => void): Promise<void> {
  let pullTimestamp = 0;

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt }) => {
      if (onStepChange) onStepChange({ type: 'pull' });

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
          const collection = database.collections.get(table);
          if (!collection) {
            continue;
          }
          const count = await collection.query().fetchCount();
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
      pullTimestamp = timestamp;

      // Calcular detalles de la descarga de datos del servidor
      const pullDetails: Array<{ model: string; count: number }> = [];
      let totalPullRecords = 0;
      for (const [model, change] of Object.entries(serverChanges)) {
        const c = change as { created: any[]; updated: any[]; deleted: string[] };
        const count = (c.created?.length || 0) + (c.updated?.length || 0) + (c.deleted?.length || 0);
        if (count > 0) {
          const translatedName = MODEL_TRANSLATIONS[model] || model;
          pullDetails.push({ model: translatedName, count });
          totalPullRecords += count;
        }
      }

      if (onStepChange && totalPullRecords > 0) {
        onStepChange({
          type: 'pull_data_received',
          total: totalPullRecords,
          details: pullDetails,
        });
      }
      
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
      // 1. Calcular total de archivos multimedia offline a subir
      const mediaTables = ['incidents', 'maintenances', 'kardex'];
      let totalFiles = 0;
      for (const table of mediaTables) {
        if (changes[table]) {
          const { created = [], updated = [] } = changes[table];
          const allRecords = [...created, ...updated];
          for (const r of allRecords) {
            if (r.media) {
              try {
                const mediaList = JSON.parse(r.media);
                if (Array.isArray(mediaList)) {
                  for (const uri of mediaList) {
                    if (
                      uri &&
                      (uri.startsWith('file://') ||
                        uri.startsWith('/') ||
                        uri.startsWith('ph://') ||
                        uri.startsWith('content://'))
                    ) {
                      totalFiles++;
                    }
                  }
                }
              } catch {}
            }
          }
        }
      }

      if (totalFiles > 0 && onStepChange) {
        onStepChange({ type: 'media_upload_start', total: totalFiles });
      }

      const progressTracker = { current: 0, total: totalFiles };

      // 2. Subir archivos multimedia offline antes de enviar cambios al servidor
      for (const table of mediaTables) {
        if (changes[table]) {
          const { created = [], updated = [] } = changes[table];
          await uploadOfflineMediaForTable(table, created, progressTracker, onStepChange);
          await uploadOfflineMediaForTable(table, updated, progressTracker, onStepChange);
        }
      }

      if (onStepChange) onStepChange({ type: 'push' });

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

      // 3. Enviar cambios locales al servidor (App -> API)
      const response = await post<any>('/sync', { changes: apiChanges, lastPulledAt: pullTimestamp }, { timeout: 30000 });
      
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
