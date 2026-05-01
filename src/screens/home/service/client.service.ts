import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';

export const getClients = async (): Promise<TResult<any[]>> => {
  return await get('/catalog/client');
};
