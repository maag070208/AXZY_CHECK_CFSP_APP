// tabs/TabNavigator.tsx (versión final)
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeStack from '../../screens/home/stack/HomeStack';
import { KardexStack } from '../../screens/kardex/stack/KardexStack';

const Tab = createBottomTabNavigator();

import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { UserRole } from '../../core/types/IUser';
import { Icon } from 'react-native-paper';
import { theme } from '../../shared/theme/theme';

const TabNavigator = () => {
  const user = useSelector((state: RootState) => state.userState);
  const role = user.role;
  const insets = useSafeAreaInsets();

  // Altura dinámica para Android (considerando la barra de navegación)
  const tabBarHeight =
    Platform.OS === 'ios' ? 60 : 55 + (insets.bottom > 0 ? 0 : 8); // Compensación para Android sin gesture

  if (role === UserRole.GUARD) {
    return <HomeStack />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#e1dccbff',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom:
            Platform.OS === 'ios'
              ? 8
              : Math.max(4, insets.bottom > 0 ? insets.bottom - 8 : 4),
          paddingTop: 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 4 : 2,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 4 : 2,
        },
      }}
    >
      {(role === UserRole.ADMIN ||
        role === UserRole.SHIFT ||
        role === UserRole.MAINT ||
        role === UserRole.RESDN) && (
        <Tab.Screen
          name="HOME_STACK"
          component={HomeStack}
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconContainer,
                  focused && styles.iconContainerActive,
                ]}
              >
                <Icon
                  source={focused ? 'home' : 'home-outline'}
                  size={22}
                  color={color}
                />
              </View>
            ),
          }}
        />
      )}
      {(role === UserRole.ADMIN || role === UserRole.SHIFT) && (
        <Tab.Screen
          name="Kardex"
          component={KardexStack}
          options={{
            title: 'Historial',
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconContainer,
                  focused && styles.iconContainerActive,
                ]}
              >
                <Icon source="history" size={22} color={color} />
              </View>
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: '#EEF2FF',
  },
});

export default TabNavigator;
