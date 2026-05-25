import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../core/store/redux.config';
import { ITText, ITTouchableOpacity } from '../../shared/components';

export const HeaderGuard = ({ navigation }: any) => {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.userState);

  const currentHour = new Date().getHours();
  let greeting = 'Hola';
  let themeStyles = {
    bg: '#FFFFFF',
    text: '#1E293B',
    subtext: '#64748B',
    statusBar: 'dark-content' as const,
    menuBg: '#F8FAFC',
    divider: '#E2E8F0',
  };

  if (currentHour >= 6 && currentHour < 12) {
    greeting = 'Buenos días';
    themeStyles = {
      bg: '#F8FAFC',
      text: '#0F172A',
      subtext: '#64748B',
      statusBar: 'dark-content' as const,
      menuBg: '#E2E8F0',
      divider: '#CBD5E1',
    };
  } else if (currentHour >= 12 && currentHour < 19) {
    greeting = 'Buenas tardes';
    themeStyles = {
      bg: '#FFFBEB',
      text: '#78350F',
      subtext: '#B45309',
      statusBar: 'dark-content' as const,
      menuBg: '#FEF3C7',
      divider: '#FDE68A',
    };
  } else {
    greeting = 'Buenas noches';
    themeStyles = {
      bg: '#0F172A',
      text: '#F8FAFC',
      subtext: '#94A3B8',
      statusBar: 'light-content' as const,
      menuBg: '#1E293B',
      divider: '#334155',
    };
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeStyles.bg,
          paddingTop: Platform.OS === 'ios' ? insets.top + 12 : insets.top + 10,
          paddingBottom: 20,
          borderBottomColor: themeStyles.divider,
        },
      ]}
    >
      <StatusBar barStyle={themeStyles.statusBar} backgroundColor={themeStyles.bg} />

      <View style={styles.topRow}>
        <ITTouchableOpacity
          onPress={() => navigation.getParent()?.openDrawer()}
          style={[styles.menuButton, { backgroundColor: themeStyles.menuBg }]}
        >
          <Icon source="menu" size={24} color={themeStyles.text} />
        </ITTouchableOpacity>

        <View style={styles.titleContainer}>
          <ITText variant="bodySmall" style={[styles.greetingText, { color: themeStyles.subtext }]}>
            {greeting}, {user.fullName?.split(' ')[0] || 'Guardia'}
          </ITText>
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <ITText variant="labelSmall" style={[styles.timeLabel, { color: themeStyles.subtext }]}>ENTRADA</ITText>
              <ITText variant="titleMedium" weight="bold" style={[styles.timeValue, { color: themeStyles.text }]}>
                {user.loginTime || '--:--'}
              </ITText>
            </View>
            <View style={[styles.timeDivider, { backgroundColor: themeStyles.divider }]} />
            <View style={styles.timeBox}>
              <ITText variant="labelSmall" style={[styles.timeLabel, { color: themeStyles.subtext }]}>SALIDA</ITText>
              <ITText variant="titleMedium" weight="bold" style={[styles.timeValue, { color: themeStyles.text }]}>
                --:--
              </ITText>
            </View>
          </View>
        </View>

        <ITTouchableOpacity style={[styles.avatarButton, { backgroundColor: themeStyles.menuBg, borderColor: themeStyles.divider }]}>
          <Icon source="account-circle" size={32} color={themeStyles.subtext} />
        </ITTouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  greetingText: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBox: {
    alignItems: 'flex-start',
  },
  timeLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
  },
  timeDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 16,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
