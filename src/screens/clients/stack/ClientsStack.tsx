import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { ClientsScreen } from '../screens/ClientsScreen';
import { CreateClientScreen } from '../screens/CreateClientScreen';

const Stack = createNativeStackNavigator();

export const ClientsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CLIENTS_MAIN"
        component={ClientsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Clientes"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="CREATE_CLIENT"
        component={CreateClientScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Nuevo Cliente"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
