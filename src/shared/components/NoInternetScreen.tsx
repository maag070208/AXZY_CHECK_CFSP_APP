import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { store } from '../../core/store/redux.config';

export const NoInternetScreen = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const wasOfflineRef = useRef(false);

  const handleSyncOnReconnect = () => {
    const stateStore = store.getState();
    if (stateStore.userState.isSignedIn) {
      console.log('[NetInfo Listener] Reconnected. Navigating to SyncScreen...');
      const { navigationRef } = require('../../navigation/navigationRef');
      if (navigationRef.isReady()) {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute?.name !== 'SYNC_SCREEN') {
          navigationRef.navigate('SYNC_SCREEN');
        }
      }
    }
  };

  // Initial check & listener
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

  // Update check on app coming to foreground
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

  if (isConnected === null || isConnected) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Icon source="wifi-off" size={14} color="#FFFFFF" />
      <Text style={styles.bannerText}>Sin conexión — Modo Offline Activo</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444', // Red 500
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
    zIndex: 99999,
    elevation: 5,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
