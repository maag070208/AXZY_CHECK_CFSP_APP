import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { ITInput, ITButton, ITText } from '../../../shared/components';
import { theme } from '../../../shared/theme/theme';

export interface LoginFormComponentValues {
  username: string;
  password: string;
}

interface LoginFormComponentProps {
  onSubmit: (values: LoginFormComponentValues) => void | Promise<void>;
  loading?: boolean;
}

const validationSchema = Yup.object().shape({
  username: Yup.string().trim().required('El usuario es obligatorio'),
  password: Yup.string()
    .trim()
    .required('La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const LoginFormComponent: React.FC<LoginFormComponentProps> = ({
  onSubmit,
  loading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const initialValues: LoginFormComponentValues = {
    username: '',
    password: '',
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({
        handleChange,
        handleBlur,
        handleSubmit,
        values,
        errors,
        touched,
      }) => (
        <View style={styles.container}>
          <ITInput
            label="Usuario"
            placeholder="Ingresa tu usuario"
            leftIcon="account-circle-outline"
            value={values.username}
            onChangeText={handleChange('username')}
            onBlur={handleBlur('username')}
            error={errors.username}
            touched={touched.username}
            disabled={loading}
            autoCapitalize="none"
          />

          <ITInput
            label="Contraseña"
            placeholder="••••••••"
            leftIcon="shield-lock-outline"
            rightIcon={showPassword ? 'eye-off' : 'eye'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            secureTextEntry={!showPassword}
            value={values.password}
            onChangeText={handleChange('password')}
            onBlur={handleBlur('password')}
            error={errors.password}
            touched={touched.password}
            disabled={loading}
          />

          {/* <TouchableOpacity style={styles.forgotPassword}>
            <ITText variant="labelMedium" color={theme.colors.primary} weight="600">
              ¿Olvidaste tu contraseña?
            </ITText>
          </TouchableOpacity> */}

          <ITButton
            label="Entrar al Sistema"
            onPress={handleSubmit as any}
            loading={loading}
            style={styles.button}
            mode="contained"
          />
        </View>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  button: {
    height: 52,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
  },
});
