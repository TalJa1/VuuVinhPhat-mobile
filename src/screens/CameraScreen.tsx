import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import Animated, {
  useSharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { launchImageLibrary } from 'react-native-image-picker';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScanStackParamList } from '../navigation/ScanStack';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import GradientButton from '../components/ui/GradientButton';
import PressableScale from '../components/ui/PressableScale';
import AppIcon from '../components/ui/AppIcon';
import { colors, gradients, radius } from '../theme/theme';

const ReanimatedCamera = Animated.createAnimatedComponent(Camera);

type Props = {
  navigation: NativeStackNavigationProp<ScanStackParamList, 'CameraMain'>;
};

type FlashMode = 'off' | 'on' | 'auto';

const FLASH_CYCLE: FlashMode[] = ['off', 'on', 'auto'];
const FLASH_ICONS: Record<FlashMode, string> = { off: 'flash-off', on: 'flash', auto: 'mci:flash-auto' };
const FLASH_LABELS: Record<FlashMode, string> = { off: 'Tắt', on: 'Bật', auto: 'Tự động' };

export default function CameraScreen({ navigation }: Props) {
  const [position, setPosition] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [capturing, setCapturing] = useState(false);

  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const device = useCameraDevice(position);
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const zoom = useSharedValue(1);
  const startZoom = useSharedValue(1);
  const minZoomSV = useSharedValue(1);
  const maxZoomSV = useSharedValue(5);

  useEffect(() => {
    if (device) {
      minZoomSV.value = device.minZoom;
      maxZoomSV.value = Math.min(device.maxZoom, 8);
      zoom.value = device.neutralZoom;
    }
  }, [device]);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const next = startZoom.value * e.scale;
      zoom.value = Math.min(Math.max(next, minZoomSV.value), maxZoomSV.value);
    });

  const cameraAnimatedProps = useAnimatedProps<any>(() => ({
    zoom: zoom.value,
  }));

  const cycleFlash = useCallback(() => {
    setFlash(f => {
      const idx = FLASH_CYCLE.indexOf(f);
      return FLASH_CYCLE[(idx + 1) % FLASH_CYCLE.length];
    });
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) { return; }
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash });
      const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
      navigation.navigate('OCRResult', { imageUri: uri });
    } catch {
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, flash, navigation]);

  const handleGallery = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 1 }, (res) => {
      if (res.assets?.[0]?.uri) {
        navigation.navigate('OCRResult', { imageUri: res.assets[0].uri! });
      }
    });
  }, [navigation]);

  if (!hasPermission) {
    return (
      <WaterScreen style={styles.center}>
        <PressableScale
          style={[styles.permClose, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Đóng"
        >
          <AppIcon name="close" size={20} color={colors.body} />
        </PressableScale>
        <FloatingCard style={styles.permCard} amplitude={5}>
          <IconBubble icon="camera-outline" size={76} rounded="circle" gradient={gradients.primary} style={styles.permIcon} />
          <Text style={styles.permTitle}>Cần quyền truy cập camera</Text>
          <Text style={styles.permDesc}>
            Để quét và nhận diện văn bản, hãy cho phép ứng dụng sử dụng camera.
          </Text>
          <GradientButton label="Cấp quyền" icon="lock-open-outline" onPress={requestPermission} style={styles.grantBtn} />
        </FloatingCard>
      </WaterScreen>
    );
  }

  if (!device) {
    return (
      <WaterScreen style={styles.center}>
        <FloatingCard style={styles.loadCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadText}>Đang khởi động camera...</Text>
        </FloatingCard>
      </WaterScreen>
    );
  }

  return (
    <View style={styles.container}>
      {/* Only while focused, so light icons don't leak onto the water screens. */}
      {isFocused && (
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
      )}

      {/* Camera preview with pinch-to-zoom */}
      <GestureDetector gesture={pinchGesture}>
        <ReanimatedCamera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          photo={true}
          animatedProps={cameraAnimatedProps}
        />
      </GestureDetector>

      {/* Dim overlay top */}
      <View style={styles.topOverlay} pointerEvents="none" />

      {/* Top controls */}
      <SafeAreaView edges={['top']} style={styles.topControls}>
        <PressableScale
          style={styles.roundBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Đóng camera"
        >
          <AppIcon name="close" size={20} color={colors.white} />
        </PressableScale>

        <View style={styles.flex} />

        {position === 'back' && (
          <PressableScale
            style={[styles.flashBtn, flash !== 'off' && styles.flashBtnOn]}
            onPress={cycleFlash}
            accessibilityLabel={`Đèn flash: ${FLASH_LABELS[flash]}`}
          >
            <AppIcon
              name={FLASH_ICONS[flash]}
              size={16}
              color={flash !== 'off' ? '#ffd54a' : colors.white}
            />
            <Text style={styles.flashLabel}>{FLASH_LABELS[flash]}</Text>
          </PressableScale>
        )}
      </SafeAreaView>

      {/* Focus frame hint */}
      <View style={styles.frameCentre} pointerEvents="none">
        <View style={styles.frameCornerTL} />
        <View style={styles.frameCornerTR} />
        <View style={styles.frameCornerBL} />
        <View style={styles.frameCornerBR} />
        <Text style={styles.frameHint}>Kéo để thu phóng</Text>
      </View>

      {/* Dim overlay bottom */}
      <View style={styles.bottomOverlay} pointerEvents="none" />

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomControls}>
        <PressableScale style={styles.sideBtn} onPress={handleGallery} accessibilityLabel="Thư viện">
          <View style={styles.sideBtnCircle}>
            <AppIcon name="images-outline" size={23} color={colors.white} />
          </View>
          <Text style={styles.sideBtnLabel}>Thư viện</Text>
        </PressableScale>

        <PressableScale
          style={[styles.captureBtn, capturing && styles.captureBtnActive]}
          onPress={handleCapture}
          disabled={capturing}
          scaleTo={0.9}
          accessibilityLabel="Chụp ảnh"
        >
          {capturing
            ? <ActivityIndicator color={colors.primary} size="large" />
            : <View style={styles.captureInner} />}
        </PressableScale>

        <PressableScale
          style={styles.sideBtn}
          onPress={() => setPosition(p => p === 'back' ? 'front' : 'back')}
          accessibilityLabel="Lật camera"
        >
          <View style={styles.sideBtnCircle}>
            <AppIcon name="camera-reverse-outline" size={24} color={colors.white} />
          </View>
          <Text style={styles.sideBtnLabel}>Lật camera</Text>
        </PressableScale>
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 26;
const CORNER_WIDTH = 3.5;
const CORNER_COLOR = '#6ff0e4';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permClose: {
    position: 'absolute',
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: radius.xl,
    backgroundColor: colors.glassStrong,
  },
  permIcon: { marginBottom: 18 },
  permTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 14.5,
    color: colors.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  grantBtn: { alignSelf: 'stretch' },
  loadCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 26,
    gap: 14,
  },
  loadText: { color: colors.body, fontSize: 15, fontWeight: '600' },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  },
  flashBtnOn: { borderColor: 'rgba(255,213,74,0.6)' },
  flashLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  frameCentre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameCornerTL: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderRadius: 4,
  },
  frameCornerTR: {
    position: 'absolute',
    top: '30%',
    right: '15%',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderRadius: 4,
  },
  frameCornerBL: {
    position: 'absolute',
    bottom: '30%',
    left: '15%',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderRadius: 4,
  },
  frameCornerBR: {
    position: 'absolute',
    bottom: '30%',
    right: '15%',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: CORNER_COLOR,
    borderRadius: 4,
  },
  frameHint: {
    position: 'absolute',
    bottom: '27%',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    letterSpacing: 0.4,
  },

  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 190,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 18,
  },
  sideBtn: { alignItems: 'center', gap: 6 },
  sideBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sideBtnLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500' },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: CORNER_COLOR,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 18px rgba(111, 240, 228, 0.55)',
  },
  captureBtnActive: { borderColor: 'rgba(111,240,228,0.5)' },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
});
