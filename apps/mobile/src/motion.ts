import { tokens } from '@love-it/shared';
import * as Haptics from 'expo-haptics';
import { Easing, withSpring, withTiming, type WithSpringConfig } from 'react-native-reanimated';

const rest = { overshootClamping: false, restDisplacementThreshold: 0.01, restSpeedThreshold: 2 } as const;

const springs: Record<'snappy' | 'smooth' | 'hero', WithSpringConfig> = {
  snappy: { ...tokens.motion.spring.snappy, ...rest },
  smooth: { ...tokens.motion.spring.smooth, ...rest },
  hero: { ...tokens.motion.spring.hero, ...rest },
};

const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  in: Easing.bezier(0.4, 0, 1, 1),
  standard: Easing.bezier(0.2, 0, 0, 1),
};

/** Spring, or a 200ms cross-fade when Reduce Motion is on. Safe to call from a worklet. */
export function brandSpring(
  name: 'snappy' | 'smooth' | 'hero',
  to: number,
  reduced: boolean,
  velocity?: number,
) {
  'worklet';
  if (reduced) {
    return withTiming(to, { duration: tokens.motion.duration.reducedMotion, easing: ease.standard });
  }
  return withSpring(to, { ...springs[name], velocity });
}

export function brandTiming(to: number, reduced: boolean, kind: 'in' | 'out' | 'standard' = 'standard') {
  'worklet';
  const duration = reduced
    ? tokens.motion.duration.reducedMotion
    : kind === 'out'
      ? tokens.motion.duration.fadeOut
      : kind === 'in'
        ? tokens.motion.duration.fadeIn
        : tokens.motion.duration.crossfade;
  return withTiming(to, { duration, easing: kind === 'out' ? ease.in : kind === 'in' ? ease.out : ease.standard });
}

export function brandHaptic(name: keyof typeof tokens.haptics): void {
  const kind = tokens.haptics[name];
  const run =
    kind === 'selectionAsync'
      ? Haptics.selectionAsync()
      : kind === 'impactAsync:Light'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : kind === 'impactAsync:Medium'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  void run.catch(() => undefined);
}

export const motionTokens = tokens.motion;
