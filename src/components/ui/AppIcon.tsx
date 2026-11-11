import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * One icon component for the whole app.
 * Names default to Ionicons; prefix with "mci:" for MaterialCommunityIcons
 * (e.g. "mci:water-check").
 */
export interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export default function AppIcon({ name, size = 20, color = '#0b3142', style }: AppIconProps) {
  if (name.startsWith('mci:')) {
    return <MaterialCommunityIcons name={name.slice(4)} size={size} color={color} style={style} />;
  }
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
