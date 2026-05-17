import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { RootState } from '../../../core/store/redux.config';
import { showToast } from '../../../core/store/slices/toast.slice';
import {
  ITButton,
  ITInput,
  ITScreenWrapper,
  ITText,
  ITTouchableOpacity,
  SearchComponent,
} from '../../../shared/components';
import { getPaginatedLocations } from '../../locations/service/location.service';
import { theme } from '../../../shared/theme/theme';
import { createAssignment } from '../../assignments/service/assignment.service';
import { Icon } from 'react-native-paper';

const AssignmentSchema = Yup.object().shape({
  locationId: Yup.string().required('Debe seleccionar una ubicación'),
  notes: Yup.string().optional(),
});

export const GuardAssignmentFormScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id: assignedBy } = useSelector((state: RootState) => state.userState);

  const guard = route.params?.guard;

  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<
    { description: string; reqPhoto: boolean }[]
  >([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');

  useEffect(() => {
    const targetClientId = guard?.clientId || guard?.client?.id;

    const fetchLocations = async () => {
      const params = {
        page: 1,
        limit: 100, // Reasonable limit for selection
        filters: targetClientId ? { clientId: targetClientId } : {},
      };

      const res = await getPaginatedLocations(params);
      if (res.success && res.data) {
        const rows = res.data.rows || [];
        setLocations(
          rows.map((l: any) => ({
            label: l.zone ? `${l.name}` : l.name,
            value: l.id,
          })),
        );
      }
    };

    fetchLocations();
  }, [guard?.clientId, guard?.client?.id]);

  const handleSaveAssignment = async (values: any) => {
    if (!guard) {
      console.error('No guard found in params');
      return;
    }

    if (!assignedBy) {
      console.error('No assignedBy found in state');
      dispatch(showToast({ type: 'error', message: 'Sesión inválida' }));
      return;
    }

    setSaving(true);
    console.log('SAVING ASSIGNMENT FOR:', guard.fullName || guard.name);
    
    try {
      const payload = {
        guardId: guard.id,
        locationId: values.locationId,
        assignedBy: String(assignedBy),
        notes: values.notes || '',
        tasks: tasks.length > 0 ? tasks : undefined,
      };

      console.log('PAYLOAD:', JSON.stringify(payload, null, 2));

      const res = await createAssignment(payload);
      console.log('RESPONSE:', res);

      if (res.success) {
        dispatch(showToast({ type: 'success', message: 'Asignación creada' }));
        navigation.goBack();
      } else {
        const errorMsg = res.messages?.[0] || 'Error al crear asignación';
        console.error('API ERROR:', errorMsg);
        dispatch(
          showToast({
            type: 'error',
            message: errorMsg,
          }),
        );
      }
    } catch (error: any) {
      console.error('CATCH ERROR:', error);
      dispatch(
        showToast({ 
          type: 'error', 
          message: error?.messages?.[0] || 'Error de red o servidor' 
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = () => {
    if (newTaskDesc.trim()) {
      setTasks([
        ...tasks,
        { description: newTaskDesc.trim(), reqPhoto: false },
      ]);
      setNewTaskDesc('');
    }
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  return (
    <ITScreenWrapper padding={false} style={styles.container}>
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
            Nueva Asignación
          </ITText>
          <ITText variant="bodySmall" color={theme.colors.slate500}>
            Para: {guard?.name} {guard?.lastName}
          </ITText>
        </View>

        <Formik
          initialValues={{
            locationId: '',
            notes: '',
          }}
          validationSchema={AssignmentSchema}
          onSubmit={handleSaveAssignment}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            setFieldValue,
          }) => (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: 100 },
                ]}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formSection}>
                  <ITText
                    variant="titleMedium"
                    weight="bold"
                    style={styles.sectionTitle}
                  >
                    Ubicación y Detalles
                  </ITText>

                  <View style={styles.searchWrapper}>
                    <SearchComponent
                      label="Ubicación"
                      placeholder="Seleccionar ubicación..."
                      options={locations}
                      value={values.locationId}
                      onSelect={val => setFieldValue('locationId', val)}
                    />
                    {touched.locationId && errors.locationId && (
                      <ITText
                        variant="labelSmall"
                        color={theme.colors.error}
                        style={{ marginTop: 4 }}
                      >
                        {errors.locationId as string}
                      </ITText>
                    )}
                  </View>

                  <ITInput
                    label="Notas (Opcional)"
                    placeholder="Instrucciones generales..."
                    value={values.notes}
                    onChangeText={handleChange('notes')}
                    onBlur={handleBlur('notes')}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formSection}>
                  <ITText
                    variant="titleMedium"
                    weight="bold"
                    style={styles.sectionTitle}
                  >
                    Sub Tareas (Opcional)
                  </ITText>
                  <View style={styles.addTaskRow}>
                    <View style={{ flex: 1 }}>
                      <ITInput
                        label="Descripción de la tarea..."
                        placeholder="Descripción de la tarea..."
                        value={newTaskDesc}
                        onChangeText={setNewTaskDesc}
                        style={{
                          height: 45,
                        }}
                      />
                    </View>
                    <ITTouchableOpacity
                      onPress={handleAddTask}
                      style={{
                        alignItems: 'center',
                        backgroundColor: theme.colors.graySystem,
                        borderRadius: 50,
                        height: 45,
                        width: 45,
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        source="plus"
                        size={22}
                        color={theme.colors.primary}
                      />
                    </ITTouchableOpacity>
                  </View>

                  {tasks.map((t, idx) => (
                    <View key={idx} style={styles.taskItem}>
                      <ITText style={{ flex: 1 }}>{t.description}</ITText>
                      <ITTouchableOpacity onPress={() => removeTask(idx)}>
                        <Icon
                          source="delete"
                          size={18}
                          color={theme.colors.error}
                        />
                      </ITTouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View
                style={[styles.footer, { paddingBottom: insets.bottom || 24 }]}
              >
                <ITButton
                  label="Cancelar"
                  mode="outlined"
                  onPress={() => navigation.goBack()}
                  style={styles.footerButton}
                  labelStyle={styles.footerButtonLabel}
                  disabled={saving}
                />
                <ITButton
                  label={saving ? 'Guardando...' : 'Guardar'}
                  mode="contained"
                  onPress={handleSubmit as any}
                  style={styles.footerButton}
                  labelStyle={styles.footerButtonLabel}
                  loading={saving}
                  disabled={saving}
                />
              </View>
            </>
          )}
        </Formik>
      </KeyboardAvoidingView>
    </ITScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  searchWrapper: {
    marginBottom: 16,
    zIndex: 10,
  },
  addTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  addButton: {
    marginTop: 6,
    height: 44,
    justifyContent: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    borderRadius: 12,
  },
  footerButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
