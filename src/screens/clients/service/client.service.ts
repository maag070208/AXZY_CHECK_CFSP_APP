import { get, post, put, remove } from '../../../core/axios';
import { DataTableFetchParams, DataTableResponse } from '../../../core/types/DataTableTypes';
import {
  IClient,
  IClientCreate,
  IClientUpdate,
  TResultClient,
  TResultDatatableClient,
  TResultListClient,
} from './client.types';

export const getClients = async (): Promise<TResultListClient> => {
  return await get<IClient[]>('/clients');
};

export const getClientsDatatable = async (
  params: DataTableFetchParams,
): Promise<TResultDatatableClient> => {
  return await post<DataTableResponse<IClient>>('/clients/datatable', params);
};

export const getClientById = async (
  id: string,
): Promise<TResultClient> => {
  return await get<IClient>(`/clients/${id}`);
};

export const createClient = async (
  client: IClientCreate,
): Promise<TResultClient> => {
  return await post<IClient>('/clients', client);
};

export const updateClient = async (
  id: string,
  client: IClientUpdate,
): Promise<TResultClient> => {
  return await put<IClient>(`/clients/${id}`, client);
};

export const deleteClient = async (id: string): Promise<TResultClient> => {
  return await remove<IClient>(`/clients/${id}`);
};
