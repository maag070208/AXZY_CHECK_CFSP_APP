import React from 'react';
import { ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Button,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
  Switch,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { IClient, IClientCreate } from '../type/client.types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: IClientCreate) => void;
  initialData?: IClient | null;
  loading?: boolean;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().max(100, "Nombre demasiado largo").required("El nombre es requerido"),
  address: Yup.string().optional(),
  rfc: Yup.string()
    .min(12, "El RFC debe tener al menos 12 caracteres")
    .max(13, "El RFC no puede tener más de 13 caracteres")
    .optional(),
  contactName: Yup.string().optional(),
  contactPhone: Yup.string()
    .matches(/^[0-9]*$/, "El teléfono solo debe contener números")
    .max(10, "El teléfono debe tener máximo 10 dígitos")
    .optional(),
  active: Yup.boolean().required(),
  appUsername: Yup.string().min(4, "Mínimo 4 caracteres").optional(),
  appPassword: Yup.string().min(6, "Mínimo 6 caracteres").optional(),
});

export const ClientFormModal = ({
  visible,
  onDismiss,
  onSubmit,
  initialData,
  loading,
}: Props) => {
  const initialValues = {
    name: initialData?.name || '',
    address: initialData?.address || '',
    rfc: initialData?.rfc || '',
    contactName: initialData?.contactName || '',
    contactPhone: initialData?.contactPhone || '',
    active: initialData ? initialData.active : true,
    appUsername: initialData?.users?.[0]?.username || '',
    appPassword: '',
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Completa los datos fiscales y de contacto
            </Text>
          </View>

          <Formik
            initialValues={initialValues}
            enableReinitialize
            validationSchema={validationSchema}
            onSubmit={values => {
              onSubmit(values);
            }}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              setFieldValue,
              values,
              errors,
              touched,
            }) => (
              <View style={{ flex: 1 }}>
                <ScrollView 
                  style={styles.scroll} 
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INFORMACIÓN GENERAL</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>NOMBRE DEL CLIENTE *</Text>
                      <TextInput
                        mode="outlined"
                        value={values.name}
                        onChangeText={handleChange('name')}
                        onBlur={handleBlur('name')}
                        error={touched.name && !!errors.name}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                      />
                      {touched.name && errors.name && <HelperText type="error" visible={true}>{errors.name}</HelperText>}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>DIRECCIÓN / LUGAR</Text>
                      <TextInput
                        mode="outlined"
                        value={values.address}
                        onChangeText={handleChange('address')}
                        onBlur={handleBlur('address')}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        multiline
                        numberOfLines={2}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>RFC</Text>
                      <TextInput
                        mode="outlined"
                        value={values.rfc}
                        onChangeText={(val) => setFieldValue('rfc', val.toUpperCase())}
                        onBlur={handleBlur('rfc')}
                        error={touched.rfc && !!errors.rfc}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        maxLength={13}
                        autoCapitalize="characters"
                      />
                      {touched.rfc && errors.rfc && <HelperText type="error" visible={true}>{errors.rfc}</HelperText>}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONTACTO</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>NOMBRE ENCARGADO</Text>
                      <TextInput
                        mode="outlined"
                        value={values.contactName}
                        onChangeText={handleChange('contactName')}
                        onBlur={handleBlur('contactName')}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>TELÉFONO ENCARGADO</Text>
                      <TextInput
                        mode="outlined"
                        value={values.contactPhone}
                        onChangeText={(val) => setFieldValue('contactPhone', val.replace(/[^0-9]/g, ''))}
                        onBlur={handleBlur('contactPhone')}
                        error={touched.contactPhone && !!errors.contactPhone}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        keyboardType="numeric"
                        maxLength={10}
                      />
                      {touched.contactPhone && errors.contactPhone && <HelperText type="error" visible={true}>{errors.contactPhone}</HelperText>}
                    </View>
                  </View>

                  <View style={styles.section}>
                      <View style={styles.authHeader}>
                          <Text style={styles.sectionTitle}>CREDENCIALES APP</Text>
                          <View style={styles.activeContainer}>
                              <Text style={styles.activeLabel}>ACTIVO</Text>
                              <Switch
                                  value={values.active}
                                  onValueChange={val => setFieldValue('active', val)}
                                  color="#059669"
                              />
                          </View>
                      </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>USUARIO</Text>
                      <TextInput
                        mode="outlined"
                        value={values.appUsername}
                        onChangeText={handleChange('appUsername')}
                        onBlur={handleBlur('appUsername')}
                        error={touched.appUsername && !!errors.appUsername}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                        autoCapitalize="none"
                      />
                      {touched.appUsername && errors.appUsername && <HelperText type="error" visible={true}>{errors.appUsername}</HelperText>}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>CONTRASEÑA</Text>
                      <TextInput
                        mode="outlined"
                        secureTextEntry
                        value={values.appPassword}
                        onChangeText={handleChange('appPassword')}
                        onBlur={handleBlur('appPassword')}
                        error={touched.appPassword && !!errors.appPassword}
                        placeholder={initialData ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
                        style={styles.input}
                        outlineStyle={styles.inputOutline}
                      />
                      {touched.appPassword && errors.appPassword && <HelperText type="error" visible={true}>{errors.appPassword}</HelperText>}
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.actions}>
                  <Button mode="text" onPress={onDismiss} textColor="#64748b">Cancelar</Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleSubmit()} 
                    loading={loading} 
                    disabled={loading}
                    buttonColor="#0F4C3A"
                    style={styles.saveButton}
                  >
                    {initialData ? 'Actualizar' : 'Guardar Cliente'}
                  </Button>
                </View>
              </View>
            )}
          </Formik>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 24,
    height: '85%', // Use height instead of maxHeight for stability
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontWeight: '800',
    color: '#1e293b',
    fontSize: 20,
  },
  subtitle: {
    color: '#64748b',
    marginTop: 4,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  authHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveButton: {
    borderRadius: 12,
    minWidth: 140,
  },
});
