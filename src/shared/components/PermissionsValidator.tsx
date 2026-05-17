import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  AppState,
  PermissionsAndroid,
  Platform,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { ITText, ITButton } from './';
import { Icon } from 'react-native-paper';

interface Props {
  children: React.ReactNode;
}

export const PermissionsValidator = ({ children }: Props) => {
  const [hasAllPermissions, setHasAllPermissions] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkPermissions = useCallback(async () => {
    try {
      let locationGranted = false;
      if (Platform.OS === 'android') {
        locationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      } else {
        locationGranted = true;
      }

      const cameraStatus = Camera.getCameraPermissionStatus();
      const micStatus = Camera.getMicrophonePermissionStatus();

      if (
        locationGranted &&
        cameraStatus === 'granted' &&
        micStatus === 'granted'
      ) {
        setHasAllPermissions(true);
      } else {
        setHasAllPermissions(false);
      }
    } catch (error) {
      console.log('Error checking permissions', error);
      setHasAllPermissions(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });
    return () => subscription.remove();
  }, [checkPermissions]);

  const requestPermissions = async () => {
    setIsChecking(true);
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      }
      await Camera.requestCameraPermission();
      await Camera.requestMicrophonePermission();
    } catch (e) {
      console.log('Error requesting', e);
    } finally {
      checkPermissions();
    }
  };

  if (isChecking) {
    return <View style={styles.container} />;
  }

  if (!hasAllPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Icon source="shield-alert-outline" size={80} color="#64748B" />
          <ITText variant="titleLarge" style={styles.title}>
            Permisos Requeridos
          </ITText>
          <ITText variant="bodyMedium" style={styles.description}>
            La aplicación necesita acceso a la cámara, micrófono y ubicación
            para funcionar correctamente. Por favor, actívalos en la
            configuración.
          </ITText>
          <ITButton
            mode="outlined"
            onPress={requestPermissions}
            style={styles.button}
          >
            Permitir y continuar
          </ITButton>
          <ITButton
            mode="contained"
            onPress={() => Linking.openSettings()}
            style={styles.button}
          >
            Abrir Configuración
          </ITButton>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#64748B',
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
});
