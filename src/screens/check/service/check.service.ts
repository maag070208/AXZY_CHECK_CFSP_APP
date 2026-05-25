import { post, patch } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';
import { database } from '../../../core/database/database';
import { generateUUID } from '../../../shared/utils/uuid';

export interface KardexCreate {
  locationId: string;
  userId: string;
  notes?: string;
  media?: string[];
  latitude?: number;
  longitude?: number;
  assignmentId?: string;
}

export interface KardexUpdate {
  notes?: string;
  media?: string[];
}

export const registerCheck = async (
  data: KardexCreate,
): Promise<TResult<any>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    try {
      let localCheck: any;
      await database.write(async () => {
        localCheck = await database.get('kardex').create((newCheck: any) => {
          newCheck._raw.id = generateUUID();
          newCheck.userId = data.userId;
          newCheck.locationId = data.locationId;
          newCheck.timestamp = Date.now();
          newCheck.notes = data.notes || '';
          newCheck.media = data.media ? JSON.stringify(data.media) : '[]';
          newCheck.latitude = data.latitude || null;
          newCheck.longitude = data.longitude || null;
          newCheck.assignmentId = data.assignmentId || null;
          newCheck.scanType = 'RECURRING';
        });
      });

      return {
        success: true,
        data: {
          id: localCheck.id,
          userId: localCheck.userId,
          locationId: localCheck.locationId,
          timestamp: new Date(localCheck.timestamp).toISOString(),
          notes: localCheck.notes,
          media: [],
          latitude: localCheck.latitude,
          longitude: localCheck.longitude,
          assignmentId: localCheck.assignmentId,
          scanType: localCheck.scanType,
        },
      };
    } catch (e: any) {
      console.error('[CheckService] Error starting offline check:', e);
      return { success: false, messages: [e.message || 'Error al iniciar escaneo offline'] };
    }
  }

  try {
    const res = await post<any>('/kardex', data);
    if (res.success && res.data) {
      try {
        await database.write(async () => {
          await database.get('kardex').create((newCheck: any) => {
            newCheck._raw.id = res.data.id;
            newCheck._raw._status = 'synced';
            newCheck.userId = data.userId;
            newCheck.locationId = data.locationId;
            newCheck.timestamp = res.data.timestamp ? new Date(res.data.timestamp).getTime() : Date.now();
            newCheck.notes = data.notes || '';
            newCheck.media = data.media ? JSON.stringify(data.media) : '[]';
            newCheck.latitude = data.latitude || null;
            newCheck.longitude = data.longitude || null;
            newCheck.assignmentId = data.assignmentId || null;
            newCheck.scanType = 'RECURRING';
          });
        });
      } catch (dbErr) {
        console.warn('[CheckService] Error saving online check to local SQLite:', dbErr);
      }
    }
    return res;
  } catch (error: any) {
    const isNetworkError = error?.message === 'Network Error' || error?.code === 'ERR_NETWORK' || !error?.response;
    if (isNetworkError) {
      console.log('[CheckService] Network error during online register. Falling back to local SQLite creation...');
      try {
        let localCheck: any;
        await database.write(async () => {
          localCheck = await database.get('kardex').create((newCheck: any) => {
            newCheck._raw.id = generateUUID();
            newCheck.userId = data.userId;
            newCheck.locationId = data.locationId;
            newCheck.timestamp = Date.now();
            newCheck.notes = data.notes || '';
            newCheck.media = data.media ? JSON.stringify(data.media) : '[]';
            newCheck.latitude = data.latitude || null;
            newCheck.longitude = data.longitude || null;
            newCheck.assignmentId = data.assignmentId || null;
            newCheck.scanType = 'RECURRING';
          });
        });

        return {
          success: true,
          data: {
            id: localCheck.id,
            userId: localCheck.userId,
            locationId: localCheck.locationId,
            timestamp: new Date(localCheck.timestamp).toISOString(),
            notes: localCheck.notes,
            media: [],
            latitude: localCheck.latitude,
            longitude: localCheck.longitude,
            assignmentId: localCheck.assignmentId,
            scanType: localCheck.scanType,
          },
        };
      } catch (dbErr: any) {
        console.error('[CheckService] Error during local fallback register:', dbErr);
      }
    }
    throw error;
  }
};

export const updateCheck = async (
  kardexId: string,
  data: KardexUpdate,
): Promise<TResult<any>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    try {
      await database.write(async () => {
        const localCheck = await database.get('kardex').find(kardexId);
        await localCheck.update((record: any) => {
          if (data.notes !== undefined) record.notes = data.notes;
          if (data.media !== undefined) record.media = JSON.stringify(data.media);
        });
      });
      return { success: true, data: { id: kardexId } };
    } catch (e: any) {
      console.error('[CheckService] Error updating offline check:', e);
      return { success: false, messages: [e.message || 'Error al actualizar escaneo offline'] };
    }
  }

  try {
    const res = await patch<any>(`/kardex/${kardexId}`, data);
    if (res.success) {
      try {
        await database.write(async () => {
          const localCheck = await database.get('kardex').find(kardexId);
          await localCheck.update((record: any) => {
            if (data.notes !== undefined) record.notes = data.notes;
            if (data.media !== undefined) record.media = JSON.stringify(data.media);
            record._raw._status = 'synced';
          });
        });
      } catch (dbErr) {
        console.warn('[CheckService] Error mirroring online update to local SQLite:', dbErr);
      }
    }
    return res;
  } catch (error: any) {
    const isNetworkError = error?.message === 'Network Error' || error?.code === 'ERR_NETWORK' || !error?.response;
    if (isNetworkError) {
      console.log('[CheckService] Network error during online update. Falling back to local SQLite update...');
      try {
        await database.write(async () => {
          const localCheck = await database.get('kardex').find(kardexId);
          await localCheck.update((record: any) => {
            if (data.notes !== undefined) record.notes = data.notes;
            if (data.media !== undefined) record.media = JSON.stringify(data.media);
            record._raw._status = 'updated';
          });
        });
        return { success: true, data: { id: kardexId } };
      } catch (dbErr: any) {
        console.error('[CheckService] Error during local fallback update:', dbErr);
      }
    }
    throw error;
  }
};
