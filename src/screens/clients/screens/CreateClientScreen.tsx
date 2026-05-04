import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  Icon,
  Surface,
  Text,
  TextInput,
  Switch,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import * as Yup from 'yup';
import { showToast } from '../../../core/store/slices/toast.slice';
import ModernStyles from '../../../shared/theme/app.styles';
import {
  createClient,
  getClientById,
  updateClient,
} from '../service/client.service';
import { IClient } from '../type/client.types';

const ClientSchema = Yup.object().shape({
  name: Yup.string()
    .max(100, 'Nombre demasiado largo')
    .required('El nombre es requerido'),
  address: Yup.string().optional(),
  rfc: Yup.string()
    .min(12, 'El RFC debe tener al menos 12 caracteres')
    .max(13, 'El RFC no puede tener más de 13 caracteres')
    .optional(),
  contactName: Yup.string().optional(),
  contactPhone: Yup.string()
    .matches(/^[0-9]*$/, 'El teléfono solo debe contener números')
    .max(10, 'El teléfono debe tener máximo 10 dígitos')
    .optional(),
  active: Yup.boolean().required(),
  appUsername: Yup.string().min(4, 'Mínimo 4 caracteres').optional(),
  appPassword: Yup.string().min(6, 'Mínimo 6 caracteres').optional(),
});

export const CreateClientScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const clientParam: IClient | undefined = route.params?.client;
  const isEditing = !!clientParam;

  const [clientToEdit, setClientToEdit] = useState<IClient | undefined>(
    clientParam,
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isEditing && clientParam?.id) {
      fetchFullClient(String(clientParam.id));
    }
  }, [isEditing, clientParam?.id]);

  const fetchFullClient = async (id: string) => {
    try {
      const res = await getClientById(Number(id)); // Types say number, but it's string UUID
      if (res.success && res.data) {
        setClientToEdit(res.data);
      }
    } catch (error) {
      console.error('Error fetching full client:', error);
    }
  };

  const steps = [
    { title: 'General', icon: 'office-building' },
    { title: 'Contacto', icon: 'account-box-outline' },
    { title: 'Acceso App', icon: 'shield-lock-outline' },
  ];

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const res = isEditing
        ? await updateClient(clientToEdit.id, values)
        : await createClient(values);

      if (res && res.success) {
        dispatch(
          showToast({
            type: 'success',
            message: isEditing
              ? 'Cliente actualizado correctamente'
              : 'Cliente registrado correctamente',
          }),
        );
        navigation.goBack();
      } else {
        const errorMsg = res?.messages?.[0] || 'Error al guardar cliente';
        dispatch(showToast({ type: 'error', message: errorMsg }));
      }
    } catch (error: any) {
      console.error('Error saving client:', error);
      const message = error?.messages?.[0] || 'Ocurrió un error inesperado';
      dispatch(showToast({ type: 'error', message }));
    } finally {
      setSaving(false);
    }
  };

  const isStepValid = (values: any, errors: any, step: number) => {
    if (step === 0) return !!(values.name && !errors.name);
    return true;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={ModernStyles.flexContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.headerCard} elevation={0}>
          <View style={styles.headerIconContainer}>
            <Icon
              source={
                isEditing ? 'office-building-cog' : 'office-building-marker'
              }
              size={32}
              color="#065911"
            />
          </View>
          <Text style={styles.title}>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? `Actualizando datos de ${clientToEdit.name}`
              : 'Sigue los pasos para dar de alta una nueva propiedad o cliente'}
          </Text>
        </Surface>

        <Formik
          enableReinitialize
          initialValues={{
            name: clientToEdit?.name || '',
            address: clientToEdit?.address || '',
            rfc: clientToEdit?.rfc || '',
            contactName: clientToEdit?.contactName || '',
            contactPhone: clientToEdit?.contactPhone || '',
            active: isEditing ? clientToEdit.active : true,
            appUsername: clientToEdit?.users?.[0]?.username || '',
            appPassword: '',
          }}
          validationSchema={ClientSchema}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            setFieldValue,
            setFieldTouched,
          }) => {
            const validateCurrentStep = () => {
              if (currentStep === 0) setFieldTouched('name', true);

              if (isStepValid(values, errors, currentStep)) {
                setCurrentStep(prev => prev + 1);
              } else {
                dispatch(
                  showToast({
                    type: 'error',
                    message: 'Completa los campos requeridos',
                  }),
                );
              }
            };

            return (
              <Card style={styles.formCard} elevation={2}>
                <Card.Content>
                  {/* Stepper */}
                  <View style={styles.stepperContainer}>
                    {steps.map((step, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.stepItem}
                        onPress={() => {
                          if (idx <= currentStep) setCurrentStep(idx);
                        }}
                        disabled={idx > currentStep}
                      >
                        <View
                          style={[
                            styles.stepCircle,
                            idx <= currentStep && styles.stepCircleActive,
                            idx < currentStep && styles.stepCircleCompleted,
                          ]}
                        >
                          {idx < currentStep ? (
                            <Icon source="check" size={16} color="#FFFFFF" />
                          ) : (
                            <Icon
                              source={step.icon}
                              size={16}
                              color={idx <= currentStep ? '#FFFFFF' : '#94A3B8'}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.stepLabel,
                            idx <= currentStep && styles.stepLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {step.title}
                        </Text>
                        {idx < steps.length - 1 && (
                          <View style={styles.stepLine} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Divider style={styles.divider} />

                  {/* Step 0 - Información General */}
                  {currentStep === 0 && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          Nombre del Cliente *
                        </Text>
                        <TextInput
                          mode="outlined"
                          value={values.name}
                          onChangeText={handleChange('name')}
                          onBlur={handleBlur('name')}
                          placeholder="Ej. Condominio Las Palmas"
                          left={<TextInput.Icon icon="office-building" />}
                          error={touched.name && !!errors.name}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.name && errors.name && (
                          <HelperText type="error">{errors.name}</HelperText>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Dirección / Lugar</Text>
                        <TextInput
                          mode="outlined"
                          value={values.address}
                          onChangeText={handleChange('address')}
                          onBlur={handleBlur('address')}
                          placeholder="Dirección completa"
                          left={<TextInput.Icon icon="map-marker" />}
                          multiline
                          numberOfLines={3}
                          outlineStyle={styles.inputOutline}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>RFC</Text>
                        <TextInput
                          mode="outlined"
                          value={values.rfc}
                          onChangeText={val =>
                            setFieldValue('rfc', val.toUpperCase())
                          }
                          onBlur={handleBlur('rfc')}
                          placeholder="12 o 13 caracteres"
                          left={<TextInput.Icon icon="card-text-outline" />}
                          error={touched.rfc && !!errors.rfc}
                          outlineStyle={styles.inputOutline}
                          autoCapitalize="characters"
                          maxLength={13}
                        />
                        {touched.rfc && errors.rfc && (
                          <HelperText type="error">{errors.rfc}</HelperText>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Step 1 - Contacto */}
                  {currentStep === 1 && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre Encargado</Text>
                        <TextInput
                          mode="outlined"
                          value={values.contactName}
                          onChangeText={handleChange('contactName')}
                          onBlur={handleBlur('contactName')}
                          placeholder="Nombre completo"
                          left={<TextInput.Icon icon="account" />}
                          outlineStyle={styles.inputOutline}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          Teléfono Encargado
                        </Text>
                        <TextInput
                          mode="outlined"
                          value={values.contactPhone}
                          onChangeText={val =>
                            setFieldValue(
                              'contactPhone',
                              val.replace(/[^0-9]/g, ''),
                            )
                          }
                          onBlur={handleBlur('contactPhone')}
                          placeholder="10 dígitos"
                          left={<TextInput.Icon icon="phone" />}
                          keyboardType="numeric"
                          maxLength={10}
                          error={touched.contactPhone && !!errors.contactPhone}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.contactPhone && errors.contactPhone && (
                          <HelperText type="error">
                            {errors.contactPhone}
                          </HelperText>
                        )}
                      </View>

                      <View style={styles.activeCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activeTitle}>Cliente Activo</Text>
                          <Text style={styles.activeSubtitle}>
                            Permitir que el cliente sea visible en el sistema
                          </Text>
                        </View>
                        <Switch
                          value={values.active}
                          onValueChange={val => setFieldValue('active', val)}
                          color="#065911"
                        />
                      </View>
                    </View>
                  )}

                  {/* Step 2 - Acceso App */}
                  {currentStep === 2 && (
                    <View>
                      <View style={styles.infoBox}>
                        <Icon source="shield-check" size={24} color="#065911" />
                        <Text style={styles.infoBoxText}>
                          {isEditing
                            ? 'Si no deseas cambiar la contraseña, deja el campo en blanco.'
                            : 'Configura las credenciales para que el cliente pueda acceder a la aplicación.'}
                        </Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nombre de Usuario</Text>
                        <TextInput
                          mode="outlined"
                          value={values.appUsername}
                          onChangeText={handleChange('appUsername')}
                          onBlur={handleBlur('appUsername')}
                          placeholder="Ej. palmas_admin"
                          autoCapitalize="none"
                          left={<TextInput.Icon icon="at" />}
                          error={touched.appUsername && !!errors.appUsername}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.appUsername && errors.appUsername && (
                          <HelperText type="error">
                            {errors.appUsername}
                          </HelperText>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Contraseña</Text>
                        <TextInput
                          mode="outlined"
                          value={values.appPassword}
                          onChangeText={handleChange('appPassword')}
                          onBlur={handleBlur('appPassword')}
                          secureTextEntry={!showPassword}
                          placeholder={
                            isEditing
                              ? 'Dejar en blanco para no cambiar'
                              : 'Mínimo 6 caracteres'
                          }
                          left={<TextInput.Icon icon="lock" />}
                          right={
                            <TextInput.Icon
                              icon={showPassword ? 'eye-off' : 'eye'}
                              onPress={() => setShowPassword(!showPassword)}
                            />
                          }
                          error={touched.appPassword && !!errors.appPassword}
                          outlineStyle={styles.inputOutline}
                        />
                        {touched.appPassword && errors.appPassword && (
                          <HelperText type="error">
                            {errors.appPassword}
                          </HelperText>
                        )}
                      </View>
                    </View>
                  )}

                  <Divider style={styles.divider} />

                  <View style={styles.navigationButtons}>
                    {currentStep > 0 && (
                      <Button
                        mode="outlined"
                        onPress={() => setCurrentStep(prev => prev - 1)}
                        style={styles.navButton}
                        textColor="#64748B"
                      >
                        Atrás
                      </Button>
                    )}

                    {currentStep < steps.length - 1 ? (
                      <Button
                        mode="contained"
                        onPress={validateCurrentStep}
                        style={[styles.navButton, styles.nextButton]}
                        buttonColor="#065911"
                      >
                        Continuar
                      </Button>
                    ) : (
                      <Button
                        mode="contained"
                        onPress={() => handleSubmit()}
                        loading={saving}
                        disabled={saving}
                        style={[styles.navButton, styles.submitButton]}
                        buttonColor="#065911"
                      >
                        {isEditing ? 'Guardar Cambios' : 'Finalizar Registro'}
                      </Button>
                    )}
                  </View>

                  <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    disabled={saving}
                    textColor="#94A3B8"
                    style={styles.cancelButton}
                  >
                    Cancelar
                  </Button>
                </Card.Content>
              </Card>
            );
          }}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  headerCard: {
    backgroundColor: 'transparent',
    marginBottom: 20,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#065911',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
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
    backgroundColor: '#065911',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#065911',
    fontWeight: '600',
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
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 6,
  },
  inputOutline: {
    borderRadius: 12,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  activeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  activeSubtitle: {
    fontSize: 12,
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
    marginBottom: 20,
    gap: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#065911',
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
  },
  nextButton: {
    elevation: 2,
  },
  submitButton: {
    elevation: 4,
  },
  cancelButton: {
    marginTop: 12,
  },
});
