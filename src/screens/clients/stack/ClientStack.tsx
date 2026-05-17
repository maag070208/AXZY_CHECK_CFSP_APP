import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { UserFormScreen } from '../../users/screens/UserFormScreen';
import { ClientDetailScreen } from '../screens/ClientDetailScreen';
import { ClientGuardsScreen } from '../screens/ClientGuardsScreen';
import { ClientListScreen } from '../screens/ClientListScreen';
import { ClientLocationsScreen } from '../screens/ClientLocationsScreen';
import { ClientZonesScreen } from '../screens/ClientZonesScreen';
import { CreateClientScreen } from '../screens/CreateClientScreen';

export type ClientStackParamList = {
  CLIENT_LIST: undefined;
  CLIENT_FORM: { id?: string };
  CLIENT_DETAIL: { id: string };
  CLIENT_LOCATIONS: { clientId: string };
  CLIENT_ZONES: { clientId: string };
  CLIENT_GUARDS: { clientId: string };
  CLIENT_USER_FORM: { clientId?: string; allowedRoles?: string[]; user?: any };
};

const Stack = createNativeStackNavigator<ClientStackParamList>();

export const ClientStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CLIENT_LIST"
        component={ClientListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Empresas y Sedes"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CLIENT_FORM"
        component={CreateClientScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Gestión de Empresa"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CLIENT_DETAIL"
        component={ClientDetailScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Perfil de Empresa"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CLIENT_LOCATIONS"
        component={ClientLocationsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Ubicaciones"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CLIENT_ZONES"
        component={ClientZonesScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Zonas / Recurrentes"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CLIENT_GUARDS"
        component={ClientGuardsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Guardias Asignados"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CLIENT_USER_FORM"
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
    </Stack.Navigator>
  );
};
