import { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  Easing,
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * True when ambient (looping) motion should run: the screen is focused and
 * the user hasn't asked the OS to reduce motion. Looping animations pause on
 * hidden screens so only the visible screen spends frames on them.
 */
export function useMotionActive(): boolean {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  return focused && !reduced;
}

/**
 * A linear 0 → 1 clock that repeats forever while `active`.
 * Consumers map it through Math.sin(...) in worklets for smooth ping-pong
 * motion. Pausing keeps the current value and resuming finishes the current
 * cycle first, so nothing jumps when a screen regains focus.
 */
export function useLoopClock(duration: number, active: boolean, delay = 0) {
  const clock = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(clock);
      return;
    }
    const current = clock.value;
    const fullCycle = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration, easing: Easing.linear }),
      ),
      -1,
      false,
    );
    const resume = withSequence(
      withTiming(1, {
        duration: Math.max(1, (1 - current) * duration),
        easing: Easing.linear,
      }),
      fullCycle,
    );
    clock.value = current === 0 && delay > 0 ? withDelay(delay, resume) : resume;

    return () => cancelAnimation(clock);
  }, [active, clock, delay, duration]);

  return clock;
}

export const TWO_PI = Math.PI * 2;
