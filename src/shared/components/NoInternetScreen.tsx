import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { store } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';

const ROLES_THAT_SYNC = new Set([UserRole.GUARD, UserRole.MAINT, UserRole.SHIFT]);

export const NoInternetScreen = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const wasOfflineRef = useRef(false);
  const roleRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();

  const getIsRoleBlocked = () => {
    const state = store.getState();
    const role = state.userState?.role as string | null;
    roleRef.current = role;
    return role && !ROLES_THAT_SYNC.has(role as UserRole);
  };

  const handleSyncOnReconnect = () => {
    const stateStore = store.getState();
    if (!stateStore.userState.isSignedIn) return;
    const role = stateStore.userState?.role as string | null;
    if (role && !ROLES_THAT_SYNC.has(role as UserRole)) return;
    console.log('[NetInfo Listener] Reconnected. Navigating to SyncScreen...');
    const { navigationRef } = require('../../navigation/navigationRef');
    if (navigationRef.isReady()) {
      const currentRoute = navigationRef.getCurrentRoute();
      if (currentRoute?.name !== 'SYNC_SCREEN') {
        navigationRef.navigate('SYNC_SCREEN');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = !!state.isConnected;
      setIsConnected(state.isConnected);

      if (isOnline && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        handleSyncOnReconnect();
      } else if (!isOnline) {
        wasOfflineRef.current = true;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const state = await NetInfo.fetch();
        const isOnline = !!state.isConnected;
        setIsConnected(state.isConnected);

        if (isOnline && wasOfflineRef.current) {
          wasOfflineRef.current = false;
          handleSyncOnReconnect();
        } else if (!isOnline) {
          wasOfflineRef.current = true;
        }
      }
    });
    return () => subscription.remove();
  }, []);

  if (isConnected === null || isConnected) return null;

  const isBlocked = getIsRoleBlocked();

  if (isBlocked) {
    return (
      <View style={styles.blocker}>
        <Icon source="wifi-off" size={64} color="#FFFFFF" />
        <Text style={styles.blockerTitle}>Sin Conexión</Text>
        <Text style={styles.blockerSubtitle}>
          Esta aplicación requiere conexión a internet para funcionar.
        </Text>
        <Text style={styles.blockerHint}>
          Verifica tu conexión WiFi o datos móviles e intenta de nuevo.
        </Text>
        <View style={styles.retryButton}>
          <Text
            style={styles.retryLabel}
            onPress={async () => {
              const state = await NetInfo.fetch();
              setIsConnected(state.isConnected);
            }}
          >
            Reintentar
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.banner, {paddingVertical:6, paddingBottom: 4 }]}>
      <Icon source="wifi-off" size={12} color="#FFFFFF" />
      <Text style={styles.bannerText}>Modo Offline</Text>
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
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 10,
    paddingHorizontal: 32,
    gap: 12,
  },
  blockerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  blockerSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  blockerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 99999,
    elevation: 10,
    paddingHorizontal: 12,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
});
