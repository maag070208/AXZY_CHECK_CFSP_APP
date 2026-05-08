import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, Image } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAppSelector } from '../../core/store/hooks'; // Ajusta esta ruta a tu store
import LogoSource from '../assets/logo.png';

interface LoaderComponentProps {
  visible?: boolean;
}

export const LoaderComponent = ({ visible }: LoaderComponentProps) => {
  // Obtenemos el estado global, pero permitimos sobrescribirlo con la prop 'visible'
  const globalLoading = useAppSelector(state => state.loaderState.loading);
  const loading = visible ?? globalLoading;
  const theme = useTheme();

  // --- VALORES COMPARTIDOS PARA LA ANIMACIÓN ---

  // 1. Escala para el efecto de pulso (de 1 a 1.05)
  const scale = useSharedValue(1);

  // 2. Rotación para el giro 3D (de 0 a 1)
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      // Iniciar animación de pulso (suave e infinita)
      scale.value = withRepeat(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1, // infinito
        true, // hace bounce (va y vuelve)
      );

      // Iniciar animación de rotación 3D (continua e infinita)
      rotation.value = withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.linear }),
        -1, // infinito
        false, // no hace bounce, gira siempre hacia el mismo lado
      );
    } else {
      // Resetear valores cuando no está cargando
      scale.value = withTiming(1);
      rotation.value = withTiming(0);
    }
  }, [loading]);

  // --- ESTILOS ANIMADOS ---

  // Estilo para el contenedor blanco (pulso y opacidad)
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(scale.value, [1, 1.05], [0.98, 1]), // Sutil cambio de opacidad con el pulso
    };
  });

  // Estilo para el logo (Giro 3D en el eje Y)
  const animatedLogoStyle = useAnimatedStyle(() => {
    // Mapeamos el valor 0-1 a 0-360 grados
    const rotateY = interpolate(rotation.value, [0, 1], [0, 360]);
    return {
      transform: [
        { perspective: 1000 }, // Necesario para que el efecto 3D se vea real
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  // Si no está cargando o no hay tema, no renderizar nada
  if (!loading || !theme || !theme.colors) return null;

  return (
    <Modal transparent={true} visible={loading} animationType="fade">
      <View style={styles.overlay}>
        {/* Contenedor principal animado (Pulso) */}
        <Animated.View
          style={[
            styles.container,
            animatedContainerStyle,
            { backgroundColor: '#FFFFFF' }, // Fondo blanco fijo
          ]}
        >
          {/* Contenedor del Logo animado (Giro 3D) - Solo el logo, sin texto */}
          <Animated.View style={[styles.logoWrapper, animatedLogoStyle]}>
            <Image
              source={LogoSource}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo oscuro que permite ver el loader blanco
  },
  container: {
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Eliminado minWidth para que sea más compacto
    // Sombra premium para que destaque sobre el fondo oscuro
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  logoWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    // Eliminado marginBottom porque ya no hay texto
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
