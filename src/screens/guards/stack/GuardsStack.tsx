import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GuardListScreen } from '../screens/GuardListScreen';
import { GuardDetailScreen } from '../screens/GuardDetailScreen';
import { AssignmentDetailScreen } from '../../assignments/screens/AssignmentDetailScreen';
import { KardexDetailScreen } from '../../kardex/screens/KardexDetailScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { UserFormScreen } from '../../users/screens/UserFormScreen';
import { GuardAssignmentsScreen } from '../screens/GuardAssignmentsScreen';
import { GuardAssignmentFormScreen } from '../screens/GuardAssignmentFormScreen';

const Stack = createNativeStackNavigator();

export const GuardsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GUARD_LIST"
        component={GuardListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Gestión de Guardias"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_DETAIL"
        component={GuardDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Gestión de Guardias"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_FORM"
        component={UserFormScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Formulario de Guardia"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_ASSIGNMENTS"
        component={GuardAssignmentsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Tareas de Guardia"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_ASSIGNMENT_FORM"
        component={GuardAssignmentFormScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Nueva Tarea"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="GUARD_KARDEX_DETAIL"
        component={KardexDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Detalle de Reporte"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="ASSIGNMENT_DETAIL"
        component={AssignmentDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Detalle de Asignación"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
