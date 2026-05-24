import React, { useEffect, useState } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';

export const NoInternetScreen = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  // Initial check & listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Update check on app coming to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnection();
      }
    });
    return () => subscription.remove();
  }, []);

  const checkConnection = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
  };

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
