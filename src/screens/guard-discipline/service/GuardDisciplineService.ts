import { get, patch, post, put } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export interface IGuardDiscipline {
  id: string;
  guardId: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  guard: { id: string; name: string; lastName: string | null; username: string };
  createdBy: { id: string; name: string; lastName: string | null; username: string };
  category?: { id: string; name: string; color?: string; icon?: string } | null;
  type?: { id: string; name: string } | null;
}

export const getPaginatedDisciplines = async (params: any) => {
  const res = await post<any>('/guard-discipline/datatable', params);
  if (res.success && res.data) {
    return { success: true, data: { rows: res.data.rows || [], total: res.data.total || 0 } };
  }
  return { success: false, data: { rows: [], total: 0 } };
};

export const createDiscipline = async (data: {
  guardId: string;
  title: string;
  description?: string | null;
  categoryId: string;
  typeId: string;
  clientId?: string | null;
  media?: { url: string; type: string }[];
}) => post('/guard-discipline', data);

export const getPaginatedGuards = async (params: any) => {
  const res = await post<any>('/users/datatable', params);
  if (res.success && res.data) {
    return { success: true, data: { rows: res.data.rows || [], total: res.data.total || 0 } };
  }
  return { success: false, data: { rows: [], total: 0 } };
};

export const resolveDiscipline = async (
  id: string,
  data: { status: 'RESOLVED' | 'DISMISSED'; description?: string },
) => put(`/guard-discipline/${id}/resolve`, data);
