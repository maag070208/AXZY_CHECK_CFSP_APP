import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { ZonesScreen } from '../screens/ZonesScreen';

const Stack = createNativeStackNavigator();

export const ZonesStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ZONES_MAIN"
        component={ZonesScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Zonas"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
