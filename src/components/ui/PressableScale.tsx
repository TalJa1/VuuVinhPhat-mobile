import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
  children?: React.ReactNode;
}

/** Pressable that springs down slightly on touch — light, tactile feedback. */
export default function PressableScale({
  style,
  scaleTo = 0.94,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={e => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 });
        onPressIn?.(e);
      }}
      onPressOut={e => {
        scale.value = withSpring(1, { damping: 12, stiffness: 240 });
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
