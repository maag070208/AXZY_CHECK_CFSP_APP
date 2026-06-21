import React from 'react';
import { StyleSheet, View, Modal, TouchableWithoutFeedback, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import { ITText, ITTouchableOpacity } from './';
import { theme } from '../theme/theme';

interface ActionOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
  selected?: boolean;
}

interface ActionPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  icon?: string;
  iconColor?: string;
  subtitle?: string;
  options: ActionOption[];
  onSelect: (option: ActionOption) => void;
  loading?: boolean;
  selectedColor?: string;
}

export const ActionPickerModal = ({
  visible,
  onDismiss,
  title,
  icon,
  iconColor = theme.colors.primary,
  subtitle,
  options,
  onSelect,
  loading,
  selectedColor = theme.colors.primary,
}: ActionPickerModalProps) => {
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
                <View style={{ flex: 1 }}>
                  <ITText style={styles.title}>{title}</ITText>
                  {subtitle && (
                    <ITText variant="bodySmall" color="#64748B" style={{ marginTop: 2 }}>
                      {subtitle}
                    </ITText>
                  )}
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                  <Icon source="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Options list */}
              <View style={styles.list}>
                {loading ? (
                  <ActivityIndicator color={selectedColor} size="large" style={{ paddingVertical: 40 }} />
                ) : (
                  <>
                  {options.map((opt) => (
                  <ITTouchableOpacity
                    key={opt.id}
                    style={styles.option}
                    onPress={() => onSelect(opt)}
                    disabled={loading}
                  >
                    {opt.icon && (
                      <Icon
                        source={opt.icon}
                        size={18}
                        color={opt.selected ? selectedColor : '#94A3B8'}
                      />
                    )}
                    <View style={styles.optionText}>
                      <ITText
                        style={[
                          styles.optionLabel,
                          opt.selected && { fontWeight: '700', color: selectedColor },
                        ] as any}
                      >
                        {opt.label}
                      </ITText>
                      {opt.subtitle && (
                        <ITText variant="bodySmall" color="#94A3B8" style={{ fontSize: 11 }}>
                          {opt.subtitle}
                        </ITText>
                      )}
                    </View>
                    {opt.selected && (
                      <Icon source="check" size={18} color={selectedColor} />
                    )}
                  </ITTouchableOpacity>
                ))}
                {options.length === 0 && (
                  <ITText variant="bodySmall" color="#94A3B8" style={{ textAlign: 'center', paddingVertical: 24 }}>
                    Sin opciones disponibles
                  </ITText>
                )}
                  </>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <ITTouchableOpacity onPress={onDismiss} style={styles.footerBtn}>
                  <ITText style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>
                    Cancelar
                  </ITText>
                </ITTouchableOpacity>
              </View>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  list: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    color: '#334155',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 10,
    alignItems: 'center',
  },
  footerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
