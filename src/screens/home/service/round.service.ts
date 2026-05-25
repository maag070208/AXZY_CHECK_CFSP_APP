import { post, put, get } from '../../../core/axios';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';
import { TResult } from '../../../core/types/TResult';
import { database } from '../../../core/database/database';
import { generateUUID } from '../../../shared/utils/uuid';

export const startRound = async (
  guardId: string,
  clientId?: string,
  recurringConfigurationId?: string,
): Promise<TResult<any>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    try {
      let localRound: any;
      await database.write(async () => {
        localRound = await database.get('rounds').create((newRound: any) => {
          newRound._raw.id = generateUUID();
          newRound.guardId = guardId;
          newRound.clientId = clientId || null;
          newRound.startTime = Date.now();
          newRound.status = 'IN_PROGRESS';
          newRound.recurringConfigurationId = recurringConfigurationId || null;
        });
      });

      let recurringConfiguration = null;
      if (recurringConfigurationId) {
        try {
          const Q = require('@nozbe/watermelondb').Q;
          const configRecord = await database
            .get('recurring_configurations')
            .find(recurringConfigurationId);
          const recurringLocations = await database
            .get('recurring_locations')
            .query(
              Q.where('recurring_configuration_id', recurringConfigurationId),
            )
            .fetch();

          const populatedLocations = [];
          for (const rl of recurringLocations) {
            const location = await database
              .get('locations')
              .find(rl.locationId);
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

          recurringConfiguration = {
            id: configRecord.id,
            title: configRecord.title,
            recurringLocations: populatedLocations,
          };
        } catch (err) {
          console.warn('Error loading config for offline round:', err);
        }
      }

      return {
        success: true,
        data: {
          id: localRound.id,
          guardId: localRound.guardId,
          clientId: localRound.clientId,
          startTime: new Date(localRound.startTime).toISOString(),
          status: localRound.status,
          recurringConfigurationId: localRound.recurringConfigurationId,
          recurringConfiguration,
          kardex: [],
        },
      };
    } catch (e: any) {
      console.error('[RoundService] Error starting offline round:', e);
      return {
        success: false,
        messages: [e.message || 'Error al iniciar ronda offline'],
      };
    }
  }

  try {
    const res = await post(API_CONSTANTS.URLS.ROUNDS.START, {
      guardId,
      clientId,
      recurringConfigurationId,
    });

    if (res.success && res.data) {
      try {
        await database.write(async () => {
          await database.get('rounds').create((newRound: any) => {
            newRound._raw.id = res.data.id;
            newRound._raw._status = 'synced';
            newRound.guardId = res.data.guardId;
            newRound.clientId = res.data.clientId || null;
            newRound.startTime = new Date(res.data.startTime).getTime();
            newRound.status = res.data.status;
            newRound.recurringConfigurationId =
              res.data.recurringConfigurationId || null;
          });
        });
      } catch (dbErr) {
        console.warn(
          '[RoundService] Error saving online round to local SQLite:',
          dbErr,
        );
      }
    }

    return res;
  } catch (error: any) {
    const isNetworkOrServerError =
      error?.message === 'Network Error' ||
      error?.code === 'ERR_NETWORK' ||
      !error?.response ||
      (error?.response?.status && error.response.status >= 500);
    if (isNetworkOrServerError) {
      console.log(
        '[RoundService] Network or server error starting round online. Falling back to local creation...',
      );
      try {
        let localRound: any;
        await database.write(async () => {
          localRound = await database.get('rounds').create((newRound: any) => {
            newRound._raw.id = generateUUID();
            newRound.guardId = guardId;
            newRound.clientId = clientId || null;
            newRound.startTime = Date.now();
            newRound.status = 'IN_PROGRESS';
            newRound.recurringConfigurationId =
              recurringConfigurationId || null;
          });
        });

        let recurringConfiguration = null;
        if (recurringConfigurationId) {
          try {
            const Q = require('@nozbe/watermelondb').Q;
            const configRecord = await database
              .get('recurring_configurations')
              .find(recurringConfigurationId);
            const recurringLocations = await database
              .get('recurring_locations')
              .query(
                Q.where('recurring_configuration_id', recurringConfigurationId),
              )
              .fetch();

            const populatedLocations = [];
            for (const rl of recurringLocations) {
              const location = await database
                .get('locations')
                .find(rl.locationId);
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

            recurringConfiguration = {
              id: configRecord.id,
              title: configRecord.title,
              recurringLocations: populatedLocations,
            };
          } catch (err) {
            console.warn(
              'Error loading config for offline round fallback:',
              err,
            );
          }
        }

        return {
          success: true,
          data: {
            id: localRound.id,
            guardId: localRound.guardId,
            clientId: localRound.clientId,
            startTime: new Date(localRound.startTime).toISOString(),
            status: localRound.status,
            recurringConfigurationId: localRound.recurringConfigurationId,
            recurringConfiguration,
            kardex: [],
          },
        };
      } catch (e: any) {
        console.error(
          '[RoundService] Error starting offline round fallback:',
          e,
        );
        return {
          success: false,
          messages: [e.message || 'Error al iniciar ronda offline'],
        };
      }
    }
    throw error;
  }
};

export const endRound = async (roundId: string): Promise<TResult<any>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    try {
      await database.write(async () => {
        const localRound = await database.get('rounds').find(roundId);
        await localRound.update((record: any) => {
          record.status = 'COMPLETED';
          record.endTime = Date.now();
        });
      });
      return { success: true, data: { id: roundId } };
    } catch (e: any) {
      console.error('[RoundService] Error ending offline round:', e);
      return {
        success: false,
        messages: [e.message || 'Error al finalizar ronda offline'],
      };
    }
  }

  try {
    const url = `/rounds/${roundId}/end`;
    const res = await put(url);
    if (res.success) {
      try {
        await database.write(async () => {
          const localRound = await database.get('rounds').find(roundId);
          await localRound.update((record: any) => {
            record.status = 'COMPLETED';
            record.endTime = Date.now();
            record._raw._status = 'synced';
          });
        });
      } catch (dbErr) {
        console.warn(
          '[RoundService] Error mirroring online round completion to local SQLite:',
          dbErr,
        );
      }
    }
    return res;
  } catch (error: any) {
    const isNetworkOrServerError =
      error?.message === 'Network Error' ||
      error?.code === 'ERR_NETWORK' ||
      !error?.response ||
      (error?.response?.status && error.response.status >= 500);
    if (isNetworkOrServerError) {
      console.log(
        '[RoundService] Network or server error ending round online. Falling back to local update...',
      );
      try {
        await database.write(async () => {
          const localRound = await database.get('rounds').find(roundId);
          await localRound.update((record: any) => {
            record.status = 'COMPLETED';
            record.endTime = Date.now();
            record._raw._status = 'updated';
          });
        });
        return { success: true, data: { id: roundId } };
      } catch (e: any) {
        console.error('[RoundService] Error ending round offline fallback:', e);
        return {
          success: false,
          messages: [e.message || 'Error al finalizar ronda offline'],
        };
      }
    }
    throw error;
  }
};

const getCurrentRoundOffline = async (
  guardId: string,
): Promise<TResult<any>> => {
  try {
    const Q = require('@nozbe/watermelondb').Q;
    const activeRounds = await database
      .get('rounds')
      .query(Q.where('status', 'IN_PROGRESS'), Q.where('guard_id', guardId))
      .fetch();

    if (activeRounds.length === 0) {
      return { success: true, data: null };
    }

    const localRound = activeRounds[0];

    let recurringConfiguration = null;
    if (localRound.recurringConfigurationId) {
      try {
        const configRecord = await database
          .get('recurring_configurations')
          .find(localRound.recurringConfigurationId);
        const recurringLocations = await database
          .get('recurring_locations')
          .query(
            Q.where(
              'recurring_configuration_id',
              localRound.recurringConfigurationId,
            ),
          )
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

        recurringConfiguration = {
          id: configRecord.id,
          title: configRecord.title,
          recurringLocations: populatedLocations,
        };
      } catch (err) {
        console.warn('Error loading config for offline round:', err);
      }
    }

    const checks = await database
      .get('kardex')
      .query(
        Q.where('user_id', guardId),
        Q.where('timestamp', Q.gte(localRound.startTime)),
      )
      .fetch();

    const kardexData = checks.map((c: any) => {
      let mediaArr = [];
      try {
        mediaArr = c.media ? JSON.parse(c.media) : [];
      } catch {}
      return {
        id: c.id,
        locationId: c.locationId,
        media: mediaArr,
        timestamp: c.timestamp,
        notes: c.notes,
        scanType: c.scanType,
      };
    });

    return {
      success: true,
      data: {
        id: localRound.id,
        guardId: localRound.guardId,
        clientId: localRound.clientId,
        startTime: new Date(localRound.startTime).toISOString(),
        status: localRound.status,
        recurringConfigurationId: localRound.recurringConfigurationId,
        recurringConfiguration,
        kardex: kardexData,
      },
    };
  } catch (e: any) {
    console.error('[RoundService] Error fetching offline current round:', e);
    return {
      success: false,
      messages: [e.message || 'Error al obtener ronda offline'],
    };
  }
};

export const getCurrentRound = async (): Promise<TResult<any>> => {
  const { store } = require('../../../core/store/redux.config');
  const guardId = store.getState().userState.id;

  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    return await getCurrentRoundOffline(guardId);
  }

  try {
    return await get(`${API_CONSTANTS.URLS.ROUNDS.CURRENT}?t=${Date.now()}`);
  } catch (error: any) {
    const isNetworkOrServerError =
      error?.message === 'Network Error' ||
      error?.code === 'ERR_NETWORK' ||
      !error?.response ||
      (error?.response?.status && error.response.status >= 500);
    if (isNetworkOrServerError) {
      console.log(
        '[RoundService] Network or server error fetching current round. Falling back to local...',
      );
      return await getCurrentRoundOffline(guardId);
    }
    throw error;
  }
};

export const getActiveRounds = async (): Promise<TResult<any[]>> => {
  const NetInfo = require('@react-native-community/netinfo').default;
  const netState = await NetInfo.fetch();

  const getActiveRoundsOffline = async (): Promise<TResult<any[]>> => {
    try {
      const Q = require('@nozbe/watermelondb').Q;
      const activeRounds = await database
        .get('rounds')
        .query(Q.where('status', 'IN_PROGRESS'))
        .fetch();
      return {
        success: true,
        data: activeRounds.map((r: any) => ({
          id: r.id,
          guardId: r.guardId,
          clientId: r.clientId,
          startTime: new Date(r.startTime).toISOString(),
          status: r.status,
          recurringConfigurationId: r.recurringConfigurationId,
        })),
      };
    } catch (dbErr) {
      console.warn('Error fetching active rounds from local DB:', dbErr);
      return { success: true, data: [] };
    }
  };

  if (!netState.isConnected) {
    return await getActiveRoundsOffline();
  }

  try {
    return await get(`${API_CONSTANTS.URLS.ROUNDS.ALL}?status=IN_PROGRESS`);
  } catch (error: any) {
    const isNetworkOrServerError =
      error?.message === 'Network Error' ||
      error?.code === 'ERR_NETWORK' ||
      !error?.response ||
      (error?.response?.status && error.response.status >= 500);
    if (isNetworkOrServerError) {
      console.log(
        '[RoundService] Network or server error fetching active rounds. Falling back to local...',
      );
      return await getActiveRoundsOffline();
    }
    throw error;
  }
};
