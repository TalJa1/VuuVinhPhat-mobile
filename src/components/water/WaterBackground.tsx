import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { gradients } from '../../theme/theme';
import { TWO_PI, useLoopClock, useMotionActive } from './motion';

/**
 * Animated water surface used behind every screen.
 * Built only from gradients + plain views (no SVG): swaying light rays,
 * drifting caustic light pools, expanding ripple rings, twinkling glints and
 * rising bubbles. All motion runs on the UI thread via Reanimated and pauses
 * when the screen isn't focused.
 */

// Positions are fractions of the screen so the layout scales on any device.
const RAYS = [
  { x: 0.12, w: 90, angle: 14, duration: 9000, phase: 0 },
  { x: 0.46, w: 130, angle: 8, duration: 11000, phase: 2 },
  { x: 0.8, w: 80, angle: 4, duration: 10000, phase: 4 },
];

const POOLS = [
  { x: 0.1, y: 0.18, size: 300, duration: 14000, phase: 0 },
  { x: 0.75, y: 0.48, size: 260, duration: 17000, phase: 2 },
  { x: 0.25, y: 0.82, size: 340, duration: 15000, phase: 4 },
];

const RIPPLES = [
  { x: 0.82, y: 0.2, duration: 5200, delay: 0 },
  { x: 0.18, y: 0.56, duration: 6000, delay: 1800 },
  { x: 0.7, y: 0.86, duration: 5600, delay: 3200 },
];

const GLINTS = [
  { x: 0.3, y: 0.12, duration: 2600, phase: 0 },
  { x: 0.62, y: 0.3, duration: 3100, phase: 1.5 },
  { x: 0.88, y: 0.62, duration: 2900, phase: 3 },
  { x: 0.42, y: 0.72, duration: 3400, phase: 4.5 },
];

const BUBBLES = [
  { x: 0.08, size: 10, duration: 13000, delay: 0 },
  { x: 0.24, size: 6, duration: 10000, delay: 4000 },
  { x: 0.5, size: 14, duration: 16000, delay: 2000 },
  { x: 0.68, size: 8, duration: 12000, delay: 6000 },
  { x: 0.86, size: 12, duration: 14500, delay: 1000 },
  { x: 0.38, size: 7, duration: 11000, delay: 8000 },
];

type Size = { width: number; height: number };

function LightRay({ cfg, active, size }: { cfg: (typeof RAYS)[number]; active: boolean; size: Size }) {
  const clock = useLoopClock(cfg.duration, active);
  const style = useAnimatedStyle(() => {
    const s = Math.sin(clock.value * TWO_PI + cfg.phase);
    return {
      opacity: 0.45 + 0.25 * s,
      transform: [{ rotate: `${cfg.angle + 5 * s}deg` }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.ray,
        { left: cfg.x * size.width - cfg.w / 2, width: cfg.w, height: size.height * 0.85 },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function LightPool({ cfg, active, size }: { cfg: (typeof POOLS)[number]; active: boolean; size: Size }) {
  const clock = useLoopClock(cfg.duration, active);
  const style = useAnimatedStyle(() => {
    const t = clock.value * TWO_PI + cfg.phase;
    return {
      transform: [
        { translateX: 34 * Math.sin(t) },
        { translateY: 26 * Math.cos(t) },
        { scale: 1 + 0.08 * Math.sin(t * 2) },
      ],
    };
  });
  const d = cfg.size;
  return (
    <Animated.View
      style={[
        styles.pool,
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          left: cfg.x * size.width - d / 2,
          top: cfg.y * size.height - d / 2,
        },
        style,
      ]}
    >
      {/* Stacked translucent discs fake a soft radial falloff. */}
      <View style={[styles.poolRing, { borderRadius: d / 2, margin: d * 0.12 }]}>
        <View style={[styles.poolRing, { borderRadius: d / 2, margin: d * 0.12 }]} />
      </View>
    </Animated.View>
  );
}

const RIPPLE_SIZE = 120;

function RippleRing({ clockValue, offset }: { clockValue: ReturnType<typeof useLoopClock>; offset: number }) {
  const style = useAnimatedStyle(() => {
    const p = (clockValue.value + offset) % 1;
    return {
      opacity: 0.55 * (1 - p),
      transform: [{ scaleX: 0.3 + 2.1 * p }, { scaleY: (0.3 + 2.1 * p) * 0.55 }],
    };
  });
  return <Animated.View style={[styles.ripple, style]} />;
}

function RippleSpot({ cfg, active, size }: { cfg: (typeof RIPPLES)[number]; active: boolean; size: Size }) {
  const clock = useLoopClock(cfg.duration, active, cfg.delay);
  return (
    <View
      style={[
        styles.rippleSpot,
        { left: cfg.x * size.width - RIPPLE_SIZE / 2, top: cfg.y * size.height - RIPPLE_SIZE / 2 },
      ]}
    >
      <RippleRing clockValue={clock} offset={0} />
      <RippleRing clockValue={clock} offset={0.45} />
    </View>
  );
}

function Glint({ cfg, active, size }: { cfg: (typeof GLINTS)[number]; active: boolean; size: Size }) {
  const clock = useLoopClock(cfg.duration, active);
  const style = useAnimatedStyle(() => {
    const s = Math.sin(clock.value * TWO_PI + cfg.phase);
    const v = Math.max(0, s);
    return { opacity: v * 0.85, transform: [{ scale: 0.5 + 0.7 * v }] };
  });
  // A soft glimmer: bright core inside a faint halo (no cross shape, which
  // could be mistaken for a close button).
  return (
    <Animated.View style={[styles.glint, { left: cfg.x * size.width, top: cfg.y * size.height }, style]}>
      <View style={styles.glintCore} />
    </Animated.View>
  );
}

function Bubble({ cfg, active, size }: { cfg: (typeof BUBBLES)[number]; active: boolean; size: Size }) {
  const clock = useLoopClock(cfg.duration, active, cfg.delay);
  const travel = size.height + 80;
  const style = useAnimatedStyle(() => {
    const p = clock.value;
    // Fade in at the bottom, fade out near the top.
    const fade = Math.min(1, p * 6, (1 - p) * 4);
    return {
      opacity: 0.85 * fade,
      transform: [
        { translateY: -travel * p },
        { translateX: 12 * Math.sin(p * TWO_PI * 3) },
      ],
    };
  });
  const d = cfg.size;
  return (
    <Animated.View
      style={[
        styles.bubble,
        { width: d, height: d, borderRadius: d / 2, left: cfg.x * size.width, top: size.height + 20 },
        style,
      ]}
    >
      <View style={[styles.bubbleShine, { width: d * 0.32, height: d * 0.32, borderRadius: d }]} />
    </Animated.View>
  );
}

function WaterBackground() {
  const { width, height } = useWindowDimensions();
  const active = useMotionActive();
  const size = { width, height };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradients.water} locations={[0, 0.35, 0.72, 1]} style={StyleSheet.absoluteFill} />
      {POOLS.map((cfg, i) => (
        <LightPool key={`p${i}`} cfg={cfg} active={active} size={size} />
      ))}
      {RAYS.map((cfg, i) => (
        <LightRay key={`r${i}`} cfg={cfg} active={active} size={size} />
      ))}
      {RIPPLES.map((cfg, i) => (
        <RippleSpot key={`w${i}`} cfg={cfg} active={active} size={size} />
      ))}
      {GLINTS.map((cfg, i) => (
        <Glint key={`g${i}`} cfg={cfg} active={active} size={size} />
      ))}
      {BUBBLES.map((cfg, i) => (
        <Bubble key={`b${i}`} cfg={cfg} active={active} size={size} />
      ))}
      {/* Bright surface sheen at the very top. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
        style={styles.sheen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ray: {
    position: 'absolute',
    top: -40,
    transformOrigin: 'top',
    borderRadius: 60,
    overflow: 'hidden',
  },
  pool: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  poolRing: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rippleSpot: {
    position: 'absolute',
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
  },
  ripple: {
    ...StyleSheet.absoluteFill,
    borderRadius: RIPPLE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  glint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glintCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bubbleShine: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
});

export default memo(WaterBackground);
