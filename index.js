import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

if (Platform.OS === 'android') {
  notifee.registerForegroundService(() => {
    return new Promise(() => {});
  });
}

async function showNotification(title, body, data, isPersistent) {
  const channelId = await notifee.createChannel({
    id: 'fansal-default',
    name: 'Fansal Notificaciones',
    importance: AndroidImportance.HIGH,
    bypassDnd: isPersistent,
  });

  const androidOptions = {
    channelId,
    pressAction: { id: 'default' },
  };

  if (isPersistent) {
    androidOptions.ongoing = true;
    androidOptions.autoCancel = false;
    androidOptions.asForegroundService = true;
  }

  await notifee.displayNotification({
    title,
    body,
    data,
    android: androidOptions,
  });
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const { notification, data } = remoteMessage;
  const isPersistent = data?.persistent === 'true';
  const title = notification?.title || data?.title || 'FansalCheck';
  const body = notification?.body || data?.message || '';

  console.log('[FCM] Background:', { title, body, isPersistent });

  try {
    await showNotification(title, body, data || {}, isPersistent);
  } catch (e) {
    console.error('[FCM] Error en background:', e);
  }
});

AppRegistry.registerComponent(appName, () => App);
