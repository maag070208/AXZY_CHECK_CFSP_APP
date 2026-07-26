import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { ITText } from '../../../shared/components/ITText';
import { ITButton } from '../../../shared/components/ITButton';
import {
  PANIC_CONSTANTS,
  PanicStatus,
} from '../../../core/services/panic.service';

interface Props {
  status: PanicStatus;
  pressCount: number;
  onCancel?: () => void;
}

export const PanicOverlay: React.FC<Props> = ({
  status,
  pressCount,
  onCancel,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (status === 'detecting') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [status, pulseAnim]);

  if (status === 'cancelled') {
    return (
      <Animated.View
        style={[styles.containerMuted, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <View style={styles.iconWrapMuted}>
          <Icon source="close-circle-outline" size={64} color="#FFFFFF" />
        </View>
        <ITText style={styles.titleMuted}>Alerta cancelada</ITText>
        {onCancel && (
          <View style={styles.cancelWrap}>
            <ITButton
              mode="text"
              onPress={onCancel}
              labelStyle={styles.cancelLabel}
              style={styles.cancelButton}
            >
              CERRAR
            </ITButton>
          </View>
        )}
      </Animated.View>
    );
  }

  if (status === 'detecting') {
    const remaining = Math.max(
      0,
      PANIC_CONSTANTS.REQUIRED_PRESSES - pressCount,
    );
    return (
      <Animated.View
        style={[styles.containerAlert, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <Animated.View
          style={[
            styles.iconWrapAlert,
            {
              transform: [{ scale: Animated.multiply(pulseAnim, scaleAnim) }],
            },
          ]}
        >
          <Icon source="alert-octagon" size={84} color="#FFFFFF" />
        </Animated.View>
        <ITText style={styles.titleAlert}>EMERGENCIA</ITText>
        <ITText style={styles.subtitleAlert}>
          Presiona volumen 5 veces para enviar
        </ITText>

        <View style={styles.dotsRow}>
          {Array.from({ length: PANIC_CONSTANTS.REQUIRED_PRESSES }).map(
            (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pressCount ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ),
          )}
        </View>
        <ITText style={styles.counter}>
          {pressCount} / {PANIC_CONSTANTS.REQUIRED_PRESSES}
        </ITText>
        {remaining > 0 && (
          <ITText style={styles.hint}>
            Faltan {remaining} {remaining === 1 ? 'toque' : 'toques'}
          </ITText>
        )}

        {onCancel && (
          <View style={styles.cancelWrap}>
            <ITButton
              mode="text"
              onPress={onCancel}
              labelStyle={styles.cancelLabel}
              style={styles.cancelButton}
            >
              CANCELAR
            </ITButton>
          </View>
        )}
      </Animated.View>
    );
  }

  if (status === 'dispatched') {
    return (
      <Animated.View
        style={[styles.containerAlert, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <Animated.View
          style={[
            styles.iconWrapAlert,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Icon source="cellphone-arrow-down" size={84} color="#FFFFFF" />
        </Animated.View>
        <ITText style={styles.titleAlert}>Enviando alerta...</ITText>
        <ITText style={styles.subtitleAlert}>
          Obteniendo tu ubicación actual
        </ITText>
      </Animated.View>
    );
  }

  if (status === 'sent') {
    return (
      <Animated.View
        style={[styles.containerSuccess, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <Animated.View
          style={[
            styles.iconWrapSuccess,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Icon source="check-decagram" size={88} color="#FFFFFF" />
        </Animated.View>
        <ITText style={styles.titleSuccess}>Alerta enviada</ITText>
        <ITText style={styles.subtitleSuccess}>
          Tu supervisor ha sido notificado con tu ubicación.
        </ITText>
        <ITText style={styles.hintSuccess}>
          Mantente donde te encuentras. La ayuda va en camino.
        </ITText>
        {onCancel && (
          <View style={styles.cancelWrap}>
            <ITButton
              mode="contained"
              onPress={onCancel}
              labelStyle={styles.successButtonLabel}
              style={styles.successButton}
            >
              CERRAR
            </ITButton>
          </View>
        )}
      </Animated.View>
    );
  }

  if (status === 'queued') {
    return (
      <Animated.View
        style={[styles.containerWarning, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <Animated.View
          style={[
            styles.iconWrapWarning,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Icon source="cloud-upload-outline" size={84} color="#FFFFFF" />
        </Animated.View>
        <ITText style={styles.titleWarning}>Alerta guardada</ITText>
        <ITText style={styles.subtitleWarning}>
          Sin conexión. Se enviará automáticamente cuando se restaure el
          servicio.
        </ITText>
        {onCancel && (
          <View style={styles.cancelWrap}>
            <ITButton
              mode="contained"
              onPress={onCancel}
              labelStyle={styles.successButtonLabel}
              style={styles.warningButton}
            >
              CERRAR
            </ITButton>
          </View>
        )}
      </Animated.View>
    );
  }

  if (status === 'failed') {
    return (
      <Animated.View
        style={[styles.containerError, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <Animated.View
          style={[
            styles.iconWrapError,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Icon source="close-circle-outline" size={84} color="#FFFFFF" />
        </Animated.View>
        <ITText style={styles.titleError}>No se pudo enviar</ITText>
        <ITText style={styles.subtitleError}>
          Inténtalo de nuevo o contacta a tu supervisor por otro medio.
        </ITText>
        {onCancel && (
          <View style={styles.cancelWrap}>
            <ITButton
              mode="text"
              onPress={onCancel}
              labelStyle={styles.cancelLabel}
              style={styles.cancelButton}
            >
              ENTENDIDO
            </ITButton>
          </View>
        )}
      </Animated.View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  containerAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 20,
    paddingHorizontal: 28,
  },
  containerSuccess: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 20,
    paddingHorizontal: 28,
  },
  containerWarning: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 20,
    paddingHorizontal: 28,
  },
  containerError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 20,
    paddingHorizontal: 28,
  },
  containerMuted: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 20,
    paddingHorizontal: 28,
  },
  iconWrapAlert: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 3,
    borderColor: 'rgba(220, 38, 38, 0.6)',
  },
  iconWrapSuccess: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapWarning: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapError: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrapMuted: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleAlert: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitleAlert: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 20,
    marginBottom: 8,
  },
  titleSuccess: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitleSuccess: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 24,
    marginBottom: 8,
  },
  hintSuccess: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.85,
    marginTop: 8,
  },
  titleWarning: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitleWarning: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 22,
  },
  titleError: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitleError: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 22,
  },
  titleMuted: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.75,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 12,
    gap: 14,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  cancelWrap: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 32,
  },
  cancelLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  successButton: {
    paddingHorizontal: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 4,
  },
  successButtonLabel: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  warningButton: {
    paddingHorizontal: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 4,
  },
});
