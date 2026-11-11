import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import PressableScale from './PressableScale';
import AppIcon from './AppIcon';
import { colors, glowShadow, gradients, radius } from '../../theme/theme';

type Variant = 'primary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress?: () => void;
  icon?: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  gradient?: string[];
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export default function GradientButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  gradient = gradients.primary,
  style,
  compact,
}: Props) {
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? colors.white : variant === 'danger' ? colors.danger : colors.primaryDark;
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      scaleTo={0.96}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        compact && styles.compact,
        isPrimary ? glowShadow : variant === 'danger' ? styles.danger : styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isPrimary && (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: compact ? radius.pill : radius.md }]}
        />
      )}
      {isPrimary && <View style={[styles.shine, compact && styles.shineCompact]} />}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <AppIcon name={icon} size={compact ? 16 : 19} color={fg} /> : null}
          <Text style={[styles.label, compact && styles.labelCompact, { color: fg }, icon ? styles.labelGap : null]}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  shine: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    height: '38%',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  shineCompact: { borderRadius: radius.pill, top: 3 },
  ghost: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1.5,
    borderColor: 'rgba(10,162,184,0.35)',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1.5,
    borderColor: 'rgba(229,72,77,0.25)',
  },
  disabled: { opacity: 0.55 },
  label: { fontSize: 15.5, fontWeight: '800', letterSpacing: 0.2 },
  labelCompact: { fontSize: 13 },
  labelGap: { marginLeft: 8 },
});
