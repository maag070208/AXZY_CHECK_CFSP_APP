import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, Icon } from 'react-native-paper';

type AlertType = 'alert' | 'info' | 'check' | 'warning';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  type?: AlertType;
}

const ALERT_CONFIG: Record<
  AlertType,
  {
    icon: string;
    iconColor: string;
    backgroundColor: string;
    buttonColor: string;
  }
> = {
  alert: {
    icon: 'alert-circle-outline',
    iconColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    buttonColor: '#DC2626',
  },
  info: {
    icon: 'information-outline',
    iconColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    buttonColor: '#2563EB',
  },
  check: {
    icon: 'check-circle-outline',
    iconColor: '#059669',
    backgroundColor: '#ECFDF5',
    buttonColor: '#059669',
  },
  warning: {
    icon: 'alert-outline',
    iconColor: '#D97706',
    backgroundColor: '#FFFBEB',
    buttonColor: '#D97706',
  },
};

export const ITAlert = ({
  visible,
  onDismiss,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  type = 'info',
}: Props) => {
  const config = ALERT_CONFIG[type];

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: config.backgroundColor },
            ]}
          >
            <Icon source={config.icon} size={32} color={config.iconColor} />
          </View>

          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>

          <Text variant="bodyMedium" style={styles.description}>
            {description}
          </Text>
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <Button
            onPress={onDismiss}
            disabled={loading}
            mode="text"
            textColor="#64748B"
            style={styles.button}
          >
            {cancelLabel}
          </Button>

          <Button
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            mode="contained"
            buttonColor={config.buttonColor}
            style={[styles.button, styles.confirmButton]}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
  },

  content: {
    alignItems: 'center',
    paddingBottom: 8,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },

  description: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },

  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },

  button: {
    flex: 1,
    borderRadius: 12,
    height: 44,
  },

  confirmButton: {
    elevation: 0,
  },
});
