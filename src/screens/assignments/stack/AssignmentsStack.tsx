import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyAssignmentsScreen } from '../screens/MyAssignmentsScreen';
import { AssignmentScanScreen } from '../screens/AssignmentScanScreen';
import { IncidentReportScreen } from '../screens/IncidentReportScreen';
import { MaintenanceReportScreen } from '../screens/MaintenanceReportScreen';
import { HeaderBack } from '../../../navigation/header/HeaderBack';

const Stack = createNativeStackNavigator();

export const AssignmentsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="MY_ASSIGNMENTS_MAIN"
        component={MyAssignmentsScreen}
        options={({ navigation }) => ({
          header: () => (
            <HeaderBack
              navigation={navigation}
              title="Mis Asignaciones"
              back={true}
            />
          ),
        })}
      />
      <Stack.Screen name="ASSIGNMENT_SCAN" component={AssignmentScanScreen} />
      <Stack.Screen name="INCIDENT_REPORT" component={IncidentReportScreen} />
      <Stack.Screen
        name="MAINTENANCE_REPORT"
        component={MaintenanceReportScreen}
      />
    </Stack.Navigator>
  );
};
