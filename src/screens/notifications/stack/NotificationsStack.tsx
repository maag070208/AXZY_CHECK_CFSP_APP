import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBack } from '../../../navigation/header/HeaderBack';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { NotificationLogScreen } from '../screens/NotificationLogScreen';

const Stack = createNativeStackNavigator();

export const NotificationsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NOTIFICATIONS_LIST"
        component={NotificationsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Notificaciones"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen
        name="NOTIFICATION_LOG"
        component={NotificationLogScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Historial"
              back={true}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
};
