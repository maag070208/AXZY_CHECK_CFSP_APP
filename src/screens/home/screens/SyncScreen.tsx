import React, { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon, useTheme } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { ITText, ITButton } from '../../../shared/components';
import { syncLocalDatabase, hasPendingServerChanges, SyncStep } from '../../../core/database/sync';
import { COLORS } from '../../../shared/utils/constants';
import { API_CONSTANTS } from '../../../core/constants/API_CONSTANTS';

export const SyncScreen = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const [syncing, setSyncing] = useState(true);
  const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'updates_pending' | 'up_to_date'>('checking');
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    tableName: string;
  } | null>(null);

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
    setUploadProgress(null);

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

      // 2. Sincronizar
      await syncLocalDatabase((step: SyncStep) => {
        if (typeof step === 'string') {
          if (step === 'pull') {
            updateStep(2, 'active');
          } else if (step === 'push') {
            updateStep(2, 'success');
            updateStep(3, 'active');
          }
        } else {
          if (step.type === 'pull') {
            updateStep(2, 'active');
          } else if (step.type === 'push') {
            updateStep(2, 'success');
            updateStep(3, 'active');
          } else if (step.type === 'media_upload_start') {
            updateStep(2, 'success');
            updateStep(3, 'active');
            setUploadProgress({ current: 0, total: step.total, tableName: '' });
          } else if (step.type === 'media_upload_progress') {
            updateStep(2, 'success');
            updateStep(3, 'active');
            setUploadProgress({
              current: step.current,
              total: step.total,
              tableName: step.tableName,
            });
          }
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
      <View style={styles.fullScreenContent}>
        <View style={styles.iconContainer}>
          {status === 'syncing' && (
            <ActivityIndicator size="large" color={COLORS.emerald} style={styles.spinner} />
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

        <ITText variant="bodyMedium" color="#94A3B8" center style={styles.subtitle}>
          {status === 'syncing' && 'No cierres la aplicación ni desconectes la red.'}
          {status === 'success' && 'Redireccionando al panel principal.'}
          {status === 'error' && errorMessage}
        </ITText>

        <View style={styles.versionContainer}>
          <ITText variant="bodySmall" color="#94A3B8">
            Versión de la App: <ITText variant="bodySmall" weight="bold" color="#F8FAFC">v{API_CONSTANTS.APP_VERSION}</ITText>
          </ITText>
          <View style={styles.statusRow}>
            <ITText variant="bodySmall" color="#94A3B8">
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
                {step.state === 'pending' && <Icon source="circle-outline" size={20} color="#64748B" />}
                {step.state === 'active' && <ActivityIndicator size="small" color={COLORS.emerald} />}
                {step.state === 'success' && <Icon source="checkbox-marked-circle" size={22} color={COLORS.emerald} />}
                {step.state === 'error' && <Icon source="close-circle" size={22} color={COLORS.red} />}
              </View>
              <ITText
                variant="bodyMedium"
                style={[
                  styles.stepLabel,
                  step.state === 'active' && { color: COLORS.emerald, fontWeight: 'bold' },
                  step.state === 'success' && { color: '#94A3B8' },
                  step.state === 'error' && { color: COLORS.red, fontWeight: '500' },
                ]}
              >
                {step.label}
              </ITText>
            </View>
          ))}
        </View>

        {uploadProgress && (
          <View style={styles.progressContainer}>
            <ITText variant="bodySmall" color="#94A3B8" center>
              Subiendo archivos offline de{' '}
              {uploadProgress.tableName === 'incidents'
                ? 'incidencias'
                : uploadProgress.tableName === 'maintenances'
                ? 'mantenimiento'
                : 'bitácora'}...
            </ITText>
            <ITText variant="bodyLarge" weight="bold" color="#F8FAFC" center style={{ marginTop: 4 }}>
              {uploadProgress.current} de {uploadProgress.total} archivos
            </ITText>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(uploadProgress.current / uploadProgress.total) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}

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
  },
  fullScreenContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    transform: [{ scale: 1.6 }],
  },
  title: {
    textAlign: 'center',
    color: '#F8FAFC',
    fontSize: 26,
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: '100%',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 24,
    padding: 24,
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    color: '#94A3B8',
    flex: 1,
    fontSize: 15,
  },
  progressContainer: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    marginBottom: 24,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.emerald,
    borderRadius: 4,
  },
  btnGroup: {
    width: '100%',
    gap: 12,
    marginTop: 12,
  },
  retryBtn: {
    width: '100%',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    backgroundColor: COLORS.emerald,
  },
  backBtn: {
    width: '100%',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    borderColor: '#334155',
  },
});
