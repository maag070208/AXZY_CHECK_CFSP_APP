import { patch, post } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { TResult } from '../../../core/types/TResult';

export interface IGuardLoginLog {
  id: string;
  userId: string;
  loginAt: string;
  logoutAt: string | null;
  user: {
    id: string;
    name: string;
    lastName: string | null;
    username: string;
  };
}

export const clockIn = async (guardId: string): Promise<TResult<any>> => {
  return await post(API_CONSTANTS.URLS.GUARD_LOGS.CLOCK_IN, { guardId });
};

export const clockOut = async (guardId: string): Promise<TResult<any>> => {
  return await patch(API_CONSTANTS.URLS.GUARD_LOGS.CLOCK_OUT, { guardId });
};

export const getPaginatedGuardLogs = async (params: any) => {
  const res = await post<any>("/guard-logs/datatable", params);
  if (res.success && res.data) {
    return { success: true, data: { rows: res.data.rows || [], total: res.data.total || 0 } };
  }
  return { success: false, data: { rows: [], total: 0 } };
};
