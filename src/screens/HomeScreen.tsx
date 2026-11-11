import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppHeader from '../components/AppHeader';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { waterTopics } from '../data/waterTopics';
import { HomeStackParamList } from '../navigation/HomeStack';
import { getStorageValue } from '../storage/storage';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import AppIcon from '../components/ui/AppIcon';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { colors, gradients, radius } from '../theme/theme';
import { TOPIC_GRADIENTS, TOPIC_ICONS } from '../theme/icons';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

function EmptyState() {
  return (
    <Animated.View entering={FadeIn} style={styles.emptyState}>
      <IconBubble icon="search" size={56} rounded="circle" background={colors.glassStrong} color={colors.primary} />
      <Text style={styles.emptyText}>Không tìm thấy chủ đề phù hợp.</Text>
    </Animated.View>
  );
}

function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const tabSpace = useTabBarSpace();
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    getStorageValue('@user_name')
      .then(setUserName)
      .catch(() => setUserName(null));
  }, []);

  const filteredTopics = useMemo(
    () =>
      waterTopics.filter((topic) => {
        const search = searchText.trim().toLowerCase();
        if (!search) {
          return true;
        }

        return [topic.title, topic.subtitle, topic.overview]
          .join(' ')
          .toLowerCase()
          .includes(search);
      }),
    [searchText]
  );

  return (
    <WaterScreen>
      <AppHeader
        title="Trang chủ"
        subtitle={userName ? `Xin chào, ${userName}` : 'Quan trắc nước'}
        icon="water"
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabSpace }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FloatingCard variant="gradient" gradient={gradients.hero} index={1} amplitude={5} style={styles.heroCard}>
          {/* Decorative ripples inside the hero */}
          <View pointerEvents="none" style={styles.heroClip}>
            <View style={[styles.heroRing, styles.heroRingLg]} />
            <View style={[styles.heroRing, styles.heroRingSm]} />
          </View>

          <View style={styles.heroChip}>
            <AppIcon name="mci:water-check" size={15} color={colors.white} />
            <Text style={styles.heroLabel}>Quan Trắc Nước</Text>
          </View>
          <Text style={styles.heroTitle}>Thông tin về chất lượng nước</Text>
          <Text style={styles.heroText}>
            Khám phá dữ liệu về pH, khoáng chất, độ cứng, độ đục và lời khuyên quan trắc nước. Chạm vào mỗi chủ đề để đọc chi tiết và lưu ghi chú.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <AppIcon name="layers-outline" size={14} color={colors.white} />
              <Text style={styles.heroStatText}>{waterTopics.length} chủ đề</Text>
            </View>
            <View style={styles.heroStat}>
              <AppIcon name="create-outline" size={14} color={colors.white} />
              <Text style={styles.heroStatText}>Ghi chú cá nhân</Text>
            </View>
          </View>
        </FloatingCard>

        <FloatingCard index={2} amplitude={3} style={styles.searchCard}>
          <View style={[styles.searchInputWrap, searchFocused && styles.searchInputFocused]}>
            <AppIcon name="search" size={19} color={searchFocused ? colors.primary : colors.muted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Nhập từ khóa tìm kiếm..."
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')} hitSlop={10} accessibilityLabel="Xoá tìm kiếm">
                <AppIcon name="close-circle" size={19} color={colors.faint} />
              </Pressable>
            )}
          </View>
        </FloatingCard>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Các chủ đề chính</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filteredTopics.length}</Text>
          </View>
        </View>

        {filteredTopics.length === 0 ? (
          <EmptyState />
        ) : (
          filteredTopics.map((item, index) => (
            <FloatingCard
              key={item.id}
              index={index + 3}
              style={styles.topicCard}
              containerStyle={styles.topicCardWrap}
              accessibilityLabel={item.title}
              onPress={() =>
                navigation.navigate('TopicDetail', {
                  topicId: item.id,
                  title: item.title,
                })
              }
            >
              <View style={styles.topicHeader}>
                <IconBubble
                  icon={TOPIC_ICONS[item.id] ?? 'water'}
                  gradient={TOPIC_GRADIENTS[item.id] ?? gradients.primary}
                  size={48}
                />
                <View style={styles.topicHeaderText}>
                  <Text style={styles.topicTitle}>{item.title}</Text>
                  <Text style={styles.topicSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.topicOverview}>{item.overview}</Text>
              <View style={styles.highlightRow}>
                <AppIcon name="bulb-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.topicHighlight}>{item.highlight}</Text>
              </View>
              <View style={styles.topicFooter}>
                <Text style={styles.topicBadge}>Chi tiết</Text>
                <AppIcon name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </FloatingCard>
          ))
        )}
      </ScrollView>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10 },
  heroCard: {
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 16,
  },
  heroClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  heroRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroRingLg: { width: 220, height: 220, right: -70, top: -80 },
  heroRingSm: { width: 120, height: 120, right: -20, top: -30, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  heroLabel: { color: colors.white, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.4 },
  heroTitle: { color: colors.white, fontSize: 26, fontWeight: '900', marginBottom: 10, lineHeight: 32 },
  heroText: { color: 'rgba(255,255,255,0.9)', fontSize: 14.5, lineHeight: 22 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(4,40,56,0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroStatText: { color: colors.white, fontSize: 12.5, fontWeight: '700' },
  searchCard: {
    padding: 8,
    marginBottom: 22,
    borderRadius: radius.lg,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    height: 50,
  },
  searchInputFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    marginHorizontal: 10,
    paddingVertical: 0,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginLeft: 4 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
  },
  countPill: {
    marginLeft: 8,
    backgroundColor: colors.glassStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countPillText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 },
  topicCardWrap: { marginBottom: 16 },
  topicCard: {
    padding: 18,
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center' },
  topicHeaderText: { flex: 1, marginLeft: 14 },
  topicTitle: { fontSize: 17.5, fontWeight: '800', color: colors.ink },
  topicSubtitle: {
    color: colors.muted,
    fontSize: 13.5,
    marginTop: 3,
    lineHeight: 19,
  },
  topicOverview: { color: colors.body, fontSize: 14.5, lineHeight: 22, marginTop: 14 },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 12,
  },
  topicHighlight: { flex: 1, color: colors.primaryDeep, fontSize: 13.5, fontWeight: '700', lineHeight: 20 },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 2,
  },
  topicBadge: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: { color: colors.body, fontSize: 15, fontWeight: '600' },
});

export default HomeScreen;
