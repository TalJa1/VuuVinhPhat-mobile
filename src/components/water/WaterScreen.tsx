import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import WaterBackground from './WaterBackground';

/** Full-screen container with the animated water surface behind it. */
export default function WaterScreen({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.root, style]}>
      <WaterBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#c6f0f6' },
});
