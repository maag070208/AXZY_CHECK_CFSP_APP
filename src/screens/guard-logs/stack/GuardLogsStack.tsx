import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { GuardLogsScreen } from '../screens/GuardLogsScreen';

const Stack = createNativeStackNavigator();

export const GuardLogsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GUARD_LOGS_LIST"
        component={GuardLogsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Prenómina"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
