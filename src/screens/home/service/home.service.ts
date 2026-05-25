import { get } from '../../../core/axios';
import { database } from '../../../core/database/database';
import { TResult } from '../../../core/types/TResult';
import { IDashboardStats } from '../types/HomeTypes';

export const getDashboardStats = async (): Promise<TResult<IDashboardStats>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    try {
      const Q = require('@nozbe/watermelondb').Q;

      const [pendingIncidents, pendingMaintenance, activeRounds] = await Promise.all([
        database
          .get('incidents')
          .query(Q.where('status', 'PENDING'))
          .fetchCount(),
        database
          .get('maintenances')
          .query(Q.where('status', 'PENDING'))
          .fetchCount(),
        database
          .get('rounds')
          .query(Q.where('status', 'IN_PROGRESS'))
          .fetch(),
      ]);

      return {
        success: true,
        data: {
          pendingIncidentsCount: pendingIncidents,
          pendingMaintenanceCount: pendingMaintenance,
          activeRounds: activeRounds.map((r: any) => ({
            id: r.id,
            guardId: r.guardId,
            clientId: r.clientId,
            status: r.status,
          })),
        } as IDashboardStats,
      };
    } catch (e: any) {
      console.warn('[HomeService] Offline stats fallback error:', e);
      return {
        success: true,
        data: {
          pendingIncidentsCount: 0,
          pendingMaintenanceCount: 0,
          activeRounds: [],
        } as IDashboardStats,
      };
    }
  }

  return await get('/home/stats');
};
