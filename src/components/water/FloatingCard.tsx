import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, floatShadow, radius } from '../../theme/theme';
import { TWO_PI, useLoopClock, useMotionActive } from './motion';

type Variant = 'glass' | 'solid' | 'gradient' | 'plain';

interface Props {
  children?: React.ReactNode;
  /** Position in a list — staggers the entrance and de-syncs the bobbing. */
  index?: number;
  /** Gentle up/down bobbing like an object resting on water. */
  float?: boolean;
  amplitude?: number;
  /** Fade/slide in when mounted. */
  enter?: boolean;
  variant?: Variant;
  gradient?: string[];
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Styles for the visible card (padding, radius, background...). */
  style?: StyleProp<ViewStyle>;
  /** Styles for the outer wrapper (margins, flex in a row...). */
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export default function FloatingCard({
  children,
  index = 0,
  float = true,
  amplitude = 4,
  enter = true,
  variant = 'glass',
  gradient,
  onPress,
  onLongPress,
  disabled,
  style,
  containerStyle,
  accessibilityLabel,
}: Props) {
  const active = useMotionActive() && float;
  // Slightly different period per card so a list never moves in lockstep.
  const clock = useLoopClock(3400 + (index % 4) * 520, active);
  const pressed = useSharedValue(1);
  const phase = index * 1.35;

  const bobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: amplitude * Math.sin(clock.value * TWO_PI + phase) },
      { scale: pressed.value },
    ],
  }));

  const cardStyle = [
    styles.base,
    variant === 'glass' && styles.glass,
    variant === 'solid' && styles.solid,
    variant !== 'plain' && floatShadow,
    style,
  ];

  const content =
    variant === 'gradient' ? (
      <View style={[styles.base, floatShadow, style]}>
        <LinearGradient
          colors={gradient ?? ['#19c6c6', '#0b93b2', '#08628a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: StyleSheet.flatten(style)?.borderRadius ?? radius.lg },
          ]}
        />
        {children}
      </View>
    ) : (
      <View style={cardStyle}>{children}</View>
    );

  return (
    <Animated.View
      entering={enter ? FadeInDown.delay(Math.min(index, 8) * 70).duration(520) : undefined}
      style={containerStyle}
    >
      <Animated.View style={bobStyle}>
        {onPress || onLongPress ? (
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPressIn={() => {
              pressed.value = withSpring(0.97, { damping: 15, stiffness: 300 });
            }}
            onPressOut={() => {
              pressed.value = withSpring(1, { damping: 12, stiffness: 220 });
            }}
          >
            {content}
          </Pressable>
        ) : (
          content
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  solid: {
    backgroundColor: colors.white,
  },
});
