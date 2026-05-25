import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderGuard } from '../../../navigation/header/HeaderGuard';
import { HeaderMain } from '../../../navigation/header/HeaderMain';
import { IncidentReportScreen } from '../../assignments/screens/IncidentReportScreen';
import { HomeScreen } from '../screens/HomeScreen';

import { useSelector } from 'react-redux';
import { RootState } from '../../../core/store/redux.config';
import { UserRole } from '../../../core/types/IUser';
import { MaintenanceReportScreen } from '../../assignments/screens/MaintenanceReportScreen';

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  const user = useSelector((state: RootState) => state.userState);
  const isGuard = user.role === UserRole.GUARD;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HOME_MAIN"
        component={HomeScreen}
        options={({ navigation }) => ({
          header: isGuard
            ? () => <HeaderGuard navigation={navigation} />
            : () => <HeaderMain navigation={navigation} title="Inicio" />,
        })}
      />
      <Stack.Screen
        name="INCIDENT_REPORT"
        component={IncidentReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MAINTENANCE_REPORT"
        component={MaintenanceReportScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
