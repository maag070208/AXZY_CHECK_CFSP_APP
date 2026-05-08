import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Divider, Icon, Switch } from 'react-native-paper';
import { ITText, ITInput, ITButton, ITBadge } from '../../../shared/components';
import { UserRole } from '../../../core/types/IUser';
import { COLORS } from '../../../shared/utils/constants';
import { FormikErrors, FormikTouched } from 'formik';
import { theme } from '../../../shared/theme/theme';

interface UserFormStepperProps {
  values: any;
  errors: FormikErrors<any>;
  touched: FormikTouched<any>;
  handleChange: (field: string) => any;
  handleBlur: (field: string) => any;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (field: string, isTouched?: boolean, shouldValidate?: boolean) => void;
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
  isEdit = false
}: UserFormStepperProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const steps = [
    { title: 'Perfil', icon: 'account-outline' },
    { title: 'Seguridad', icon: 'shield-lock-outline' },
    { title: 'Horario', icon: 'clock-outline' }
  ];

  const isOperational = values.role === UserRole.GUARD || values.role === UserRole.SHIFT || values.role === UserRole.MAINT;
  const filteredSteps = isOperational ? steps : steps.slice(0, 2);

  const isStepValid = (step: number) => {
    if (step === 0) return !!(values.name && values.lastName && !errors.name && !errors.lastName);
    if (step === 1) {
        const baseValid = !!(values.username && values.role && !errors.username && !errors.role);
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

  return (
    <View style={styles.container}>
      {/* STEPPER: Minimalista y fluida */}
      <View style={styles.stepperHeader}>
        {filteredSteps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <React.Fragment key={idx}>
              <TouchableOpacity 
                style={styles.stepItem}
                onPress={() => isDone && setCurrentStep(idx)}
                disabled={!isDone}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.stepCircle, 
                  isActive && styles.stepCircleActive,
                  isDone && styles.stepCircleDone
                ]}>
                  {isDone ? (
                    <Icon source="check" size={20} color="#FFFFFF" />
                  ) : (
                    <Icon source={step.icon} size={22} color={isActive ? "#FFFFFF" : theme.colors.outline} />
                  )}
                </View>
                <ITText variant="labelSmall" weight={isActive ? "bold" : "medium"} color={isActive ? theme.colors.primary : theme.colors.outline}>
                  {step.title}
                </ITText>
              </TouchableOpacity>
              {idx < filteredSteps.length - 1 && <View style={[styles.stepLine, { backgroundColor: isDone ? '#10B981' : theme.colors.surfaceVariant }]} />}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.formContent}>
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
            
            <View style={[styles.switchRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={{ flex: 1 }}>
                    <ITText variant="bodyLarge" weight="bold">Estatus Activo</ITText>
                    <ITText variant="bodySmall" color={theme.colors.onSurfaceVariant}>Permitir acceso al sistema</ITText>
                </View>
                <Switch 
                    value={values.active} 
                    onValueChange={(v) => setFieldValue('active', v)}
                    color={COLORS.emerald}
                />
            </View>
          </View>
        )}

        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <ITInput
              label="Usuario"
              placeholder="rgarcia"
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
                rightIcon={showPassword ? "eye-off" : "eye"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                autoCapitalize="none"
              />
            )}

            <Divider style={styles.divider} />
            <ITText variant="titleMedium" weight="bold" color={theme.colors.onSurface} style={{ marginBottom: 16 }}>
                Rol en el sistema
            </ITText>
            
            <View style={styles.roleGrid}>
                {roles.map(r => {
                    const isActive = values.role === r.name;
                    const getRoleIcon = (name: string) => {
                        switch(name) {
                            case 'ADMIN': return 'shield-account';
                            case 'SHIFT': return 'account-cog';
                            case 'GUARD': return 'account-tie';
                            case 'MAINT': return 'toolbox';
                            case 'CLIENT': return 'office-building';
                            case 'RESDN': return 'home-account';
                            default: return 'account';
                        }
                    };

                    return (
                        <TouchableOpacity 
                            key={r.id || r.name}
                            onPress={() => {
                                setFieldValue('role', r.name);
                                setFieldValue('roleId', r.id);
                            }}
                            activeOpacity={0.8}
                            style={[
                                styles.roleCard,
                                isActive && styles.roleCardActive
                            ]}
                        >
                            <View style={[
                                styles.roleIconContainer,
                                isActive && styles.roleIconContainerActive
                            ]}>
                                <Icon 
                                    source={getRoleIcon(r.name)} 
                                    size={20} 
                                    color={isActive ? theme.colors.primary : theme.colors.outline} 
                                />
                            </View>
                            <ITText 
                                variant="labelMedium" 
                                weight={isActive ? "bold" : "regular"}
                                color={isActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={styles.roleLabel}
                            >
                                {r.value}
                            </ITText>
                            {isActive && (
                                <View style={styles.checkBadge}>
                                    <Icon source="check" size={10} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <ITText variant="titleMedium" weight="bold" color={theme.colors.onSurface} style={{ marginBottom: 16 }}>
                Selecciona el turno laboral
            </ITText>
            {schedules.map(s => (
                <TouchableOpacity 
                    key={s.id}
                    style={[
                        styles.scheduleItem, 
                        values.scheduleId === s.id && styles.scheduleActive
                    ]}
                    onPress={() => setFieldValue('scheduleId', s.id)}
                    activeOpacity={0.7}
                >
                    <View style={{ flex: 1 }}>
                        <ITText variant="bodyLarge" weight="bold" color={values.scheduleId === s.id ? theme.colors.primary : theme.colors.onSurface}>
                            {s.name}
                        </ITText>
                        <ITText variant="bodySmall" color={theme.colors.onSurfaceVariant}>
                            {s.startTime} - {s.endTime}
                        </ITText>
                    </View>
                    <Icon 
                        source={values.scheduleId === s.id ? "check-circle" : "circle-outline"} 
                        size={24} 
                        color={values.scheduleId === s.id ? theme.colors.primary : theme.colors.outline} 
                    />
                </TouchableOpacity>
            ))}
            {touched.scheduleId && errors.scheduleId && (
                <ITText variant="labelSmall" color={theme.colors.error} style={{ marginTop: 8 }}>
                    {errors.scheduleId as string}
                </ITText>
            )}
          </View>
        )}

        <View style={styles.footer}>
            {currentStep > 0 && (
                <ITButton 
                    label="Atrás"
                    mode="text" 
                    onPress={() => setCurrentStep(s => s - 1)}
                    style={styles.btnBack}
                    labelStyle={{ color: theme.colors.outline, fontSize: 16 }}
                />
            )}
            <ITButton 
                label={currentStep < filteredSteps.length - 1 ? 'Continuar' : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
                onPress={currentStep < filteredSteps.length - 1 ? validateCurrentStep : onSubmit}
                loading={saving}
                disabled={saving}
                style={[styles.btnNext, { flex: currentStep > 0 ? 1.5 : 1 }]}
                labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    marginBottom: 8,
  },
  stepItem: { alignItems: 'center', gap: 6, zIndex: 2 },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stepCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: -10,
    marginTop: -22,
    zIndex: 1,
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
    padding: 20,
    borderRadius: 20,
    marginTop: 8,
  },
  divider: { 
    marginVertical: 24,
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    opacity: 0.3,
  },
  roleGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginTop: 8,
  },
  roleCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: 110,
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline + '20',
    position: 'relative',
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  roleCardActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  roleIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  roleIconContainerActive: {
    backgroundColor: 'transparent',
  },
  roleLabel: {
    textAlign: 'center',
    marginHorizontal: 4,
    lineHeight: 14,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.surfaceVariant,
    backgroundColor: theme.colors.surface,
  },
  scheduleActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  footer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12, 
    marginTop: 40,
    marginBottom: 32,
  },
  btnBack: { flex: 1, height: 54, justifyContent: 'center' },
  btnNext: { 
    borderRadius: 20, 
    marginVertical: 0,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
