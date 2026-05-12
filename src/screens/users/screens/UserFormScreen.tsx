import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import * as Yup from 'yup';
import { showToast } from '../../../core/store/slices/toast.slice';
import { ITScreenWrapper, ITText } from '../../../shared/components';
import { getCatalog } from '../../../shared/service/catalog.service';
import { theme } from '../../../shared/theme/theme';
import {
  getSchedules,
  ISchedule,
} from '../../schedules/service/schedules.service';
import { createUser, updateUser } from '../../users/service/user.service';
import { UserFormStepper } from '../components/UserFormStepper';
import { CreateUserDTO, IUser, UpdateUserDTO } from '../service/user.types';
import { ROLE_CLIENT } from '../../../core/constants/constants';

const UserSchema = Yup.object().shape({
  name: Yup.string().required('El nombre es requerido'),
  lastName: Yup.string().required('Los apellidos son requeridos'),
  username: Yup.string()
    .required('El usuario es requerido')
    .min(2, 'Mínimo 2 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo'),
  password: Yup.string().when('$isEdit', {
    is: false,
    then: schema =>
      schema
        .required('La contraseña es requerida')
        .min(6, 'Mínimo 6 caracteres'),
    otherwise: schema => schema.optional(),
  }),
  roleId: Yup.string().required('El rol es requerido'),
});

export const UserFormScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const user = route.params?.user as IUser | undefined;
  const isEdit = !!user;

  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ISchedule[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    getSchedules().then(res => {
      if (res.success && res.data) setSchedules(res.data);
    });
    getCatalog('role').then(res => {
      if (res.success && res.data) setRoles(res.data);
    });
  }, []);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    // Remove 'role' string before sending to API to avoid confusion
    const { role, ...payload } = values;

    try {
      const res = isEdit
        ? await updateUser(user.id, payload as UpdateUserDTO)
        : await createUser(payload as CreateUserDTO);

      if (res.success) {
        dispatch(
          showToast({
            type: 'success',
            message: isEdit
              ? 'Usuario actualizado con éxito'
              : 'Usuario creado con éxito',
          }),
        );
        navigation.goBack();
      } else {
        dispatch(
          showToast({
            type: 'error',
            message: res.messages?.[0] || 'Error en la operación',
          }),
        );
      }
    } catch (error: any) {
      const message =
        error?.messages?.[0] || error?.message || 'Error inesperado';
      dispatch(showToast({ type: 'error', message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ITScreenWrapper
      padding={false}
      style={[styles.container, { backgroundColor: '#FFFFFF' }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <ITText
            variant="headlineSmall"
            weight="bold"
            color={theme.colors.slate900}
          >
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </ITText>
          <ITText variant="bodySmall" color={theme.colors.slate500}>
            {isEdit
              ? 'Actualiza la información del personal'
              : 'Registra un nuevo miembro en el sistema'}
          </ITText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Formik
            initialValues={{
              name: user?.name || '',
              lastName: user?.lastName || '',
              username: user?.username || '',
              password: '',
              roleId: user?.role?.id || '',
              role: user
                ? typeof user.role === 'object'
                  ? user.role.name
                  : user.role
                : 'GUARD',
              scheduleId: user?.schedule?.id || '',
              active: user?.active ?? true,
            }}
            validationSchema={UserSchema}
            onSubmit={handleSubmit}
            enableReinitialize
            context={{ isEdit }}
          >
            {formikProps => (
              <UserFormStepper
                {...formikProps}
                roles={roles.filter(r => r.name !== ROLE_CLIENT)}
                schedules={schedules}
                saving={saving}
                onSubmit={formikProps.handleSubmit}
                isEdit={isEdit}
              />
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: { padding: 0 },
});
