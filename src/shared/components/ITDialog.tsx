import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  Modal as RNModal,
} from 'react-native';
import { Portal, Icon } from 'react-native-paper';
import { theme } from '../theme/theme';
import { ITText } from './ITText';
import { ITButton } from './ITButton';

const { height: screenHeight } = Dimensions.get('window');

interface ITDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
}

export const ITDialog = ({
  visible,
  onDismiss,
  title,
  description,
  icon,
  iconColor = theme.colors.primary,
  iconBackgroundColor = '#EEF2FF',
  children,
  actions,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  onConfirm,
  loading = false,
  confirmDisabled = false,
}: ITDialogProps) => {
  return (
    <Portal>
      <RNModal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onDismiss}
      >
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              >
                <View style={styles.dialogContainer}>
                  <View style={styles.dialog}>
                    <ScrollView
                      bounces={false}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.scrollContent}
                    >
                      <View style={styles.content}>
                        {icon && (
                          <View
                            style={[
                              styles.iconContainer,
                              { backgroundColor: iconBackgroundColor },
                            ]}
                          >
                            <Icon source={icon} size={28} color={iconColor} />
                          </View>
                        )}

                        <ITText
                          variant="titleLarge"
                          weight="bold"
                          style={styles.title}
                        >
                          {title}
                        </ITText>

                        {description && (
                          <ITText
                            variant="bodyMedium"
                            style={styles.description}
                          >
                            {description}
                          </ITText>
                        )}

                        <View style={styles.childrenContainer}>{children}</View>
                      </View>
                    </ScrollView>

                    <View style={styles.actionsContainer}>
                      {actions ? (
                        actions
                      ) : (
                        <View style={styles.actionsWrapper}>
                          <ITButton
                            label={cancelLabel}
                            mode="outlined"
                            onPress={onDismiss}
                            disabled={loading}
                            textColor={theme.colors.slate500}
                            style={styles.button}
                            labelStyle={styles.buttonLabel}
                          />
                          {onConfirm && (
                            <ITButton
                              label={confirmLabel}
                              onPress={onConfirm}
                              loading={loading}
                              disabled={loading || confirmDisabled}
                              style={[styles.button, styles.confirmButton]}
                              labelStyle={styles.buttonLabel}
                            />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    maxHeight: screenHeight * 0.8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  childrenContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  actionsWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    height: 48,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  confirmButton: {
    flex: 1.5,
    backgroundColor: theme.colors.primary,
  },
});
