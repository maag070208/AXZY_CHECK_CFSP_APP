import { post } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { TResult } from '../../../core/types/TResult';

export interface UserLogin {
  username: string;
  password: string;
}

export const login = async (
  values: UserLogin,
): Promise<TResult<string>> => {
  return await post(API_CONSTANTS.URLS.AUTH.LOGIN, values);
};

export const logout = async (): Promise<TResult<void>> => {
  return await post(API_CONSTANTS.URLS.AUTH.LOGOUT || '/users/logout', {});
};
