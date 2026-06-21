import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { ITButton, ITText } from './';
import { theme } from '../theme/theme';

interface ITModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  icon?: string;
  iconColor?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmColor?: string;
  loading?: boolean;
}

export const ITModal = ({
  visible,
  onDismiss,
  title,
  icon,
  iconColor = theme.colors.primary,
  children,
  confirmLabel,
  onConfirm,
  confirmColor = theme.colors.primary,
  loading,
}: ITModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                {icon && (
                  <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
                    <Icon source={icon} size={24} color={iconColor} />
                  </View>
                )}
                <ITText style={styles.title}>{title}</ITText>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                  <Icon source="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              {children && (
                <View style={styles.content}>
                  {loading ? (
                    <ActivityIndicator color={iconColor} size="large" style={{ paddingVertical: 24 }} />
                  ) : (
                    children
                  )}
                </View>
              )}

              {/* Footer */}
              {(confirmLabel || true) && (
                <View style={styles.footer}>
                  <ITButton
                    label="Cancelar"
                    onPress={onDismiss}
                    mode="text"
                    disabled={loading}
                    style={styles.cancelBtn}
                  />
                  {confirmLabel && onConfirm && (
                    <ITButton
                      label={confirmLabel}
                      onPress={onConfirm}
                      mode="contained"
                      textColor="#FFFFFF"
                      loading={loading}
                      disabled={loading}
                      style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
                    />
                  )}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    height: 34,
    justifyContent: 'center',
    marginRight: 8,
  },
  confirmBtn: {
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});
