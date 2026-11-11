import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FloatingCard from './water/FloatingCard';
import IconBubble from './ui/IconBubble';
import PressableScale from './ui/PressableScale';
import AppIcon from './ui/AppIcon';
import { colors, gradients, radius } from '../theme/theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** `true` renders a back button; a node renders custom left content. */
  left?: boolean | React.ReactNode;
  /** Icon shown in a gradient bubble when there's no back button. */
  icon?: string;
  iconGradient?: string[];
}

/** Floating glass header that rests on the water like the cards below it. */
export default function AppHeader({ title, subtitle, right, left, icon, iconGradient }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  let leftNode: React.ReactNode = null;
  if (left === true) {
    leftNode = (
      <PressableScale
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Quay lại"
        hitSlop={8}
      >
        <AppIcon name="chevron-back" size={22} color={colors.primaryDark} />
      </PressableScale>
    );
  } else if (left) {
    leftNode = left;
  } else if (icon) {
    leftNode = <IconBubble icon={icon} size={42} gradient={iconGradient ?? gradients.primary} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <FloatingCard amplitude={2} index={0} style={styles.bar}>
        {leftNode}
        <View style={[styles.textBlock, leftNode ? styles.textBlockWithLeft : undefined]}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </FloatingCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.glassStrong,
  },
  textBlock: { flex: 1, paddingHorizontal: 4 },
  textBlockWithLeft: { marginLeft: 8 },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.muted, fontWeight: '600', marginTop: 1 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
