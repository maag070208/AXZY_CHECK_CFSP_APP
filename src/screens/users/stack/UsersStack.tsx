import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserListScreen } from '../screens/UserListScreen';
import { UserFormScreen } from '../screens/UserFormScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const UsersStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="USER_LIST"
        component={UserListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Gestión de Usuarios"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="USER_FORM"
        component={UserFormScreen}
        options={({ navigation, route }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title={(route.params as any)?.user ? "Editar Usuario" : "Crear Usuario"}
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
