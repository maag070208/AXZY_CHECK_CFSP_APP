import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { GuardDisciplineScreen } from '../screens/GuardDisciplineScreen';

const Stack = createNativeStackNavigator();

export const GuardDisciplineStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GUARD_DISCIPLINE_LIST"
        component={GuardDisciplineScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Incidencias a Guardias"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
