import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppSelector } from '../store/hooks';
import {
  panicService,
  PanicStateListener,
  PanicStatus,
} from '../services/panic.service';
import { panicNativeBridge } from '../services/panic.native.bridge';
import { PanicOverlay } from '../../screens/panic/components/PanicOverlay';

type VolumeSubscription = { remove: () => void } | null;

interface Props {
  children: React.ReactNode;
}

export const PanicProvider: React.FC<Props> = ({ children }) => {
  const isSignedIn = useAppSelector(state => state.userState.isSignedIn);
  const [overlayState, setOverlayState] = useState<{
    status: PanicStatus;
    pressCount: number;
    visible: boolean;
  }>({ status: 'idle', pressCount: 0, visible: false });

  const volumeListenerRef = useRef<VolumeSubscription>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeUnsubscribeRef = useRef<(() => void) | null>(null);

  const hideOverlaySoon = useCallback((ms: number) => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setOverlayState(prev => ({ ...prev, visible: false }));
    }, ms);
  }, []);

  const handlePanicState: PanicStateListener = useCallback(
    state => {
      setOverlayState(prev => {
        if (state.status === 'detecting') {
          if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
          return {
            status: 'detecting',
            pressCount: state.pressCount,
            visible: true,
          };
        }
        if (
          state.status === 'dispatched' ||
          state.status === 'sent' ||
          state.status === 'queued' ||
          state.status === 'failed'
        ) {
          if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
          return {
            status: state.status,
            pressCount: 0,
            visible: true,
          };
        }
        if (state.status === 'cancelled') {
          return { ...prev, status: 'cancelled', pressCount: 0, visible: true };
        }
        return { ...prev, status: 'idle', pressCount: 0, visible: false };
      });

      if (
        state.status === 'sent' ||
        state.status === 'queued' ||
        state.status === 'failed'
      ) {
        hideOverlaySoon(state.status === 'failed' ? 6000 : 4000);
      } else if (state.status === 'cancelled') {
        hideOverlaySoon(1500);
      }
    },
    [hideOverlaySoon],
  );

  useEffect(() => {
    panicService.setListener(handlePanicState);
    return () => {
      panicService.setListener(null);
    };
  }, [handlePanicState]);

  useEffect(() => {
    if (!isSignedIn) {
      if (volumeListenerRef.current) {
        try {
          volumeListenerRef.current.remove();
        } catch {}
        volumeListenerRef.current = null;
      }
      if (nativeUnsubscribeRef.current) {
        nativeUnsubscribeRef.current();
        nativeUnsubscribeRef.current = null;
      }
      if (panicNativeBridge.isAvailable()) {
        panicNativeBridge.stopPanicService().catch(() => {});
      }
      panicService.reset();
      setOverlayState({ status: 'idle', pressCount: 0, visible: false });
      return;
    }

    let cancelled = false;

    (async () => {
      if (panicNativeBridge.isAvailable()) {
        try {
          await panicNativeBridge.startPanicService();
        } catch (e) {
          console.error('[PanicProvider] No se pudo iniciar el servicio nativo', e);
        }
        if (cancelled) return;

        const unsubscribe = panicNativeBridge.onTriggered(() => {
          void panicService.onNativeTriggered();
        });
        nativeUnsubscribeRef.current = unsubscribe;
      } else {
        console.warn(
          '[PanicProvider] PanicModule nativo no disponible. ' +
            'La alerta de pánico solo funcionará con la app abierta.',
        );
      }
    })();

    (async () => {
      try {
        const mod = require('react-native-volume-manager');
        if (cancelled) return;
        const VolumeManager =
          mod.VolumeManager ?? mod.default?.VolumeManager ?? mod.default ?? mod;

        if (typeof VolumeManager.enable === 'function') {
          try {
            await VolumeManager.enable(true, false);
          } catch {}
        }
        if (typeof VolumeManager.setActive === 'function') {
          try {
            await VolumeManager.setActive(true, false);
          } catch {}
        }
        if (typeof VolumeManager.showNativeVolumeUI === 'function') {
          try {
            await VolumeManager.showNativeVolumeUI({ enabled: false });
          } catch {}
        }

        if (typeof VolumeManager.addVolumeListener !== 'function') {
          return;
        }

        const lastVolumeRef = { value: -1 };
        const subscription = VolumeManager.addVolumeListener(
          (result: { volume: number }) => {
            const current = result.volume;
            if (lastVolumeRef.value === -1) {
              lastVolumeRef.value = current;
              return;
            }
            if (current !== lastVolumeRef.value) {
              const direction: 'UP' | 'DOWN' =
                current > lastVolumeRef.value ? 'UP' : 'DOWN';
              panicService.onVolumeChange(direction, 'js');
            }
            lastVolumeRef.value = current;
          },
        );
        if (cancelled) {
          try {
            subscription?.remove?.();
          } catch {}
          return;
        }
        volumeListenerRef.current = subscription;
      } catch (err) {
        console.warn(
          '[PanicProvider] react-native-volume-manager no disponible ' +
            '(opcional cuando el módulo nativo está activo).',
          err,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (volumeListenerRef.current) {
        try {
          volumeListenerRef.current.remove();
        } catch {}
        volumeListenerRef.current = null;
      }
      if (nativeUnsubscribeRef.current) {
        nativeUnsubscribeRef.current();
        nativeUnsubscribeRef.current = null;
      }
    };
  }, [isSignedIn]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && isSignedIn) {
          panicService.reset();
        }
      },
    );
    return () => sub.remove();
  }, [isSignedIn]);

  const handleCancel = useCallback(() => {
    panicService.cancel();
  }, []);

  return (
    <>
      {children}
      {overlayState.visible && (
        <PanicOverlay
          status={overlayState.status}
          pressCount={overlayState.pressCount}
          onCancel={handleCancel}
        />
      )}
    </>
  );
};
