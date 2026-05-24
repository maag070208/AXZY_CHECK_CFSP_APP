import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon, useTheme } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { ITText, ITButton } from '../../../shared/components';
import { syncLocalDatabase, hasPendingServerChanges } from '../../../core/database/sync';
import { COLORS } from '../../../shared/utils/constants';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export const SyncScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const [syncing, setSyncing] = useState(true);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'updates_pending' | 'up_to_date'>('checking');
  const [steps, setSteps] = useState([
    { id: 1, label: 'Validando versión de la aplicación', state: 'pending' },
    { id: 2, label: 'Descargando actualizaciones del servidor', state: 'pending' },
    { id: 3, label: 'Sincronizando modificaciones locales', state: 'pending' },
  ]);

  const updateStep = (id: number, state: 'pending' | 'active' | 'success' | 'error') => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, state } : step));
  };

  const handleSync = async () => {
    setSyncing(true);
    setStatus('syncing');

    // Reset steps to pending
    setSteps([
      { id: 1, label: 'Validando versión de la aplicación', state: 'pending' },
      { id: 2, label: 'Descargando actualizaciones del servidor', state: 'pending' },
      { id: 3, label: 'Sincronizando modificaciones locales', state: 'pending' },
    ]);

    try {
      // 1. Validar versión (se hace automáticamente en la primera llamada de Axios, pero lo mostramos visualmente)
      updateStep(1, 'active');
      setServerStatus('checking');
      const pendingUpdates = await hasPendingServerChanges();
      setServerStatus(pendingUpdates ? 'updates_pending' : 'up_to_date');
      await new Promise(resolve => setTimeout(resolve, 800)); // Efecto de flujo fluido
      updateStep(1, 'success');

      // 2. Ejecutar sincronización de WatermelonDB con callbacks de avance
      await syncLocalDatabase((step) => {
        if (step === 'pull') {
          // Descargando actualizaciones
          updateStep(2, 'active');
        } else if (step === 'push') {
          // Sincronizando modificaciones
          updateStep(2, 'success');
          updateStep(3, 'active');
        }
      });

      // Completar todos
      updateStep(2, 'success');
      updateStep(3, 'success');
      setStatus('success');
      setSyncing(false);

      // Redirección automática tras 1.5s
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      // Registrar error en el paso actualmente activo
      setSteps(prev =>
        prev.map(step => {
          if (step.state === 'active') return { ...step, state: 'error' };
          // Si falló antes de empezar el paso 2, marcarlo como error
          if (step.id === 2 && prev[0].state === 'success' && step.state === 'pending') {
            return { ...step, state: 'error' };
          }
          return step;
        })
      );
      
      let msg = 'Error de conexión con el servidor';
      if (error) {
        if (typeof error === 'string') {
          msg = error;
        } else if (error.messages && Array.isArray(error.messages) && error.messages.length > 0) {
          msg = error.messages[0];
        } else if (error.message) {
          msg = error.message;
        }
      }
      setErrorMessage(msg);
      setStatus('error');
      setSyncing(false);
    }
  };

  useEffect(() => {
    handleSync();
  }, []);

  // Bloquear navegación hacia atrás (botón físico o gesto de swipe)
  useEffect(() => {
    const onBackPress = () => {
      return syncing; // true bloquea la navegación
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (syncing) {
        e.preventDefault();
      }
    });

    return () => {
      backSubscription.remove();
      unsubscribe();
    };
  }, [navigation, syncing]);

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {status === 'syncing' && (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
          )}
          {status === 'success' && (
            <Icon source="check-circle" size={80} color={COLORS.emerald} />
          )}
          {status === 'error' && (
            <Icon source="alert-circle" size={80} color={COLORS.red} />
          )}
        </View>

        <ITText variant="headlineMedium" weight="bold" style={styles.title}>
          {status === 'syncing' && 'Sincronizando datos...'}
          {status === 'success' && 'Sincronización Exitosa'}
          {status === 'error' && 'Error al Sincronizar'}
        </ITText>

        <ITText variant="bodyMedium" color="#64748B" center style={styles.subtitle}>
          {status === 'syncing' && 'No cierres la aplicación ni desconectes la red.'}
          {status === 'success' && 'Redireccionando al panel principal.'}
          {status === 'error' && errorMessage}
        </ITText>

        <View style={styles.versionContainer}>
          <ITText variant="bodySmall" color="#64748B">
            Versión de la App: <ITText variant="bodySmall" weight="bold" color="#1E293B">v{API_CONSTANTS.APP_VERSION}</ITText>
          </ITText>
          <View style={styles.statusRow}>
            <ITText variant="bodySmall" color="#64748B">
              Servidor:{' '}
            </ITText>
            {serverStatus === 'checking' && (
              <ITText variant="bodySmall" color="#D97706" weight="bold">Buscando actualizaciones...</ITText>
            )}
            {serverStatus === 'updates_pending' && (
              <ITText variant="bodySmall" color={COLORS.red} weight="bold">Tiene pendiente una actualización</ITText>
            )}
            {serverStatus === 'up_to_date' && (
              <ITText variant="bodySmall" color={COLORS.emerald} weight="bold">Todo actualizado</ITText>
            )}
          </View>
        </View>

        <View style={styles.stepsContainer}>
          {steps.map(step => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                {step.state === 'pending' && <Icon source="circle-outline" size={20} color="#94A3B8" />}
                {step.state === 'active' && <ActivityIndicator size="small" color={theme.colors.primary} />}
                {step.state === 'success' && <Icon source="checkbox-marked-circle" size={22} color={COLORS.emerald} />}
                {step.state === 'error' && <Icon source="close-circle" size={22} color={COLORS.red} />}
              </View>
              <ITText
                variant="bodyMedium"
                style={[
                  styles.stepLabel,
                  step.state === 'active' && { color: theme.colors.primary, fontWeight: 'bold' },
                  step.state === 'success' && { color: '#334155' },
                  step.state === 'error' && { color: COLORS.red, fontWeight: '500' },
                ]}
              >
                {step.label}
              </ITText>
            </View>
          ))}
        </View>

        {status === 'error' && (
          <View style={styles.btnGroup}>
            <ITButton
              label="Reintentar"
              icon="sync"
              onPress={handleSync}
              style={styles.retryBtn}
              mode="contained"
            />
            <ITButton
              label="Volver"
              icon="arrow-left"
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              mode="outlined"
            />
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    transform: [{ scale: 1.6 }],
  },
  title: {
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 24,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 6,
    lineHeight: 20,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    width: '100%',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    color: '#64748B',
    flex: 1,
    fontSize: 14,
  },
  btnGroup: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  retryBtn: {
    width: '100%',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
  },
  backBtn: {
    width: '100%',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
  },
});
