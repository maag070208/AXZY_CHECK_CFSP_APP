import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { RecurringListScreen } from '../screens/RecurringListScreen';
import { RecurringFormScreen } from '../screens/RecurringFormScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const RecurringStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RECURRING_LIST"
        component={RecurringListScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack navigation={navigation} title="Rutas" back={true} />
          ),
        })}
      />
      <Stack.Screen
        name="RECURRING_FORM"
        component={RecurringFormScreen}
        options={({ navigation, route }: any) => ({
          header: () => (
            <HeaderBack 
                navigation={navigation} 
                title={route.params?.route ? "Editar Ruta" : "Nueva Ruta"} 
                back={true} 
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
