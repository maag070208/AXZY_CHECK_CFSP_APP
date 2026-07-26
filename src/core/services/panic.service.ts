import {
  Platform,
  PermissionsAndroid,
  Alert,
  Vibration,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database/database';
import { store } from '../store/redux.config';
import { IUserState } from '../store/slices/user.slice';
import { showToast } from '../store/slices/toast.slice';
import { post } from '../axios';

export interface IPanicLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface IPanicAlert {
  id: string;
  guardId: string;
  guardName: string;
  location: IPanicLocation | null;
  createdAt: number;
  deliveryStatus: 'sending' | 'sent' | 'queued' | 'failed';
  serverMessage?: string;
}

export type PanicStatus =
  | 'idle'
  | 'detecting'
  | 'dispatched'
  | 'sent'
  | 'queued'
  | 'failed'
  | 'cancelled';

export type PanicStateListener = (state: {
  status: PanicStatus;
  pressCount: number;
  lastAlert: IPanicAlert | null;
  errorMessage?: string;
}) => void;

const REQUIRED_PRESSES = 5;
const PRESS_WINDOW_MS = 4000;
const MIN_PRESS_INTERVAL_MS = 150;
const GEO_TIMEOUT_MS = 8000;
const TITLE_PREFIX = '[EMERGENCIA]';

const generateUUID = (): string => {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) s += '-';
    s += chars[Math.floor(Math.random() * 16)];
  }
  return s;
};

const triggerHaptic = (): void => {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(60);
    } else {
      Vibration.vibrate();
    }
  } catch {}
};

const triggerStrongHaptic = (): void => {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 120, 80, 120, 80, 200]);
    } else {
      Vibration.vibrate([0, 100, 80, 100, 80, 200]);
    }
  } catch {}
};

const getCurrentLocation = (): Promise<IPanicLocation | null> =>
  new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 0 },
    );
  });

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const persistOfflineAlert = async (
  user: IUserState,
  location: IPanicLocation | null,
): Promise<string> => {
  const id = generateUUID();
  await database.write(async () => {
    await database.get('incidents').create((record: any) => {
      record._raw.id = id;
      record.guardId = user.id || '';
      record.title = `${TITLE_PREFIX} Alerta de pánico`;
      record.description =
        'Alerta de pánico disparada desde botón de volumen. ' +
        'El guardia requiere apoyo inmediato.';
      record.latitude = location?.latitude ?? null;
      record.longitude = location?.longitude ?? null;
      record.status = 'PENDING';
      record.clientId = user.clientId ?? null;
      record.media = JSON.stringify([]);
    });
  });
  return id;
};

const dispatchOnlineAlert = async (
  user: IUserState,
  location: IPanicLocation | null,
): Promise<{ ok: boolean; message?: string; alertId?: string }> => {
  // Endpoint dedicado /panic-alerts. Crea un PanicAlert propio y dispara
  // FCM push CRÍTICO a todos los guardias del mismo clientId + Ably en
  // canal "global" y "panic.{clientId}" para tiempo real.
  const panicResponse = await post<{
    id: string;
    status: string;
    guardId: string;
    clientId: string | null;
    createdAt: string;
  }>('/panic-alerts', {
    source: 'volume_button',
    triggerLatitude: location?.latitude,
    triggerLongitude: location?.longitude,
    triggerAccuracy: location?.accuracy,
  });

  if (panicResponse.success) {
    return { ok: true, alertId: panicResponse.data?.id };
  }

  return {
    ok: false,
    message: panicResponse.messages?.[0] || 'Error desconocido',
  };
};

class PanicService {
  private pressCount = 0;
  private firstPressAt = 0;
  private lastPressAt = 0;
  private lastDirection: 'UP' | 'DOWN' | null = null;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;
  private listener: PanicStateListener | null = null;
  private lastAlert: IPanicAlert | null = null;
  private dispatching = false;
  private source: 'native' | 'js' = 'js';

  setListener(listener: PanicStateListener | null) {
    this.listener = listener;
    this.emit('idle');
  }

  getLastAlert(): IPanicAlert | null {
    return this.lastAlert;
  }

  getPressCount(): number {
    return this.pressCount;
  }

  /**
   * Llamado por el provider cuando hay un cambio de volumen.
   * REQUIERE que la dirección (UP/DOWN) se mantenga CONSISTENTE durante
   * toda la secuencia: si el guardia presiona 3 UP y luego 1 DOWN, el
   * contador se resetea. La alerta sólo se dispara con 5 UP consecutivos
   * o 5 DOWN consecutivos. Esto evita falsos positivos por uso casual
   * del volumen.
   */
  onVolumeChange(
    direction: 'UP' | 'DOWN',
    source: 'native' | 'js' = 'js',
  ): void {
    if (this.dispatching) return;
    this.source = source;

    const now = Date.now();

    if (this.pressCount > 0 && now - this.lastPressAt < MIN_PRESS_INTERVAL_MS) {
      return;
    }

    // Si cambia la dirección, resetear. La alerta requiere consistencia.
    if (this.lastDirection !== null && this.lastDirection !== direction) {
      this.pressCount = 0;
      this.firstPressAt = 0;
    }

    if (this.pressCount === 0 || now - this.firstPressAt > PRESS_WINDOW_MS) {
      this.pressCount = 1;
      this.firstPressAt = now;
    } else {
      this.pressCount += 1;
    }
    this.lastPressAt = now;
    this.lastDirection = direction;

    triggerHaptic();
    this.emit('detecting');

    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      if (!this.dispatching) {
        this.pressCount = 0;
        this.firstPressAt = 0;
        this.lastDirection = null;
        this.emit('idle');
      }
    }, PRESS_WINDOW_MS);

    if (this.pressCount >= REQUIRED_PRESSES) {
      this.pressCount = 0;
      this.firstPressAt = 0;
      this.lastDirection = null;
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
      triggerStrongHaptic();
      void this.dispatchPanic();
    }
  }

  /**
   * Llamado por el PanicProvider cuando el bridge nativo (BroadcastReceiver
   * corriendo en background o con la app cerrada) detecta los 5 presses.
   * Se sincroniza con el estado de SharedPreferences antes de despachar.
   */
  async onNativeTriggered(): Promise<void> {
    if (this.dispatching) return;
    this.source = 'native';
    triggerStrongHaptic();
    await this.dispatchPanic();
  }

  cancel(): void {
    if (this.dispatching) return;
    this.pressCount = 0;
    this.firstPressAt = 0;
    this.lastDirection = null;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.emit('cancelled');
  }

  reset(): void {
    this.pressCount = 0;
    this.firstPressAt = 0;
    this.lastPressAt = 0;
    this.lastDirection = null;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.dispatching = false;
    this.emit('idle');
  }

  private async dispatchPanic(): Promise<void> {
    this.dispatching = true;
    const state = store.getState();
    const user = state.userState;
    if (!user.isSignedIn || !user.id) {
      this.dispatching = false;
      this.emit('idle');
      return;
    }

    this.emit('dispatched');

    await requestLocationPermission();
    const location = await getCurrentLocation();

    const netState = await NetInfo.fetch();
    const isOnline = !!netState.isConnected;

    const alertId = isOnline ? generateUUID() : '';
    const baseAlert: IPanicAlert = {
      id: alertId,
      guardId: user.id,
      guardName: user.fullName || user.username || 'Guardia',
      location,
      createdAt: Date.now(),
      deliveryStatus: 'sending',
    };
    this.lastAlert = baseAlert;
    this.emit('dispatched');

    try {
      if (isOnline) {
        const result = await dispatchOnlineAlert(user, location);
        if (result.ok) {
          this.lastAlert = { ...baseAlert, deliveryStatus: 'sent' };
          this.emit('sent');
        } else {
          const offlineId = await persistOfflineAlert(user, location);
          this.lastAlert = {
            ...baseAlert,
            id: offlineId,
            deliveryStatus: 'queued',
            serverMessage: result.message,
          };
          this.emit('queued');
        }
      } else {
        const offlineId = await persistOfflineAlert(user, location);
        this.lastAlert = {
          ...baseAlert,
          id: offlineId,
          deliveryStatus: 'queued',
        };
        this.emit('queued');
      }
    } catch (err) {
      try {
        const offlineId = await persistOfflineAlert(user, location);
        this.lastAlert = {
          ...baseAlert,
          id: offlineId,
          deliveryStatus: 'queued',
          serverMessage: err instanceof Error ? err.message : 'Error inesperado',
        };
        this.emit('queued');
      } catch (persistErr) {
        this.lastAlert = {
          ...baseAlert,
          deliveryStatus: 'failed',
          serverMessage:
            persistErr instanceof Error
              ? persistErr.message
              : 'No se pudo guardar la alerta',
        };
        this.emit('failed');
        store.dispatch(
          showToast({
            type: 'error',
            message: 'No se pudo enviar la alerta de pánico',
          }),
        );
        Alert.alert(
          'Alerta de pánico',
          'No se pudo enviar ni guardar la alerta. Intenta nuevamente.',
        );
      }
    } finally {
      this.dispatching = false;
    }
  }

  private emit(status: PanicStatus): void {
    if (!this.listener) return;
    this.listener({
      status,
      pressCount: this.pressCount,
      lastAlert: this.lastAlert,
    });
  }
}

export const panicService = new PanicService();
export const PANIC_CONSTANTS = { REQUIRED_PRESSES, PRESS_WINDOW_MS };
