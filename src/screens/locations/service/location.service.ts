import { get, post, put, remove } from '../../../core/axios';
import { ILocation, ILocationCreate } from '../type/location.types';
import { TResult } from '../../../core/types/TResult';
import { DataTableResponse } from '../../../core/types/DataTableTypes';
import { store } from '../../../core/store/redux.config';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export const getLocations = async (): Promise<TResult<ILocation[]>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  const getLocationsOffline = async (): Promise<TResult<ILocation[]>> => {
    try {
      const { database } = require('../../../core/database/database');
      const localLocations = await database.get('locations').query().fetch();
      return {
        success: true,
        data: localLocations.map((l: any) => ({
          id: l.id,
          name: l.name,
          clientId: l.clientId,
          zoneId: l.zoneId,
          createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
          updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : '',
        })),
      };
    } catch (dbErr: any) {
      console.warn('[LocationService] Error getting offline locations:', dbErr);
      return { success: true, data: [] };
    }
  };

  if (!netState.isConnected) {
    return await getLocationsOffline();
  }

  try {
    return await get<ILocation[]>('/locations');
  } catch (error: any) {
    const isNetworkOrServerError =
      error?.message === 'Network Error' ||
      error?.code === 'ERR_NETWORK' ||
      !error?.response ||
      (error?.response?.status && error.response.status >= 500);
    if (isNetworkOrServerError) {
      console.log('[LocationService] Network or server error getting locations. Falling back to local...');
      return await getLocationsOffline();
    }
    throw error;
  }
};

export const getPaginatedLocations = async (
  params: any,
): Promise<TResult<DataTableResponse<ILocation>>> => {
  return await post<DataTableResponse<ILocation>>(
    '/locations/datatable',
    params,
  );
};

export const createLocation = async (
  data: ILocationCreate,
): Promise<TResult<ILocation>> => {
  return await post<ILocation>('/locations', data);
};

export const updateLocation = async (
  id: string,
  data: ILocationCreate,
): Promise<TResult<ILocation>> => {
  return await put<ILocation>(`/locations/${id}`, data);
};

export const deleteLocation = async (
  id: string,
): Promise<TResult<ILocation>> => {
  return await remove<ILocation>(`/locations/${id}`);
};

export const printLocationQRs = async (ids: string[]): Promise<string> => {
  const state = store.getState() as any;
  const token = state.userState?.token;

  const response = await fetch(
    `${API_CONSTANTS.BASE_URL}/locations/print-qrs`,
    {
      method: 'POST',
      headers: {
        ...API_CONSTANTS.HEADERS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ids }),
    },
  );

  if (!response.ok) {
    throw new Error('Error al generar PDF');
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let len = bytes.length;
  let base64 = '';
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  for (let i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1) + '=';
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + '==';
  }

  return `data:application/pdf;base64,${base64}`;
};
