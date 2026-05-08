import { get, post, put, remove } from '../../../core/axios';

export const getZones = async () => {
  return get('/zones');
};

export const getPaginatedZones = async (params: any) => {
  return post('/zones/datatable', params);
};

export const getZoneById = async (id: number) => {
  return get(`/zones/${id}`);
};

export const createZone = async (data: any) => {
  return post('/zones', data);
};

export const updateZone = async (id: number, data: any) => {
  return put(`/zones/${id}`, data);
};

export const deleteZone = async (id: number) => {
  return remove(`/zones/${id}`);
};

export const getZonesByClient = async (clientId: string | number) => {
  return get(`/zones/client/${clientId}`);
};
