import React, { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { fcmService } from '../services/fcm.service';

// Registrar foreground service para notificaciones persistentes (tipo Uber)
if (Platform.OS === 'android') {
  notifee.registerForegroundService((notification) => {
    return new Promise(() => {
      // Mantiene vivo el servicio. Solo se detiene con stopForegroundService()
    });
  });
}

async function showNotifeeNotification(title: string, body: string, data: any, isPersistent: boolean) {
  const channelId = await notifee.createChannel({
    id: 'fansal-default',
    name: 'Fansal Notificaciones',
    importance: AndroidImportance.HIGH,
    bypassDnd: isPersistent,
  });

  const androidOptions: any = {
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

export const FCMProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isSignedIn = useSelector(
    (state: any) => state.userState.isSignedIn,
  );

  const setupFCM = useCallback(async () => {
    const hasPermission = await fcmService.requestPermission();
    if (!hasPermission) {
      console.log('[FCM] Permiso de notificaciones denegado');
      return;
    }

    const token = await fcmService.getToken();
    if (token) {
      await fcmService.registerToken(token);
    }

    fcmService.onTokenRefresh((newToken) => {
      fcmService.registerToken(newToken);
    });
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      setupFCM();
    }
  }, [isSignedIn, setupFCM]);

  useEffect(() => {
    const unsubscribe = fcmService.onForegroundMessage(async (remoteMessage) => {
      const { notification, data } = remoteMessage;
      const isPersistent = data?.persistent === 'true';
      const title = notification?.title || data?.title || 'FansalCheck';
      const body = notification?.body || data?.message || 'Notificacion recibida';

      console.log('[FCM] Foreground:', { title, body, isPersistent });

      try {
        await showNotifeeNotification(title, body, data || {}, isPersistent);
      } catch (err) {
        console.error('[FCM] Error mostrando notificacion:', err);
      }
    });

    return () => {
      unsubscribe();
      fcmService.cleanup();
    };
  }, []);

  return <>{children}</>;
};
