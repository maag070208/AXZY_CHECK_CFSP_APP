import { get, post, put, remove } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';
import { CreateUserDTO, IUser } from './user.types';

export const getAllUsers = async (
  search?: string,
): Promise<TResult<IUser[]>> => {
  let query = '';
  if (search) query = `?q=${search}`;
  return await get<IUser[]>(`/users${query}`);
};

export const createUser = async (
  data: CreateUserDTO,
): Promise<TResult<IUser>> => {
  return await post<IUser>('/users', data);
};

export const updateUser = async (
  id: string,
  data: Partial<CreateUserDTO>,
): Promise<TResult<IUser>> => {
  return await put<IUser>(`/users/${id}`, data);
};

export const deleteUser = async (id: string): Promise<TResult<any>> => {
  return await remove<any>(`/users/${id}`);
};

export const getPaginatedUsers = async (params: any): Promise<TResult<any>> => {
  return await post<any>('/users/datatable', params);
};

export const resetPassword = async (
  id: string,
  newPassword: string,
): Promise<TResult<boolean>> => {
  return await put<boolean>(`/users/${id}/reset-password`, { newPassword });
};
export const getUserById = async (id: string): Promise<TResult<IUser>> => {
  return await get<IUser>(`/users/${id}`);
};
