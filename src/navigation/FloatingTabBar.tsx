import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import PressableScale from '../components/ui/PressableScale';
import AppIcon from '../components/ui/AppIcon';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { colors, floatShadow, glowShadow, gradients } from '../theme/theme';

export const TAB_BAR_HEIGHT = 66;
const BAR_GAP = 12;

/** Bottom space screens should reserve so content clears the floating bar. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, BAR_GAP) + 20;
}

const ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Assistant: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Scan: { active: 'scan', inactive: 'scan' },
  History: { active: 'time', inactive: 'time-outline' },
  Guide: { active: 'book', inactive: 'book-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Trang Chủ',
  Assistant: 'Trợ lý',
  Scan: 'Quét',
  History: 'Lịch sử',
  Guide: 'Hướng dẫn',
};

/** The camera/OCR flow is full screen, so the bar steps aside there. */
const HIDDEN_ON = new Set(['Scan']);

function TabItem({ name, focused, onPress, onLongPress }: {
  name: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 });
  }, [focused, progress]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + 0.6 * progress.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * progress.value }],
  }));

  const icon = ICONS[name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

  return (
    <PressableScale
      style={styles.item}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.88}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={TAB_LABELS[name] ?? name}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Animated.View style={[styles.activeBubble, bubbleStyle]}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeBubbleFill}
          />
        </Animated.View>
        <AppIcon
          name={focused ? icon.active : icon.inactive}
          size={21}
          color={focused ? colors.white : colors.muted}
        />
      </Animated.View>
      <Text
        style={[styles.label, focused && styles.labelActive]}
        numberOfLines={1}
      >
        {TAB_LABELS[name] ?? name}
      </Text>
    </PressableScale>
  );
}

function ScanButton({ onPress, onLongPress }: { onPress: () => void; onLongPress: () => void }) {
  const pulse = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { return; }
    pulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [pulse, reduced]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + 0.45 * pulse.value }],
  }));

  return (
    <View style={styles.scanSlot}>
      <Animated.View pointerEvents="none" style={[styles.scanRing, ringStyle]} />
      <PressableScale
        style={[styles.scanBtn, glowShadow]}
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={0.9}
        accessibilityRole="tab"
        accessibilityLabel={TAB_LABELS.Scan}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scanFill}
        />
        <AppIcon name="scan" size={26} color={colors.white} />
      </PressableScale>
      <Text style={styles.label}>{TAB_LABELS.Scan}</Text>
    </View>
  );
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const focusedName = state.routes[state.index]?.name;
  const hidden = keyboardVisible || HIDDEN_ON.has(focusedName);

  const offset = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    offset.value = withTiming(hidden ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [hidden, offset]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: 1 - offset.value,
    transform: [{ translateY: 140 * offset.value }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[styles.wrap, { bottom: Math.max(insets.bottom, BAR_GAP) }, barStyle]}
    >
      <View style={[styles.bar, floatShadow]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          if (route.name === 'Scan') {
            return <ScanButton key={route.key} onPress={onPress} onLongPress={onLongPress} />;
          }
          return (
            <TabItem
              key={route.key}
              name={route.name}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    // Near-opaque: content scrolls underneath and must not show through.
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBubble: {
    ...StyleSheet.absoluteFill,
  },
  activeBubbleFill: {
    flex: 1,
    borderRadius: 16,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 3,
  },
  labelActive: { color: colors.primaryDark },
  scanSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: TAB_BAR_HEIGHT,
    paddingBottom: 9,
  },
  scanRing: {
    position: 'absolute',
    top: -22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
  },
  scanBtn: {
    position: 'absolute',
    top: -22,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  scanFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 26,
  },
});
