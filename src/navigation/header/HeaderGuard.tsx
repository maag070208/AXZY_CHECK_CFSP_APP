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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#FFFFFF',
          paddingTop: Platform.OS === 'ios' ? insets.top + 12 : insets.top + 10,
          paddingBottom: 20,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topRow}>
        <ITTouchableOpacity
          onPress={() => navigation.getParent()?.openDrawer()}
          style={styles.menuButton}
        >
          <Icon source="menu" size={24} color="#1E293B" />
        </ITTouchableOpacity>

        <View style={styles.titleContainer}>
          <ITText variant="bodySmall" style={styles.greetingText}>
            Hola, {user.fullName?.split(' ')[0] || 'Guardia'}
          </ITText>
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <ITText variant="labelSmall" style={styles.timeLabel}>ENTRADA</ITText>
              <ITText variant="titleMedium" weight="bold" style={styles.timeValue}>
                {user.loginTime || '--:--'}
              </ITText>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBox}>
              <ITText variant="labelSmall" style={styles.timeLabel}>SALIDA</ITText>
              <ITText variant="titleMedium" weight="bold" style={styles.timeValue}>
                --:--
              </ITText>
            </View>
          </View>
        </View>

        <ITTouchableOpacity style={styles.avatarButton}>
          <Icon source="account-circle" size={32} color="#64748B" />
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
    backgroundColor: '#FFF',
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  greetingText: {
    color: '#64748B',
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
    color: '#94A3B8',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValue: {
    color: '#1E293B',
    fontSize: 16,
  },
  timeDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
