import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { RootStackParamList } from '../navigation/RootStack';
import { getStorageValue } from '../storage/storage';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import { TWO_PI, useLoopClock, useMotionActive } from '../components/water/motion';
import { colors, gradients, radius } from '../theme/theme';

type WelcomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

const welcomeImage = require('../assets/welcome.png');

/** Three droplets bouncing in sequence while the app decides where to go. */
function DropLoader() {
  const clock = useLoopClock(1200, useMotionActive());
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * Math.max(0, Math.sin(clock.value * TWO_PI)) }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * Math.max(0, Math.sin(clock.value * TWO_PI - 1)) }] }));
  const c = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * Math.max(0, Math.sin(clock.value * TWO_PI - 2)) }] }));
  return (
    <View style={styles.loader}>
      {[a, b, c].map((s, i) => (
        <Animated.View key={i} style={[styles.loaderDot, s]} />
      ))}
    </View>
  );
}

function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNavigationProp>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Portrait 2:3 illustration sized to leave room for the brand block below.
  const imageHeight = Math.min(height * 0.5, (width - 56 - 16) * 1.5, 460);
  const imageWidth = imageHeight / 1.5;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function navigateNext() {
      try {
        const storedName = await getStorageValue('@user_name');
        timeoutId = setTimeout(() => {
          if (storedName) {
            navigation.replace('MainTabs');
          } else {
            navigation.replace('NameInput');
          }
        }, 2000);
      } catch (error) {
        console.warn('Lỗi khi kiểm tra tên người dùng', error);
        navigation.replace('NameInput');
      }
    }

    navigateNext();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigation]);

  return (
    <WaterScreen>
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        <FloatingCard amplitude={6} style={styles.imageCard}>
          <Image
            source={welcomeImage}
            style={[styles.image, { width: imageWidth, height: imageHeight }]}
            resizeMode="cover"
          />
        </FloatingCard>

        <Animated.View entering={FadeInUp.delay(250).duration(600)} style={styles.brand}>
          <IconBubble icon="water" size={58} rounded="circle" gradient={gradients.primary} />
          <Text style={styles.title}>Quan Trắc Nước</Text>
          <Text style={styles.tagline}>Theo dõi chất lượng nước mỗi ngày</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(500)}>
          <DropLoader />
        </Animated.View>
      </View>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  imageCard: {
    padding: 8,
    borderRadius: radius.xl + 4,
    backgroundColor: colors.glassStrong,
  },
  image: {
    borderRadius: radius.xl - 4,
  },
  brand: { alignItems: 'center', marginTop: 24 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
    marginTop: 14,
    letterSpacing: 0.3,
  },
  tagline: { fontSize: 14.5, color: colors.body, marginTop: 6, fontWeight: '600' },
  loader: { flexDirection: 'row', gap: 10, marginTop: 24, height: 24, alignItems: 'flex-end' },
  loaderDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});

export default WelcomeScreen;
