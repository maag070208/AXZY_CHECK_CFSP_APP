import { get, post, put, remove } from '../../../core/axios';

export const getClients = async () => {
  return get('/clients');
};

export const getPaginatedClients = async (params: any) => {
  return post('/clients/datatable', params);
};

export const getClientById = async (id: number) => {
  return get(`/clients/${id}`);
};

export const createClient = async (data: any) => {
  return post('/clients', data);
};

export const updateClient = async (id: number, data: any) => {
  return put(`/clients/${id}`, data);
};

export const deleteClient = async (id: number) => {
  return remove(`/clients/${id}`);
};
