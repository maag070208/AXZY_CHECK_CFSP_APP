import React from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDispatch } from 'react-redux';
import packageJson from '../../../../package.json';
import { useAppSelector } from '../../../core/store/hooks';
import { showLoader } from '../../../core/store/slices/loader.slice';
import { showToast } from '../../../core/store/slices/toast.slice';
import { login } from '../../../core/store/slices/user.slice';
import { TResult } from '../../../core/types/TResult';
import Logo from '../../../shared/assets/logo.png';
import { ITScreenWrapper, ITText } from '../../../shared/components';
import {
  LoginFormComponent,
  LoginFormComponentValues,
} from '../components/LoginFormComponent';
import { login as loginService } from '../services/AuthService';

const { height, width } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { loading } = useAppSelector(state => state.loaderState);

  const handleLogin = async (values: LoginFormComponentValues) => {
    dispatch(showLoader(true));
    try {
      const response = await loginService(values);

      if (response.success && response.data) {
        dispatch(login(response.data));
        dispatch(
          showToast({
            type: 'success',
            message: 'Bienvenido de nuevo',
          }),
        );
      } else {
        const errorMsg = response.messages?.[0] || 'Error desconocido';
        dispatch(
          showToast({
            type: 'error',
            message: errorMsg,
          }),
        );
      }
    } catch (error) {
      const result = error as TResult<void>;
      dispatch(
        showToast({
          type: 'error',
          message: result?.messages?.[0] || 'Error de conexión con el servidor',
        }),
      );
    } finally {
      dispatch(showLoader(false));
    }
  };

  return (
    <ITScreenWrapper scrollable={true} backgroundColor="#FFFFFF">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Gradiente superior con curva mejorada */}
      <LinearGradient
        colors={['#065911', '#3db553ff', '#0d3b14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* Decoración de curva inferior del gradiente */}
      <View style={styles.gradientCurve} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo y Branding - Mejorado */}
          <View style={styles.brandSection}>
            <View style={styles.logoWrapper}>
              <Image source={Logo} resizeMode="contain" style={styles.logo} />
            </View>

            <View style={styles.titleContainer}>
              <ITText
                variant="headlineMedium"
                weight="bold"
                style={styles.appTitle}
              >
                CheckApp
              </ITText>
              <ITText variant="bodyMedium" style={styles.appSubtitle}>
                Sistema de Gestión y Control Administrativo
              </ITText>
            </View>
          </View>

          {/* Formulario de Login - Card más limpia */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <ITText
                variant="titleLarge"
                weight="bold"
                style={styles.formTitle}
              >
                Iniciar Sesión
              </ITText>
              <ITText variant="bodySmall" style={styles.formSubtitle}>
                Ingresa tus credenciales para acceder al sistema
              </ITText>
            </View>

            <LoginFormComponent onSubmit={handleLogin} loading={loading} />

            <View style={styles.footerInfo}>
              <ITText variant="labelSmall" style={styles.versionText}>
                v{packageJson.version} • AXZY Digital Systems
              </ITText>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  gradientCurve: {
    position: 'absolute',
    top: height * 0.5 - 20,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  titleContainer: {
    alignItems: 'center',
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    color: '#0F172A',
    fontSize: 22,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  formSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  footerInfo: {
    marginTop: 24,
    alignItems: 'center',
  },
  versionText: {
    color: '#94A3B8',
    fontSize: 11,
  },
});

export default LoginScreen;
