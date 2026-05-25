import { get } from '../../../core/axios';
import { TResult } from '../../../core/types/TResult';
import { database } from '../../../core/database/database';
import { store } from '../../../core/store/redux.config';

export const getRecurringByGuard = async (
  guardId: string,
): Promise<TResult<any[]>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    try {
      const Q = require('@nozbe/watermelondb').Q;
      const userState = store.getState().userState;
      const clientId = userState.clientId;
      const userRole = userState.role;

      let query = database
        .get('recurring_configurations')
        .query(Q.where('active', true));

      if (userRole !== 'ADMIN' && clientId) {
        query = query.extend(Q.where('client_id', clientId));
      }

      const configs = await query.fetch();

      const configList = [];
      for (const config of configs) {
        const recurringLocations = await database
          .get('recurring_locations')
          .query(Q.where('recurring_configuration_id', config.id))
          .fetch();

        const populatedLocations = [];
        for (const rl of recurringLocations) {
          const location = await database.get('locations').find(rl.locationId);
          const tasks = await database
            .get('recurring_tasks')
            .query(Q.where('recurring_location_id', rl.id))
            .fetch();

          populatedLocations.push({
            id: rl.id,
            order: rl.order,
            location: {
              id: location.id,
              name: location.name,
              client_id: location.clientId,
              zone_id: location.zoneId,
            },
            tasks: tasks.map((t: any) => ({
              id: t.id,
              description: t.description,
              req_photo: t.reqPhoto,
            })),
          });
        }

        configList.push({
          id: config.id,
          title: config.title,
          clientId: config.clientId,
          active: config.active,
          recurringLocations: populatedLocations,
        });
      }

      return { success: true, data: configList };
    } catch (e: any) {
      console.error('[RecurringService] Error getting offline configs:', e);
      return {
        success: false,
        messages: [e.message || 'Error al cargar rutas offline'],
      };
    }
  }

  return await get(`/recurring/guard/${guardId}`);
};
