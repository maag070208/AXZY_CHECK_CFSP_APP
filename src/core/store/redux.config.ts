import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storage from '@react-native-async-storage/async-storage';
import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { APP_SETTINGS } from '../constants/APP_SETTINGS';

import userReducer from './slices/user.slice';
import loaderReducer from './slices/loader.slice';
import toastReducer from './slices/toast.slice';

const rootReducer = combineReducers({
  userState: userReducer,
  loaderState: loaderReducer,
  toastState: toastReducer,
});

const persistConfig = {
  key: APP_SETTINGS.DB_KEY.toString(),
  storage,
  version: 1,
  blacklist: [
    'loaderState', // nunca debemos persistir loaders
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

import { database } from '../database/database';

const databaseResetMiddleware = (store: any) => (next: any) => (action: any) => {
  if (action.type === 'user/logout') {
    // Reset local database SQLite tables asynchronously
    database.write(async () => {
      try {
        await database.unsafeResetDatabase();
        console.log('[Database] Reset successfully on logout');
      } catch (error) {
        console.error('[Database] Error resetting on logout:', error);
      }
    });

    // Reset sync timestamp to force a full sync upon next login
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.removeItem('last_sync_timestamp').catch((e: any) => {
      console.warn('Error removing last_sync_timestamp on logout:', e);
    });
  }
  return next(action);
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(databaseResetMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
