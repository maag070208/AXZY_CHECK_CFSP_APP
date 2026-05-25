import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { TResult } from './types/TResult';
import { API_CONSTANTS } from './constants/API_CONSTANTS';

import { store } from './store/redux.config';
import { logout } from './store/slices/user.slice';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------------------------------------------------------
   1. Axios Instance
--------------------------------------------------------- */
const axiosInstance = axios.create({
  baseURL: API_CONSTANTS.BASE_URL,
  timeout: API_CONSTANTS.TIMEOUT,
  headers: API_CONSTANTS.HEADERS,
});

/* ---------------------------------------------------------
   2. REQUEST Interceptor (token del store)
--------------------------------------------------------- */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const state = store.getState();
    const token = state.userState.token; // ⬅️ AQUÍ EL TOKEN DEL STORE
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Version Control Header
    if (!config.headers['X-App-Version']) {
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      const appVersion = await AsyncStorage.getItem('current_app_version');
      if (appVersion) {
        config.headers['X-App-Version'] = appVersion;
      } else {
        config.headers['X-App-Version'] = API_CONSTANTS.APP_VERSION || '1.0.0';
      }
    }

    // Check for version check bypass flag (used during auto-update sync)
    const bypassCheck = await AsyncStorage.getItem('bypass_version_check');
    if (bypassCheck === 'true') {
      config.headers['X-Bypass-Version-Check'] = 'true';
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/* ---------------------------------------------------------
   3. RESPONSE Interceptor
--------------------------------------------------------- */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }

    if (error.response?.status === 400) {
      const responseData = error.response.data as any;
      if (
        responseData?.data?.versionMismatch &&
        responseData?.data?.requiredVersion
      ) {
        const AsyncStorage =
          require('@react-native-async-storage/async-storage').default;
        const currentVersion = await AsyncStorage.getItem(
          'current_app_version',
        );
        const newVersion = responseData.data.requiredVersion;
        if (!currentVersion || currentVersion !== newVersion) {
          await AsyncStorage.setItem('current_app_version', newVersion);
          console.log(
            `[VersionControl] Stored app version ${newVersion} from API`,
          );

          const config = error.config;
          if (config) {
            config.headers = config.headers || {};
            config.headers['X-App-Version'] = newVersion;
            return axiosInstance(config);
          }
        }
      }
    }

    return Promise.reject(error);
  },
);

/* ---------------------------------------------------------
   4. Central Error (igual web, backend ya regresa TResult)
--------------------------------------------------------- */
const handleError = <T>(error: any): TResult<T> => {
  throw error?.response?.data || error;
};

/* ---------------------------------------------------------
   5. Métodos (SIEMPRE regresan TResult)
--------------------------------------------------------- */

export const post = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<TResult<T>> => {
  try {
    const response = await axiosInstance.post(url, data, config);
    console.log('Response:', response);
    return response.data;
  } catch (error) {
    console.log('Error:', error);
    return handleError<T>(error);
  }
};

export const get = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TResult<T>> => {
  try {
    const response = await axiosInstance.get(url, config);
    return response.data;
  } catch (error) {
    return handleError<T>(error);
  }
};

export const patch = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<TResult<T>> => {
  try {
    const response = await axiosInstance.patch(url, data, config);
    return response.data;
  } catch (error) {
    return handleError<T>(error);
  }
};

export const put = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<TResult<T>> => {
  try {
    const response = await axiosInstance.put(url, data, config);
    return response.data;
  } catch (error) {
    return handleError<T>(error);
  }
};

export const remove = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TResult<T>> => {
  try {
    const response = await axiosInstance.delete(url, config);
    return response.data;
  } catch (error) {
    return handleError<T>(error);
  }
};

export { axiosInstance };
