// components/headers/HeaderMain.tsx
import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { ITText, ITTouchableOpacity } from '../../shared/components';

export const HeaderMain = ({ navigation, title }: any) => {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();

  const user = useSelector((state: RootState) => state.userState);

  console.log(user);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#FFFFFF',
          paddingTop: Platform.OS === 'ios' ? insets.top + 12 : insets.top + 0,
          paddingBottom: 20,
          marginBottom: 10,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topRow}>
        <ITTouchableOpacity
          onPress={() => navigation.getParent()?.openDrawer()}
          style={styles.menuButton}
        >
          <Icon source="menu" size={22} color="#1E293B" />
        </ITTouchableOpacity>

        <View style={styles.titleContainer}>
          <ITText variant="bodySmall" style={styles.greetingText}>
            {new Date().getHours() < 12
              ? 'Buenos días'
              : new Date().getHours() < 18
              ? 'Buenas tardes'
              : 'Buenas noches'}
          </ITText>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.welcomeText}
            numberOfLines={1}
          >
            {user.role === 'ADMIN'
              ? 'Administrador'
              : user.fullName?.split(' ')[0] || 'Usuario'}
          </ITText>
        </View>

        <ITTouchableOpacity style={styles.avatarButton}>
          <Icon source="account-circle" size={28} color="#64748B" />
        </ITTouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  greetingText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 2,
  },
  welcomeText: {
    color: '#0F172A',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
