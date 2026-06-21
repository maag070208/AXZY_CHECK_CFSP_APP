import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { post } from '../axios';
import { store } from '../store/redux.config';

const FCM_TOKEN_KEY = 'fcm_token';
const TOKEN_ENDPOINT = '/users/fcm-token';

class FCMService {
  private tokenRefreshUnsubscribe: (() => void) | null = null;

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS',
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('[FCM] Error getting token:', error);
      return null;
    }
  }

  async registerToken(token: string): Promise<void> {
    try {
      const userId = store.getState().userState.id;
      if (!userId) return;

      await post(TOKEN_ENDPOINT, {
        token,
        platform: Platform.OS,
      });
      console.log('[FCM] Token registrado en backend');
    } catch (error) {
      console.error('[FCM] Error registrando token:', error);
    }
  }

  onTokenRefresh(callback: (token: string) => void) {
    this.tokenRefreshUnsubscribe = messaging().onTokenRefresh((token) => {
      callback(token);
    });
  }

  onForegroundMessage(
    callback: (message: FirebaseMessagingTypes.RemoteMessage) => void,
  ) {
    return messaging().onMessage(async (remoteMessage) => {
      callback(remoteMessage);
    });
  }

  onNotificationOpened(
    callback: (message: FirebaseMessagingTypes.RemoteMessage) => void,
  ) {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      callback(remoteMessage);
    });
  }

  async getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
    try {
      return await messaging().getInitialNotification();
    } catch (error) {
      console.error('[FCM] Error getting initial notification:', error);
      return null;
    }
  }

  cleanup() {
    if (this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe();
      this.tokenRefreshUnsubscribe = null;
    }
  }
}

export const fcmService = new FCMService();
