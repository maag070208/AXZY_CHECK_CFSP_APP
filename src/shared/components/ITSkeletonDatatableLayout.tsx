import React from 'react';
import { View } from 'react-native';
import Skeleton from 'react-native-reanimated-skeleton';
import { SKELETON_CONFIG } from '../utils/skeleton.constants';
import Animated, { FadeInLeft } from 'react-native-reanimated';

export const ITSkeletonDatatableLayout = () => {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <Skeleton
        isLoading={true}
        duration={SKELETON_CONFIG.DURATION}
        boneColor={SKELETON_CONFIG.BONE_COLOR}
        highlightColor={SKELETON_CONFIG.HIGHLIGHT_COLOR}
        layout={[
          {
            // Grid of cards (simulating the list)
            flexDirection: 'column',
            paddingHorizontal: 20,
            children: Array(6)
              .fill(0)
              .map((_, i) => ({
                key: `item-${i}`,
                width: '100%',
                height: 100,
                borderRadius: 20,
                marginBottom: 12,
              })),
          },
        ]}
      />
    </View>
  );
};

export const ITStaggeredSkeletonDatatable = ({
  items = 2,
}: {
  items: number;
}) => {
  return (
    <View>
      {[...Array(items)].map((_, index) => (
        <Animated.View
          key={index}
          entering={FadeInLeft.delay(index * 100).duration(600)}
        >
          <Skeleton
            isLoading={true}
            duration={SKELETON_CONFIG.DURATION}
            boneColor={SKELETON_CONFIG.BONE_COLOR}
            highlightColor={SKELETON_CONFIG.HIGHLIGHT_COLOR}
            layout={[
              {
                width: '100%',
                height: 140,
                borderRadius: 20,
                marginBottom: 15,
              },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
};
