import { get, post, put, remove } from '../../../core/axios';
import { IZone, IZoneCreate } from '../type/zone.types';
import { TResult } from '../../../core/types/TResult';
import { DataTableResponse } from '../../../core/types/DataTableTypes';

export const getZones = async (): Promise<TResult<IZone[]>> => {
  return get<IZone[]>('/zones');
};

export const getPaginatedZones = async (params: any): Promise<TResult<DataTableResponse<IZone>>> => {
  return post<DataTableResponse<IZone>>('/zones/datatable', params);
};

export const getZoneById = async (id: string): Promise<TResult<IZone>> => {
  return get<IZone>(`/zones/${id}`);
};

export const createZone = async (data: IZoneCreate): Promise<TResult<IZone>> => {
  return post<IZone>('/zones', data);
};

export const updateZone = async (id: string, data: Partial<IZoneCreate>): Promise<TResult<IZone>> => {
  return put<IZone>(`/zones/${id}`, data);
};

export const deleteZone = async (id: string): Promise<TResult<IZone>> => {
  return remove<IZone>(`/zones/${id}`);
};

export const getZonesByClient = async (clientId: string): Promise<TResult<IZone[]>> => {
  return get<IZone[]>(`/zones/client/${clientId}`);
};
