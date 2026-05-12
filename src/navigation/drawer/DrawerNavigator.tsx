import { createDrawerNavigator } from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DRAWER_WHITELIST } from '../../core/constants/navigation.constants';
import { LocationsStack } from '../../screens/locations/stack/LocationsStack';
import { GuardsStack } from '../../screens/guards/stack/GuardsStack';
import { AssignmentsStack } from '../../screens/assignments/stack/AssignmentsStack';
import { UsersStack } from '../../screens/users/stack/UsersStack';
import TabNavigator from '../tabs/TabNavigator';
import DrawerContent from './DrawerContent';
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { CheckStack } from '../../screens/check/stack/CheckStack';
import { IncidentsStack } from '../../screens/assignments/stack/IncidentsStack';
import { MaintenanceStack } from '../../screens/maintenances/stack/MaintenanceStack';
import { RoundsStack } from '../../screens/rounds/stack/RoundsStack';
import { SchedulesStack } from '../../screens/schedules/stack/SchedulesStack';
import { ClientStack as ClientsStack } from '../../screens/clients/stack/ClientStack';
import { ZonesStack } from '../../screens/zones/stack/ZonesStack';
import { RecurringStack } from '../../screens/recurring/stack/RecurringStack';

const Drawer = createDrawerNavigator();

const getActiveRouteName = (route: any): string => {
  const childName = getFocusedRouteNameFromRoute(route);

  if (!childName) {
    if (route.name === 'HOME_STACK') return 'HOME_MAIN';
    if (route.name === 'LOCATIONS_STACK') return 'LOCATIONS_MAIN';
    if (route.name === 'PROFILE_SCREEN') return 'PROFILE_MAIN';
    if (route.name === 'CLIENTS_STACK') return 'CLIENTS_MAIN';
    if (route.name === 'ZONES_STACK') return 'ZONES_MAIN';
    if (route.name === 'Tabs') return 'HOME_MAIN';
    return route.name;
  }

  const childRoute = route.state?.routes?.find(
    (r: any) => r.name === childName,
  );
  if (childRoute) {
    return getActiveRouteName(childRoute);
  }

  return childName;
};

const isDrawerEnabled = (route: any) => {
  const routeName = getActiveRouteName(route);
  return DRAWER_WHITELIST.includes(routeName);
};

// Wrapper para TabNavigator con SafeAreaInsets
const TabNavigatorWithSafeArea = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Platform.OS === 'android' ? insets.bottom : 0 },
      ]}
    >
      <TabNavigator />
    </View>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: Platform.OS === 'ios' ? 280 : 260,
        },
        overlayColor: 'rgba(0, 0, 0, 0.4)',
        drawerType: Platform.OS === 'android' ? 'front' : 'slide',
        swipeEdgeWidth: Platform.OS === 'android' ? 20 : 30,
      }}
      drawerContent={props => <DrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Tabs"
        component={TabNavigatorWithSafeArea}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="CHECK_STACK"
        component={CheckStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="LOCATIONS_STACK"
        component={LocationsStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="GUARDS_STACK"
        component={GuardsStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="ASSIGNMENTS_STACK"
        component={AssignmentsStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="USERS_STACK"
        component={UsersStack}
        options={({ route }) => ({
          swipeEnabled: isDrawerEnabled(route),
        })}
      />

      <Drawer.Screen
        name="CLIENTS_STACK"
        component={ClientsStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="ZONES_STACK"
        component={ZonesStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="PROFILE_SCREEN"
        component={ProfileScreen}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="INCIDENTS_STACK"
        component={IncidentsStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="MAINTENANCE_STACK"
        component={MaintenanceStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="ROUNDS_STACK"
        component={RoundsStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="SCHEDULES_STACK"
        component={SchedulesStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="RECURRING_STACK"
        component={RecurringStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ff',
  },
});

export default DrawerNavigator;
