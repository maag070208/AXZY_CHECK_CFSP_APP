import { FormikErrors, FormikTouched } from 'formik';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Switch } from 'react-native-paper';
import {
  ITAlert,
  ITButton,
  ITInput,
  ITText,
  ITTouchableOpacity,
} from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';

interface ClientFormStepperProps {
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
  saving: boolean;
  onSubmit: () => void;
  isEdit?: boolean;
}

export const ClientFormStepper = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  setFieldTouched,
  saving,
  onSubmit,
  isEdit = false,
}: ClientFormStepperProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');

  const steps = [
    { title: 'General', icon: 'office-building' },
    { title: 'Contacto', icon: 'account-box-outline' },
    { title: 'Acceso App', icon: 'shield-lock-outline' },
  ];

  const isStepValid = (step: number) => {
    if (step === 0) {
      return !!(values.name && !errors.name);
    }
    if (step === 1) {
      return !!(
        values.contactName &&
        values.contactPhone &&
        !errors.contactName &&
        !errors.contactPhone
      );
    }
    if (step === 2) {
      if (!isEdit) {
        return !!(
          values.appUsername &&
          values.appPassword &&
          !errors.appUsername &&
          !errors.appPassword
        );
      }
      return !!(
        values.appUsername &&
        !errors.appUsername &&
        !errors.appPassword
      );
    }
    return true;
  };

  const handleUsernameChange = (val: string) => {
    if (isEdit) {
      setPendingUsername(val);
      setShowAlert(true);
    } else {
      setFieldValue('appUsername', val);
    }
  };

  const confirmUsernameChange = () => {
    setFieldValue('appUsername', pendingUsername);
    setShowAlert(false);
  };

  const validateCurrentStep = () => {
    const fieldsToTouch: string[] = [];
    if (currentStep === 0) fieldsToTouch.push('name');
    if (currentStep === 1) fieldsToTouch.push('contactName', 'contactPhone');
    if (currentStep === 2) fieldsToTouch.push('appUsername', 'appPassword');

    fieldsToTouch.forEach(field => setFieldTouched(field, true));

    if (isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  useEffect(() => {
    // Cleanup function - limpiar contraseña cuando el componente se desmonta
    return () => {
      if (isEdit && values.appPassword) {
        setFieldValue('appPassword', '');
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* STEPPER MODERNIZADO */}
      <View style={styles.stepperHeader}>
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          const isLast = idx === steps.length - 1;

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
        {/* STEP 0: Información General */}
        {currentStep === 0 && (
          <View style={styles.stepContainer}>
            <ITInput
              label="Nombre del Cliente"
              placeholder="Ej. Condominio Las Palmas"
              value={values.name}
              onChangeText={handleChange('name')}
              onBlur={handleBlur('name')}
              error={errors.name}
              touched={touched.name}
              leftIcon="office-building"
            />
            <ITInput
              label="Dirección / Lugar"
              placeholder="Dirección completa"
              value={values.address}
              onChangeText={handleChange('address')}
              onBlur={handleBlur('address')}
              error={errors.address}
              touched={touched.address}
              leftIcon="map-marker-outline"
            />
            <ITInput
              label="RFC"
              placeholder="12 o 13 caracteres"
              value={values.rfc}
              onChangeText={val => setFieldValue('rfc', val.toUpperCase())}
              onBlur={handleBlur('rfc')}
              error={errors.rfc}
              touched={touched.rfc}
              leftIcon="card-text-outline"
              autoCapitalize="characters"
              maxLength={13}
            />
          </View>
        )}

        {/* STEP 1: Contacto */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <ITInput
              label="Nombre Encargado"
              placeholder="Nombre completo"
              value={values.contactName}
              onChangeText={handleChange('contactName')}
              onBlur={handleBlur('contactName')}
              error={errors.contactName}
              touched={touched.contactName}
              leftIcon="account-outline"
            />
            <ITInput
              label="Teléfono Encargado"
              placeholder="10 dígitos"
              value={values.contactPhone}
              onChangeText={val =>
                setFieldValue('contactPhone', val.replace(/[^0-9]/g, ''))
              }
              onBlur={handleBlur('contactPhone')}
              error={errors.contactPhone}
              touched={touched.contactPhone}
              leftIcon="phone-outline"
              keyboardType="numeric"
              maxLength={10}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <ITText
                  variant="bodyMedium"
                  weight="600"
                  style={styles.switchTitle}
                >
                  Cliente Activo
                </ITText>
                <ITText variant="labelSmall" style={styles.switchSubtitle}>
                  Visible en el sistema
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

        {/* STEP 2: Acceso App */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.infoBox}>
              <Icon
                source="shield-check-outline"
                size={24}
                color={theme.colors.primary}
              />
              <ITText variant="labelSmall" style={styles.infoBoxText}>
                {isEdit
                  ? 'Si no deseas cambiar la contraseña, deja el campo en blanco.'
                  : 'Configura las credenciales para que el cliente pueda acceder a la aplicación.'}
              </ITText>
            </View>

            <ITInput
              label="Nombre de Usuario"
              placeholder="Ej. palmas_admin"
              value={values.appUsername || ''} // ✅ Protección contra undefined
              onChangeText={handleUsernameChange}
              onBlur={handleBlur('appUsername')}
              error={errors.appUsername}
              touched={touched.appUsername}
              leftIcon="at"
              autoCapitalize="none"
            />

            <ITInput
              label="Contraseña"
              placeholder={
                isEdit
                  ? 'Dejar en blanco para no cambiar'
                  : 'Mínimo 6 caracteres'
              }
              value={values.appPassword || ''} // ✅ Protección contra undefined/null
              onChangeText={handleChange('appPassword')}
              onBlur={handleBlur('appPassword')}
              error={errors.appPassword}
              touched={touched.appPassword}
              leftIcon="lock-outline"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              autoCapitalize="none"
            />
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
              currentStep < steps.length - 1
                ? 'Continuar'
                : isEdit
                ? 'Guardar Cambios'
                : 'Finalizar Registro'
            }
            onPress={
              currentStep < steps.length - 1 ? validateCurrentStep : onSubmit
            }
            loading={saving}
            disabled={saving}
            style={[styles.btnNext, { flex: currentStep > 0 ? 2 : 1 }]}
            labelStyle={styles.btnNextLabel}
          />
        </View>
      </View>

      <ITAlert
        visible={showAlert}
        title="Cambio de Usuario"
        description="No se recomienda cambiar el nombre de usuario de un cliente ya registrado. ¿Deseas continuar?"
        type="warning"
        confirmLabel="Sí, cambiar"
        cancelLabel="Cancelar"
        onConfirm={confirmUsernameChange}
        onDismiss={() => setShowAlert(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 8,
    gap: 12,
  },
  infoBoxText: {
    flex: 1,
    color: theme.colors.primary,
    fontWeight: '500',
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
