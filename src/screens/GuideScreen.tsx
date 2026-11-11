import React, { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import AppHeader from '../components/AppHeader';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import PressableScale from '../components/ui/PressableScale';
import AppIcon from '../components/ui/AppIcon';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { categoryColors, colors, radius } from '../theme/theme';
import { GUIDE_ICONS, GUIDE_TAB_ICONS } from '../theme/icons';

type GuideTab = 'cleaning' | 'classification' | 'emergency';

interface GuideItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const CLEANING_GUIDES: GuideItem[] = [
  {
    id: 'boiling',
    title: 'Đun sôi',
    description: 'Cách Đun sôi nước để tiêu diệt vi khuẩn',
    icon: '🔥',
  },
  {
    id: 'filtration',
    title: 'Lọc nước',
    description: 'Các phương pháp lọc nước tại nhà',
    icon: '🏠',
  },
  {
    id: 'chlorination',
    title: 'Khử trùng bằng clo',
    description: 'Sử dụng clo để khử trùng nước',
    icon: '🧴',
  },
  {
    id: 'uv_light',
    title: 'Tia UV',
    description: 'Sử dụng ánh sáng UV để khử trùng',
    icon: '💡',
  },
];

const CLASSIFICATION_GUIDES: GuideItem[] = [
  {
    id: 'color_analysis',
    title: 'Phân tích màu sắc',
    description: 'Xác định chất lượng nước qua màu sắc',
    icon: '🎨',
  },
  {
    id: 'ph_measurement',
    title: 'Đo độ pH',
    description: 'Hiểu về độ pH và ý nghĩa của nó',
    icon: '🧪',
  },
  {
    id: 'odor_detection',
    title: 'Phát hiện mùi',
    description: 'Nhận biết mùi nước và nguyên nhân',
    icon: '👃',
  },
  {
    id: 'turbidity_check',
    title: 'Kiểm tra độ đục',
    description: 'Đánh giá độ trong của nước',
    icon: '🌊',
  },
];

const EMERGENCY_GUIDES: GuideItem[] = [
  {
    id: 'poisoning_symptoms',
    title: 'Triệu chứng ngộ độc',
    description: 'Nhận biết dấu hiệu ngộ độc nước',
    icon: '⚠️',
  },
  {
    id: 'first_aid',
    title: 'Cấp cứu ban đầu',
    description: 'Các bước xử lý khẩn cấp',
    icon: '🚑',
  },
  {
    id: 'medical_attention',
    title: 'Tìm kiếm y tế',
    description: 'Khi nào cần đi khám bác sĩ',
    icon: '🏥',
  },
  {
    id: 'prevention',
    title: 'Phòng ngừa',
    description: 'Cách tránh ngộ độc nước',
    icon: '🛡️',
  },
];

type GuideScreenNavigationProp = NativeStackNavigationProp<any>;

const TABS: { key: GuideTab; label: string }[] = [
  { key: 'cleaning', label: 'Làm sạch nước' },
  { key: 'classification', label: 'Phân loại nước' },
  { key: 'emergency', label: 'Khẩn cấp' },
];

const GUIDES_BY_TAB: Record<GuideTab, GuideItem[]> = {
  cleaning: CLEANING_GUIDES,
  classification: CLASSIFICATION_GUIDES,
  emergency: EMERGENCY_GUIDES,
};

const SEGMENT_PAD = 6;

function GuideScreen() {
  const navigation = useNavigation<GuideScreenNavigationProp>();
  const tabSpace = useTabBarSpace();
  const [activeTab, setActiveTab] = useState<GuideTab>('cleaning');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const direction = useRef<1 | -1>(1);
  const indicatorX = useSharedValue(0);

  const activeIndex = TABS.findIndex(tab => tab.key === activeTab);
  const accent = categoryColors[activeTab];

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const onSegmentLayout = (e: LayoutChangeEvent) => {
    const width = (e.nativeEvent.layout.width - SEGMENT_PAD * 2) / TABS.length;
    setSegmentWidth(width);
    indicatorX.value = activeIndex * width;
  };

  const handleTabPress = (tabKey: GuideTab) => {
    if (activeTab === tabKey) { return; }
    const newIndex = TABS.findIndex(tab => tab.key === tabKey);
    direction.current = newIndex > activeIndex ? 1 : -1;
    indicatorX.value = withSpring(newIndex * segmentWidth, { damping: 16, stiffness: 170 });
    setActiveTab(tabKey);
  };

  const handleGuidePress = (guide: GuideItem) => {
    navigation.navigate('GuideDetail', {
      guideId: guide.id,
      title: guide.title,
      category: activeTab,
    });
  };

  const entering = (direction.current === 1 ? FadeInRight : FadeInLeft).duration(380);

  return (
    <WaterScreen>
      <AppHeader
        title="Hướng dẫn"
        subtitle="Xử lý và phân tích chất lượng nước"
        icon="book"
      />

      <FloatingCard
        amplitude={2}
        index={1}
        containerStyle={styles.segmentWrap}
        style={styles.segment}
      >
        <View onLayout={onSegmentLayout} style={styles.segmentInner}>
          {segmentWidth > 0 && (
            <Animated.View style={[styles.indicator, { width: segmentWidth }, indicatorStyle]}>
              <LinearGradient
                colors={accent.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.indicatorFill}
              />
            </Animated.View>
          )}
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <PressableScale
                key={tab.key}
                style={styles.segmentItem}
                onPress={() => handleTabPress(tab.key)}
                scaleTo={0.92}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                <AppIcon
                  name={GUIDE_TAB_ICONS[tab.key]}
                  size={21}
                  color={isActive ? colors.white : colors.muted}
                />
                <Text
                  style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </FloatingCard>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={activeTab} entering={entering}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: accent.fg }]} />
            <Text style={styles.sectionTitle}>{TABS[activeIndex]?.label}</Text>
            <View style={[styles.countPill, { backgroundColor: accent.soft }]}>
              <Text style={[styles.countPillText, { color: accent.fg }]}>
                {GUIDES_BY_TAB[activeTab].length}
              </Text>
            </View>
          </View>

          {GUIDES_BY_TAB[activeTab].map((guide, index) => (
            <FloatingCard
              key={guide.id}
              index={index}
              enter={false}
              style={styles.guideCard}
              containerStyle={styles.guideCardWrap}
              onPress={() => handleGuidePress(guide)}
              accessibilityLabel={guide.title}
            >
              <IconBubble
                icon={GUIDE_ICONS[guide.id] ?? 'water'}
                gradient={accent.gradient}
                size={52}
              />
              <View style={styles.guideTextContainer}>
                <Text style={styles.guideTitle}>{guide.title}</Text>
                <Text style={styles.guideDescription}>{guide.description}</Text>
              </View>
              <View style={[styles.arrowWrap, { backgroundColor: accent.soft }]}>
                <AppIcon name="chevron-forward" size={18} color={accent.fg} />
              </View>
            </FloatingCard>
          ))}
        </Animated.View>
      </ScrollView>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  segmentWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
  },
  segment: {
    borderRadius: radius.lg,
    backgroundColor: colors.glassStrong,
  },
  segmentInner: {
    flexDirection: 'row',
    padding: SEGMENT_PAD,
  },
  indicator: {
    position: 'absolute',
    top: SEGMENT_PAD,
    bottom: SEGMENT_PAD,
    left: SEGMENT_PAD,
  },
  indicatorFill: {
    flex: 1,
    borderRadius: radius.md,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    marginTop: 4,
  },
  segmentLabelActive: { color: colors.white },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 2,
  },
  sectionAccent: {
    width: 5,
    height: 22,
    borderRadius: 3,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
  },
  countPill: {
    marginLeft: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countPillText: { fontWeight: '800', fontSize: 13 },
  guideCardWrap: { marginBottom: 14 },
  guideCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 3,
  },
  guideDescription: {
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 20,
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default GuideScreen;
