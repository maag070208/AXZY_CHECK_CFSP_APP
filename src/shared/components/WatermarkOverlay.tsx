import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet, Easing, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { get } from '../../core/axios';

interface ISubscriptionConfig {
  paid: boolean;
  trialDaysRemaining: number;
  showTrialWatermark: boolean;
  showTrialBadge: boolean;
}

export const WatermarkOverlay = () => {
  const [config, setConfig] = useState<ISubscriptionConfig | null>(null);
  const fetchedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    get<ISubscriptionConfig>('/subscription/config')
      .then((res) => {
        if (res.success && res.data && !res.data.paid) {
          setConfig(res.data);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      const text = `${config!.showTrialWatermark ? 'MODO PRUEBA' : ''}${config!.showTrialWatermark && config!.showTrialBadge ? ' · ' : ''}${config!.showTrialBadge ? `${config!.trialDaysRemaining} días de prueba` : ''}`;
      const textWidth = text.length * 8;
      const duration = textWidth * 40;

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scrollAnim, {
            toValue: -textWidth,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scrollAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible, slideAnim, opacityAnim, scrollAnim, config]);

  if (!visible) return null;

  const text = `${config!.showTrialWatermark ? 'MODO PRUEBA' : ''}${config!.showTrialWatermark && config!.showTrialBadge ? ' · ' : ''}${config!.showTrialBadge ? `${config!.trialDaysRemaining} días de prueba` : ''}`;
  const repeatedText = `${text}          ${text}          ${text}`;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}
      pointerEvents="none"
    >
      <Icon source="alert-circle-outline" size={14} color="#FFFFFF" />
      <View style={styles.scrollContainer}>
        <Animated.View style={{ transform: [{ translateX: scrollAnim }], flexDirection: 'row' }}>
          <Text style={styles.bannerText} numberOfLines={1}>{repeatedText}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
