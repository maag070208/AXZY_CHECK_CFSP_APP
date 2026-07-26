import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  AppState,
  AppStateStatus,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import Geolocation from '@react-native-community/geolocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ITText, ITButton } from './';

interface Props {
  children: React.ReactNode;
}

const CHECK_INTERVAL_MS = 15000;
const GPS_TIMEOUT_MS = 15000;

const isGpsEnabled = (): Promise<boolean> =>
  new Promise(resolve => {
    try {
      Geolocation.getCurrentPosition(
        () => resolve(true),
        error => {
          if (error.code === 1) {
            resolve(true);
            return;
          }
          resolve(true);
        },
        { enableHighAccuracy: false, timeout: GPS_TIMEOUT_MS, maximumAge: 300000 },
      );
    } catch {
      resolve(false);
    }
  });

export const LocationValidator = ({ children }: Props) => {
  const [gpsActive, setGpsActive] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  const checkGps = useCallback(async () => {
    const enabled = await isGpsEnabled();
    setGpsActive(enabled);
  }, []);

  useEffect(() => {
    checkGps();

    intervalRef.current = setInterval(() => {
      checkGps();
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkGps]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkGps();
        }
      },
    );
    return () => subscription.remove();
  }, [checkGps]);

  if (gpsActive === null || gpsActive) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.blocker, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Icon source="map-marker-off" size={80} color="#FFFFFF" />
          <ITText style={styles.title}>Ubicación desactivada</ITText>
          <ITText style={styles.subtitle}>
            Para usar la aplicación es necesario tener la ubicación activa.
          </ITText>
          <ITText style={styles.hint}>
            Activa la ubicación de tu dispositivo y vuelve a intentarlo.
          </ITText>
          <ITButton
            mode="contained"
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonLabel}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Linking.openURL('App-Prefs:LOCATION_SERVICES');
              } else {
                Linking.openSettings();
              }
            }}
          >
            Abrir Configuración
          </ITButton>
          <ITButton
            mode="outlined"
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonLabel}
            onPress={checkGps}
          >
            Reintentar
          </ITButton>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  blocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 10,
  },
  safe: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 22,
    marginTop: 8,
  },
  hint: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#46a545',
    borderRadius: 24,
    paddingVertical: 4,
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    width: '100%',
    marginTop: 12,
    borderRadius: 24,
    borderColor: '#FFFFFF',
    paddingVertical: 4,
  },
  secondaryButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
