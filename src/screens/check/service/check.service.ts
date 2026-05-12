import { post, patch } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

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
  return await post<any>('/kardex', data);
};

export const updateCheck = async (
  kardexId: string,
  data: KardexUpdate,
): Promise<TResult<any>> => {
  return await patch<any>(`/kardex/${kardexId}`, data);
};
