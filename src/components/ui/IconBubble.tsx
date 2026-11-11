import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppIcon from './AppIcon';
import { gradients } from '../../theme/theme';

interface Props {
  icon: string;
  size?: number;
  iconSize?: number;
  /** Gradient fill; ignored when `background` is set. */
  gradient?: string[];
  /** Flat fill instead of a gradient. */
  background?: string;
  color?: string;
  rounded?: 'circle' | 'squircle';
  style?: StyleProp<ViewStyle>;
}

/** Round (or squircle) badge holding an icon, with a small glossy highlight. */
export default function IconBubble({
  icon,
  size = 44,
  iconSize,
  gradient = gradients.primary,
  background,
  color = '#ffffff',
  rounded = 'squircle',
  style,
}: Props) {
  const r = rounded === 'circle' ? size / 2 : size * 0.34;
  const box = { width: size, height: size, borderRadius: r };

  return (
    <View style={[styles.wrap, box, style]}>
      {background ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: background, borderRadius: r }]} />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />
      )}
      {!background && (
        <View
          style={[
            styles.shine,
            { width: size * 0.5, height: size * 0.22, borderRadius: size, top: size * 0.1, left: size * 0.14 },
          ]}
        />
      )}
      <AppIcon name={icon} size={iconSize ?? Math.round(size * 0.5)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
});
