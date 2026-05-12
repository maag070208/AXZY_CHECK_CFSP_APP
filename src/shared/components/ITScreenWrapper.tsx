import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from 'react-native-paper';

interface ITScreenWrapperProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: Edge[];
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
  backgroundColor?: string;
  roundedTop?: boolean;
  roundedBottom?: boolean;
}

export const ITScreenWrapper: React.FC<ITScreenWrapperProps> = ({
  children,
  footer,
  scrollable = true,
  padding = true,
  style,
  contentContainerStyle,
  edges = ['left', 'right'],
  keyboardShouldPersistTaps = 'handled',
  backgroundColor,
  roundedTop = true,
  roundedBottom = false,
}) => {
  const theme = useTheme();

  const containerStyle = [
    styles.container,
    { backgroundColor: backgroundColor || '#FFF' },
    roundedTop && styles.roundedTop,
    roundedBottom && styles.roundedBottom,
    style,
  ];

  const renderContent = () => {
    if (scrollable) {
      return (
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            !padding && styles.noPaddingContent,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === 'ios' ? 120 : 100}
          extraHeight={Platform.OS === 'ios' ? 120 : 100}
          resetScrollToCoords={{ x: 0, y: 0 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {children}
        </KeyboardAwareScrollView>
      );
    }
    return (
      <View
        style={[
          styles.flex,
          !padding && styles.noPaddingContent,
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    );
  };

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={backgroundColor || '#FFF'}
        translucent={Platform.OS === 'android'}
      />
      {scrollable ? (
        <>
          {renderContent()}
          {footer && (
            <View style={[!padding && styles.noPaddingFooter, styles.footer]}>
              {footer}
            </View>
          )}
        </>
      ) : (
        <KeyboardAvoidingView
          style={[styles.flex, roundedTop && styles.roundedTop]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {renderContent()}
          {footer && (
            <View style={[!padding && styles.noPaddingFooter, styles.footer]}>
              {footer}
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roundedTop: {
    marginTop: 5,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  roundedBottom: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  flex: {
    flex: 1,
  },
  noPaddingContent: {
    paddingHorizontal: 0,
  },
  noPaddingFooter: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
});
