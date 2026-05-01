import { get, post, put, remove } from '../../../core/axios';

export const getPaginatedRecurring = async (params: any) => {
  return post('/recurring/datatable', params);
};

export const createRecurring = async (data: any) => {
  return post('/recurring', data);
};

export const updateRecurring = async (id: number, data: any) => {
  return put(`/recurring/${id}`, data);
};

export const deleteRecurring = async (id: number) => {
  return remove(`/recurring/${id}`);
};

export const getRecurringById = async (id: number) => {
  return get(`/recurring/${id}`);
};
