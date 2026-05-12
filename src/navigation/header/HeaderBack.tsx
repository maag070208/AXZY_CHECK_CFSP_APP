// components/headers/HeaderBack.tsx
import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ITText, ITTouchableOpacity } from '../../shared/components';

export const HeaderBack = ({ navigation, title, onBack }: any) => {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();

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
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          style={styles.backButton}
        >
          <Icon source="arrow-left" size={22} color="#1E293B" />
        </ITTouchableOpacity>

        <View style={styles.titleContainer}>
          <ITText
            variant="titleMedium"
            weight="bold"
            style={styles.title}
            numberOfLines={1}
          >
            {title}
          </ITText>
        </View>

        <View style={styles.spacer} />
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
  backButton: {
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
  title: {
    color: '#0F172A',
    fontSize: 18,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
});
