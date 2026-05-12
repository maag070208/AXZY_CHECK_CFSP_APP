import { FormikErrors, FormikTouched } from 'formik';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Switch } from 'react-native-paper';
import {
  ROLE_GUARD,
  ROLE_MAINTENANCE,
  ROLE_SHIFT,
} from '../../../core/constants/constants';
import {
  ITButton,
  ITInput,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';

interface UserFormStepperProps {
  values: any;
  errors: FormikErrors<any>;
  touched: FormikTouched<any>;
  handleChange: (field: string) => any;
  handleBlur: (field: string) => any;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (
    field: string,
    isTouched?: boolean,
    shouldValidate?: boolean,
  ) => void;
  roles: any[];
  schedules: any[];
  saving: boolean;
  onSubmit: () => void;
  isEdit?: boolean;
}

export const UserFormStepper = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  setFieldTouched,
  roles,
  schedules,
  saving,
  onSubmit,
  isEdit = false,
}: UserFormStepperProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const steps = [
    { title: 'Perfil', icon: 'account-outline' },
    { title: 'Seguridad', icon: 'shield-lock-outline' },
    { title: 'Horario', icon: 'clock-outline' },
  ];

  const isOperational =
    values.role === ROLE_GUARD ||
    values.role === ROLE_SHIFT ||
    values.role === ROLE_MAINTENANCE;
  const filteredSteps = isOperational ? steps : steps.slice(0, 2);

  const isStepValid = (step: number) => {
    if (step === 0)
      return !!(
        values.name &&
        values.lastName &&
        !errors.name &&
        !errors.lastName
      );
    if (step === 1) {
      const baseValid = !!(
        values.username &&
        values.role &&
        !errors.username &&
        !errors.role
      );
      if (!isEdit) return baseValid && !!(values.password && !errors.password);
      return baseValid;
    }
    return true;
  };

  const validateCurrentStep = () => {
    const fieldsToTouch: string[] = [];
    if (currentStep === 0) fieldsToTouch.push('name', 'lastName');
    if (currentStep === 1) fieldsToTouch.push('username', 'password', 'role');

    fieldsToTouch.forEach(field => setFieldTouched(field, true));

    if (isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const getRoleIcon = (name: string) => {
    switch (name) {
      case 'ADMIN':
        return 'shield-account';
      case 'SUPERVISOR':
        return 'account-cog';
      case 'GUARD':
        return 'shield-check';
      case 'MAINT':
        return 'wrench';
      case 'CLIENT':
        return 'office-building';
      case 'RESDN':
        return 'home-account';
      default:
        return 'account';
    }
  };

  const getRoleColor = (name: string) => {
    switch (name) {
      case 'ADMIN':
        return theme.colors.primary;
      case 'SUPERVISOR':
        return '#8B5CF6';
      case 'GUARD':
        return '#10B981';
      case 'MAINT':
        return '#F59E0B';
      case 'CLIENT':
        return '#0EA5E9';
      case 'RESDN':
        return '#EC4899';
      default:
        return '#64748B';
    }
  };

  return (
    <View style={styles.container}>
      {/* STEPPER MODERNIZADO */}
      <View style={styles.stepperHeader}>
        {filteredSteps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          const isLast = idx === filteredSteps.length - 1;

          return (
            <React.Fragment key={idx}>
              <ITTouchableOpacity
                style={styles.stepItem}
                onPress={() => isDone && setCurrentStep(idx)}
                disabled={!isDone}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isDone && styles.stepCircleDone,
                  ]}
                >
                  {isDone ? (
                    <Icon source="check" size={18} color="#FFFFFF" />
                  ) : (
                    <Icon
                      source={step.icon}
                      size={20}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                    />
                  )}
                </View>
                <ITText
                  variant="labelSmall"
                  weight={isActive ? '600' : '400'}
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isDone && styles.stepLabelDone,
                  ]}
                >
                  {step.title}
                </ITText>
              </ITTouchableOpacity>

              {!isLast && (
                <View style={styles.stepLineContainer}>
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: isDone ? '#10B981' : '#E2E8F0' },
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.formContent}>
        {/* STEP 0: Perfil */}
        {currentStep === 0 && (
          <View style={styles.stepContainer}>
            <ITInput
              label="Nombre(s)"
              placeholder="Ej. Roberto"
              value={values.name}
              onChangeText={handleChange('name')}
              onBlur={handleBlur('name')}
              error={errors.name}
              touched={touched.name}
              leftIcon="account-outline"
            />
            <ITInput
              label="Apellidos"
              placeholder="Ej. García López"
              value={values.lastName}
              onChangeText={handleChange('lastName')}
              onBlur={handleBlur('lastName')}
              error={errors.lastName}
              touched={touched.lastName}
              leftIcon="account-details-outline"
            />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <ITText
                  variant="bodyMedium"
                  weight="600"
                  style={styles.switchTitle}
                >
                  Usuario Activo
                </ITText>
                <ITText variant="labelSmall" style={styles.switchSubtitle}>
                  Permitir acceso al sistema
                </ITText>
              </View>
              <Switch
                value={values.active}
                onValueChange={v => setFieldValue('active', v)}
                color={theme.colors.primary}
              />
            </View>
          </View>
        )}

        {/* STEP 1: Seguridad */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <ITInput
              label="Nombre de Usuario"
              placeholder="usuario@empresa.com"
              value={values.username}
              onChangeText={handleChange('username')}
              onBlur={handleBlur('username')}
              error={errors.username}
              touched={touched.username}
              leftIcon="at"
              autoCapitalize="none"
            />

            {!isEdit && (
              <ITInput
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                error={errors.password}
                touched={touched.password}
                leftIcon="lock-outline"
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye-off' : 'eye'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                autoCapitalize="none"
              />
            )}

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <ITText variant="labelSmall" style={styles.dividerText}>
                ROL EN EL SISTEMA
              </ITText>
              <View style={styles.divider} />
            </View>

            <View style={styles.roleGrid}>
              {roles.map(r => {
                const isActive = values.role === r.name;
                const roleColor = getRoleColor(r.name);

                return (
                  <ITTouchableOpacity
                    key={r.id || r.name}
                    onPress={() => {
                      setFieldValue('role', r.name);
                      setFieldValue('roleId', r.id);
                    }}
                    style={[
                      styles.roleCard,
                      isActive && {
                        borderColor: roleColor,
                        backgroundColor: roleColor + '08',
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.roleIconContainer,
                        isActive && { backgroundColor: roleColor + '15' },
                      ]}
                    >
                      <Icon
                        source={getRoleIcon(r.name)}
                        size={22}
                        color={isActive ? roleColor : '#64748B'}
                      />
                    </View>
                    <ITText
                      variant="labelMedium"
                      weight={isActive ? '600' : '500'}
                      style={[
                        styles.roleLabel,
                        isActive && { color: roleColor },
                      ]}
                      numberOfLines={1}
                    >
                      {r.value}
                    </ITText>
                    {isActive && (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: roleColor },
                        ]}
                      >
                        <Icon source="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </ITTouchableOpacity>
                );
              })}
            </View>

            {errors.role && touched.role && (
              <ITText variant="labelSmall" style={styles.errorText}>
                {errors.role as string}
              </ITText>
            )}
          </View>
        )}

        {/* STEP 2: Horario */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.scheduleHeader}>
              <ITText
                variant="titleMedium"
                weight="bold"
                style={styles.scheduleTitle}
              >
                Turno Laboral
              </ITText>
              <ITText variant="labelSmall" style={styles.scheduleSubtitle}>
                Selecciona el horario de trabajo
              </ITText>
            </View>

            {schedules.map(s => (
              <ITTouchableOpacity
                key={s.id}
                style={[
                  styles.scheduleItem,
                  values.scheduleId === s.id && styles.scheduleActive,
                ]}
                onPress={() => setFieldValue('scheduleId', s.id)}
              >
                <View style={styles.scheduleIconContainer}>
                  <Icon
                    source="clock-outline"
                    size={20}
                    color={
                      values.scheduleId === s.id
                        ? theme.colors.primary
                        : '#94A3B8'
                    }
                  />
                </View>

                <View style={styles.scheduleInfo}>
                  <ITText
                    variant="bodyMedium"
                    weight="600"
                    style={[
                      styles.scheduleName,
                      values.scheduleId === s.id && styles.scheduleNameActive,
                    ]}
                  >
                    {s.name}
                  </ITText>
                  <ITText variant="labelSmall" style={styles.scheduleTime}>
                    {s.startTime} - {s.endTime}
                  </ITText>
                </View>

                <Icon
                  source={
                    values.scheduleId === s.id
                      ? 'check-circle'
                      : 'circle-outline'
                  }
                  size={22}
                  color={
                    values.scheduleId === s.id
                      ? theme.colors.primary
                      : '#CBD5E1'
                  }
                />
              </ITTouchableOpacity>
            ))}

            {touched.scheduleId && errors.scheduleId && (
              <ITText variant="labelSmall" style={styles.errorText}>
                {errors.scheduleId as string}
              </ITText>
            )}
          </View>
        )}

        {/* FOOTER ACTIONS */}
        <View style={styles.footer}>
          {currentStep > 0 && (
            <ITButton
              label="Atrás"
              mode="outlined"
              onPress={() => setCurrentStep(s => s - 1)}
              style={styles.btnBack}
              labelStyle={styles.btnBackLabel}
            />
          )}
          <ITButton
            label={
              currentStep < filteredSteps.length - 1
                ? 'Continuar'
                : isEdit
                ? 'Guardar Cambios'
                : 'Crear Usuario'
            }
            onPress={
              currentStep < filteredSteps.length - 1
                ? validateCurrentStep
                : onSubmit
            }
            loading={saving}
            disabled={saving}
            style={[styles.btnNext, { flex: currentStep > 0 ? 2 : 1 }]}
            labelStyle={styles.btnNextLabel}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    marginBottom: 8,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  stepCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  stepLabelActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  stepLabelDone: {
    color: '#10B981',
  },
  stepLineContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  stepLine: {
    height: 2,
    borderRadius: 2,
  },
  formContent: {
    flex: 1,
  },
  stepContainer: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  switchInfo: {
    flex: 1,
  },
  switchTitle: {
    color: '#0F172A',
    marginBottom: 2,
  },
  switchSubtitle: {
    color: '#64748B',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dividerText: {
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    justifyContent: 'flex-start',
  },
  roleCard: {
    width: '31%',
    aspectRatio: 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    marginBottom: 2,
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  roleLabel: {
    textAlign: 'center',
    fontSize: 10,
    color: '#334155',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleHeader: {
    marginBottom: 16,
  },
  scheduleTitle: {
    color: '#0F172A',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    color: '#64748B',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  scheduleActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EEF2FF',
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    color: '#0F172A',
    marginBottom: 2,
  },
  scheduleNameActive: {
    color: theme.colors.primary,
  },
  scheduleTime: {
    color: '#64748B',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
    marginBottom: 24,
  },
  btnBack: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    borderRadius: 14,
    borderColor: '#E2E8F0',
  },
  btnBackLabel: {
    color: '#64748B',
    fontSize: 14,
  },
  btnNext: {
    borderRadius: 14,
    height: 48,
    backgroundColor: theme.colors.primary,
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  btnNextLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
