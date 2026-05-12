import { get, post, put, remove } from '../../../core/axios';
import { ILocation, ILocationCreate } from '../type/location.types';
import { TResult } from '../../../core/types/TResult';
import { DataTableResponse } from '../../../core/types/DataTableTypes';
import { store } from '../../../core/store/redux.config';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export const getLocations = async (): Promise<TResult<ILocation[]>> => {
  return await get<ILocation[]>('/locations');
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
