import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppHeader from '../components/AppHeader';
import { useNavigation } from '@react-navigation/native';

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

const TAB_ACCENTS: Record<GuideTab, { bg: string; fg: string }> = {
  cleaning: { bg: '#dbeafe', fg: '#1d4ed8' },
  classification: { bg: '#ede9fe', fg: '#6d28d9' },
  emergency: { bg: '#fee2e2', fg: '#dc2626' },
};

type GuideScreenNavigationProp = NativeStackNavigationProp<any>;

function GuideScreen() {
  const navigation = useNavigation<GuideScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<GuideTab>('cleaning');

  // Create separate width animation values for each tab
  const tabWidths = React.useRef({
    cleaning: new Animated.Value(80), // Icon only width
    classification: new Animated.Value(80),
    emergency: new Animated.Value(80),
  }).current;

  // Text opacity animations for each tab
  const textOpacities = React.useRef({
    cleaning: new Animated.Value(1),
    classification: new Animated.Value(0),
    emergency: new Animated.Value(0),
  }).current;

  // Content slide animation
  const contentSlideAnim = React.useRef(new Animated.Value(0)).current;

  // Initialize active tab width and text opacity
  React.useEffect(() => {
    const screenWidth = Dimensions.get('window').width - 32; // Account for padding
    const collapsedWidth = 80;
    const expandedWidth = screenWidth - collapsedWidth * 2;

    Animated.timing(tabWidths.cleaning, {
      toValue: expandedWidth,
      duration: 400,
      useNativeDriver: false,
    }).start();

    Animated.timing(textOpacities.cleaning, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [tabWidths.cleaning, textOpacities.cleaning]);

  const tabs = [
    { key: 'cleaning' as GuideTab, label: 'Làm sạch nước', icon: '🧼' },
    { key: 'classification' as GuideTab, label: 'Phân loại nước', icon: '🔍' },
    { key: 'emergency' as GuideTab, label: 'Khẩn cấp', icon: '🚨' },
  ];

  const getCurrentGuides = () => {
    switch (activeTab) {
      case 'cleaning':
        return CLEANING_GUIDES;
      case 'classification':
        return CLASSIFICATION_GUIDES;
      case 'emergency':
        return EMERGENCY_GUIDES;
      default:
        return CLEANING_GUIDES;
    }
  };

  const getTabIndex = (tabKey: GuideTab): number => {
    return tabs.findIndex(tab => tab.key === tabKey);
  };

  const handleTabPress = (tabKey: GuideTab) => {
    if (activeTab === tabKey) return;

    const currentTabIndex = getTabIndex(activeTab);
    const newTabIndex = getTabIndex(tabKey);
    const slideDirection = newTabIndex > currentTabIndex ? 1 : -1; // 1 for right, -1 for left

    const screenWidth = Dimensions.get('window').width - 32; // Account for padding
    const collapsedWidth = 80; // Width when showing only icon
    const expandedWidth = screenWidth - collapsedWidth * 2; // Take remaining space

    // Step 1: Fade out current text
    Animated.timing(textOpacities[activeTab], {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      // Step 2: Change content immediately
      setActiveTab(tabKey);

      // Step 3: Prepare slide animation
      contentSlideAnim.setValue(slideDirection * screenWidth);

      // Step 4: Animate tab widths and slide content simultaneously
      const widthAnimations = [
        Animated.timing(tabWidths.cleaning, {
          toValue: tabKey === 'cleaning' ? expandedWidth : collapsedWidth,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(tabWidths.classification, {
          toValue: tabKey === 'classification' ? expandedWidth : collapsedWidth,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(tabWidths.emergency, {
          toValue: tabKey === 'emergency' ? expandedWidth : collapsedWidth,
          duration: 500,
          useNativeDriver: false,
        }),
      ];

      const slideAnimation = Animated.timing(contentSlideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      });

      // Run width and slide animations together
      Animated.parallel([...widthAnimations, slideAnimation]).start(() => {
        // Step 5: Fade in new text
        Animated.timing(textOpacities[tabKey], {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    });
  };

  const handleGuidePress = (guide: GuideItem) => {
    navigation.navigate('GuideDetail', {
      guideId: guide.id,
      title: guide.title,
      category: activeTab,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader
        title="Hướng dẫn"
        subtitle="Xử lý và phân tích chất lượng nước"
      />

      <View style={styles.tabContainer}>
        {tabs.map(tab => {
          const isExpanded = activeTab === tab.key;
          return (
            <Animated.View
              key={tab.key}
              style={[
                styles.tab,
                isExpanded && styles.activeTab,
                { width: tabWidths[tab.key] },
              ]}
            >
              <Pressable
                style={[styles.tabButton, isExpanded && styles.activeTabButton]}
                onPress={() => handleTabPress(tab.key)}
              >
                <View style={styles.tabContent}>
                  <Text
                    style={[styles.tabIcon, isExpanded && styles.activeTabIcon]}
                  >
                    {tab.icon}
                  </Text>
                  <Animated.View
                    style={[
                      styles.textContainer,
                      {
                        opacity: textOpacities[tab.key],
                        width: textOpacities[tab.key].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 120],
                        }),
                        transform: [
                          {
                            translateX: textOpacities[tab.key].interpolate({
                              inputRange: [0, 1],
                              outputRange: [-20, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        isExpanded && styles.activeTabLabel,
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </Animated.View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.contentWrapper,
          {
            transform: [{ translateX: contentSlideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionAccent,
                { backgroundColor: TAB_ACCENTS[activeTab].fg },
              ]}
            />
            <Text style={styles.sectionTitle}>
              {tabs.find(tab => tab.key === activeTab)?.label}
            </Text>
          </View>

          {getCurrentGuides().map(guide => (
            <Pressable
              key={guide.id}
              style={styles.guideCard}
              onPress={() => handleGuidePress(guide)}
            >
              <View style={styles.guideHeader}>
                <View
                  style={[
                    styles.guideIconWrap,
                    { backgroundColor: TAB_ACCENTS[activeTab].bg },
                  ]}
                >
                  <Text style={styles.guideIcon}>{guide.icon}</Text>
                </View>
                <View style={styles.guideTextContainer}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideDescription}>
                    {guide.description}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.arrowWrap,
                  { backgroundColor: TAB_ACCENTS[activeTab].bg },
                ]}
              >
                <Text
                  style={[styles.arrowIcon, { color: TAB_ACCENTS[activeTab].fg }]}
                >
                  ›
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tab: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    marginHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  activeTab: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabButton: {
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    overflow: 'hidden',
  },
  tabIcon: {
    fontSize: 22,
    color: '#64748b',
  },
  activeTabIcon: {
    color: '#ffffff',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 8,
  },
  activeTabLabel: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionAccent: {
    width: 5,
    height: 22,
    borderRadius: 3,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  guideCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  guideHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  guideIcon: {
    fontSize: 26,
  },
  guideTextContainer: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  guideDescription: {
    fontSize: 13.5,
    color: '#64748b',
    lineHeight: 20,
  },
  arrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrowIcon: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
});

export default GuideScreen;
