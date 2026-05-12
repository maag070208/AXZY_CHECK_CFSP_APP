import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Divider, Icon, Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import {
  changePassword,
  updateUserProfile,
} from '../../core/services/UserService';
import { useAppSelector } from '../../core/store/hooks';
import { showToast } from '../../core/store/slices/toast.slice';
import {
  ITButton,
  ITCard,
  ITInput,
  ITScreenWrapper,
  ITText,
} from '../../shared/components';
import { theme } from '../../shared/theme/theme';
import { COLORS } from '../../shared/utils/constants';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SHIFT: 'Jefe de Turno',
  GUARD: 'Guardia',
  MAINT: 'Mantenimiento',
  RESDN: 'Residente',
};

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useAppSelector(state => state.userState);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Details State
  const [name, setName] = useState(user.fullName?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(
    user.fullName?.split(' ').slice(1).join(' ') || '',
  );

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const steps = [
    { title: 'Perfil', icon: 'account-circle-outline' },
    { title: 'Seguridad', icon: 'shield-lock-outline' },
  ];

  const handleUpdateDetails = async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const res = await updateUserProfile(user.id, { name, lastName });
      if (res.success) {
        dispatch(
          showToast({
            message: 'Perfil actualizado correctamente.',
            type: 'success',
          }),
        );
      } else {
        dispatch(
          showToast({
            message: 'No se pudo actualizar el perfil.',
            type: 'error',
          }),
        );
      }
    } catch (error) {
      dispatch(
        showToast({
          message: 'Ocurrió un error al actualizar.',
          type: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user.id) return;
    if (newPassword !== confirmPassword) {
      dispatch(
        showToast({
          message: 'Las contraseñas nuevas no coinciden.',
          type: 'error',
        }),
      );
      return;
    }
    if (newPassword.length < 6) {
      dispatch(showToast({ message: 'Mínimo 6 caracteres.', type: 'error' }));
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword(user.id, { oldPassword, newPassword });
      if (res.success) {
        dispatch(
          showToast({ message: 'Contraseña actualizada.', type: 'success' }),
        );
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        dispatch(
          showToast({ message: res.messages?.[0] || 'Error.', type: 'error' }),
        );
      }
    } catch (error) {
      dispatch(showToast({ message: 'Ocurrió un error.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ITScreenWrapper padding={false} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER SECTION */}
          <View style={styles.headerCard}>
            <ITText variant="headlineMedium" weight="bold" style={styles.title}>
              {user.fullName}
            </ITText>
            <ITText
              variant="bodyLarge"
              color={theme.colors.onSurfaceVariant}
              style={styles.subtitle}
            >
              {ROLE_LABELS[user.role || ''] || user.role}
            </ITText>
          </View>

          {/* FORM CARD */}
          <ITCard style={styles.formCard}>
            {/* Stepper */}
            <View style={styles.stepperContainer}>
              {steps.map((step, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.stepItem}
                  onPress={() => setCurrentStep(idx)}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      idx === currentStep && styles.stepCircleActive,
                      idx < currentStep && styles.stepCircleCompleted,
                    ]}
                  >
                    {idx < currentStep ? (
                      <Icon source="check" size={16} color="#FFFFFF" />
                    ) : (
                      <Icon
                        source={step.icon}
                        size={16}
                        color={idx === currentStep ? '#FFFFFF' : '#94A3B8'}
                      />
                    )}
                  </View>
                  <ITText
                    variant="labelSmall"
                    weight={idx === currentStep ? 'bold' : 'regular'}
                    color={idx === currentStep ? COLORS.emerald : '#94A3B8'}
                  >
                    {step.title}
                  </ITText>
                  {idx < steps.length - 1 && <View style={styles.stepLine} />}
                </TouchableOpacity>
              ))}
            </View>

            <Divider style={styles.divider} />

            {/* STEP 0: PERFIL */}
            {currentStep === 0 && (
              <View>
                <ITInput
                  label="Nombre(s)"
                  placeholder="Tu nombre"
                  value={name}
                  onChangeText={setName}
                  leftIcon="account"
                />
                <View style={{ height: 16 }} />
                <ITInput
                  label="Apellidos"
                  placeholder="Tus apellidos"
                  value={lastName}
                  onChangeText={setLastName}
                  leftIcon="account-details"
                />

                <View style={styles.infoRow}>
                  <Icon
                    source="shield-account-outline"
                    size={20}
                    color={COLORS.emerald}
                  />
                  <ITText
                    variant="bodyMedium"
                    color={theme.colors.onSurfaceVariant}
                  >
                    Rol: {ROLE_LABELS[user.role || ''] || user.role}
                  </ITText>
                </View>
              </View>
            )}

            {/* STEP 1: SEGURIDAD */}
            {currentStep === 1 && (
              <View>
                <ITInput
                  label="Contraseña Actual"
                  placeholder="••••••••"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-outline"
                />
                <View style={{ height: 16 }} />
                <ITInput
                  label="Nueva Contraseña"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-plus-outline"
                />
                <View style={{ height: 16 }} />
                <ITInput
                  label="Confirmar Contraseña"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  leftIcon="lock-check-outline"
                />

                <View style={styles.switchRow}>
                  <ITText
                    variant="bodyMedium"
                    color={theme.colors.onSurfaceVariant}
                  >
                    Mostrar caracteres
                  </ITText>
                  <Switch
                    value={showPassword}
                    onValueChange={setShowPassword}
                    color={COLORS.emerald}
                  />
                </View>
              </View>
            )}

            <Divider style={styles.divider} />

            {/* NAVIGATION BUTTONS */}
            <View style={styles.navigationButtons}>
              <ITButton
                label={
                  currentStep === 0
                    ? 'Guardar Cambios'
                    : 'Actualizar Contraseña'
                }
                onPress={
                  currentStep === 0 ? handleUpdateDetails : handleChangePassword
                }
                loading={loading}
                backgroundColor={COLORS.emerald}
              />
            </View>

            <ITButton
              label="Cerrar Perfil"
              mode="text"
              onPress={() => navigation.goBack()}
              textColor="#94A3B8"
              style={styles.backButton}
            />
          </ITCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    marginBottom: 6,
    textAlign: 'center',
    color: theme.colors.onSurface,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: COLORS.emerald,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    top: 18,
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  navigationButtons: {
    marginTop: 12,
  },
  backButton: {
    marginTop: 12,
  },
});
