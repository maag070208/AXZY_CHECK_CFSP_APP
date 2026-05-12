import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Portal, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ITText } from './ITText';

interface ITScreensFiltersModalProps {
  visible: boolean;
  onDismiss: () => void;
  onApply: () => void;
  onClear: () => void;
  children: React.ReactNode;
}

export const ITScreensFiltersModal: React.FC<ITScreensFiltersModalProps> = ({
  visible,
  onDismiss,
  onApply,
  onClear,
  children,
}) => {
  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.fullScreenContainer}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.header}>
            <IconButton icon="arrow-left" onPress={onDismiss} size={24} />
            <ITText variant="titleLarge" weight="bold">
              Filtros
            </ITText>
            <Button
              onPress={onClear}
              mode="text"
              labelStyle={styles.clearBtnText}
            >
              Limpiar
            </Button>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              onPress={onApply}
              mode="contained"
              style={styles.applyBtn}
              contentStyle={styles.applyBtnContent}
            >
              Aplicar Filtros
            </Button>
          </View>
        </SafeAreaView>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  clearBtnText: {
    color: '#64748B',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applyBtn: {
    borderRadius: 14,
  },
  applyBtnContent: {
    height: 54,
  },
});
