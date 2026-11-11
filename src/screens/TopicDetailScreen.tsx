import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../navigation/HomeStack';
import { waterTopics } from '../data/waterTopics';
import {
  getStorageValue,
  setStorageValue,
  removeStorageValue,
} from '../storage/storage';
import AppHeader from '../components/AppHeader';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import GradientButton from '../components/ui/GradientButton';
import AppIcon from '../components/ui/AppIcon';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { colors, gradients, radius } from '../theme/theme';
import { TOPIC_GRADIENTS, TOPIC_ICONS } from '../theme/icons';

type TopicDetailRouteProp = RouteProp<HomeStackParamList, 'TopicDetail'>;

function TopicDetailScreen({ route }: { route: TopicDetailRouteProp }) {
  const { topicId } = route.params;
  const topic = waterTopics.find(item => item.id === topicId);
  const tabSpace = useTabBarSpace();
  const [note, setNote] = useState('');
  const [loadingNote, setLoadingNote] = useState(true);
  const [noteFocused, setNoteFocused] = useState(false);

  useEffect(() => {
    async function loadNote() {
      try {
        const savedNote = await getStorageValue(`@topic_note_${topicId}`);
        setNote(savedNote ?? '');
      } catch (error) {
        console.warn('Lỗi khi tải ghi chú', error);
      } finally {
        setLoadingNote(false);
      }
    }

    loadNote();
  }, [topicId]);

  const handleSaveNote = async () => {
    try {
      await setStorageValue(`@topic_note_${topicId}`, note);
      Alert.alert(
        'Lưu thành công',
        'Ghi chú của bạn đã được lưu trên thiết bị.',
      );
    } catch (error) {
      console.warn('Lỗi khi lưu ghi chú', error);
      Alert.alert('Lỗi', 'Không thể lưu ghi chú. Vui lòng thử lại.');
    }
  };

  const handleClearNote = async () => {
    try {
      await removeStorageValue(`@topic_note_${topicId}`);
      setNote('');
      Alert.alert('Đã xoá', 'Ghi chú đã được xoá khỏi bộ nhớ thiết bị.');
    } catch (error) {
      console.warn('Lỗi khi xoá ghi chú', error);
      Alert.alert('Lỗi', 'Không thể xoá ghi chú. Vui lòng thử lại.');
    }
  };

  if (!topic) {
    return (
      <WaterScreen style={styles.missingContainer}>
        <IconBubble icon="alert-circle-outline" size={60} rounded="circle" background={colors.glassStrong} color={colors.primary} />
        <Text style={styles.missingText}>Chủ đề không tồn tại.</Text>
      </WaterScreen>
    );
  }

  const topicGradient = TOPIC_GRADIENTS[topic.id] ?? gradients.primary;

  return (
    <WaterScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppHeader title={topic.title} subtitle="Chi tiết chủ đề" left={true} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabSpace }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FloatingCard variant="gradient" gradient={gradients.hero} index={1} amplitude={5} style={styles.headerCard}>
            <View style={styles.headerTop}>
              <IconBubble
                icon={TOPIC_ICONS[topic.id] ?? 'water'}
                size={54}
                gradient={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
              />
              <View style={styles.headerTopText}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
              </View>
            </View>
            <Text style={styles.topicOverview}>{topic.overview}</Text>
          </FloatingCard>

          {topic.details.map((detail, index) => (
            <FloatingCard
              key={detail.heading}
              index={index + 2}
              style={styles.detailCard}
              containerStyle={styles.cardGap}
            >
              <View style={styles.detailHeadingRow}>
                <IconBubble
                  icon={'mci:numeric-' + (index + 1)}
                  size={34}
                  iconSize={20}
                  gradient={topicGradient}
                  rounded="circle"
                />
                <Text style={styles.detailHeading}>{detail.heading}</Text>
              </View>
              <Text style={styles.detailBody}>{detail.body}</Text>
            </FloatingCard>
          ))}

          <FloatingCard
            index={topic.details.length + 2}
            style={styles.noteCard}
            containerStyle={styles.noteCardWrap}
            float={!noteFocused}
          >
            <View style={styles.noteTitleRow}>
              <IconBubble icon="create-outline" size={38} gradient={gradients.primary} />
              <Text style={styles.noteTitle}>Ghi chú cá nhân</Text>
            </View>
            <Text style={styles.noteDescription}>
              Bạn có thể lưu lại thông tin quan trọng cho chủ đề này. Ghi chú
              được lưu cục bộ trên thiết bị.
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Nhập ghi chú của bạn..."
              placeholderTextColor={colors.faint}
              multiline
              style={[styles.noteInput, noteFocused && styles.noteInputFocused]}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
            />
            <View style={styles.buttonRow}>
              <GradientButton label="Lưu" icon="save-outline" onPress={handleSaveNote} style={styles.flex} />
              <GradientButton label="Xóa" icon="trash-outline" variant="ghost" onPress={handleClearNote} style={styles.flex} />
            </View>
            {!loadingNote && note.length === 0 && (
              <View style={styles.noteHintRow}>
                <AppIcon name="information-circle-outline" size={16} color={colors.muted} />
                <Text style={styles.noteHint}>
                  Chưa có ghi chú. Bạn có thể thêm ghi chú ở đây.
                </Text>
              </View>
            )}
          </FloatingCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 10 },
  missingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  missingText: { fontSize: 18, color: colors.ink, textAlign: 'center', fontWeight: '700' },
  headerCard: {
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 18,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTopText: { flex: 1, marginLeft: 14 },
  topicTitle: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '900',
  },
  topicSubtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 14.5, marginTop: 4, lineHeight: 20 },
  topicOverview: { color: 'rgba(255,255,255,0.94)', fontSize: 15, lineHeight: 23 },
  cardGap: { marginBottom: 14 },
  detailCard: {
    padding: 18,
  },
  detailHeadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailHeading: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginLeft: 12,
  },
  detailBody: { fontSize: 15, color: colors.body, lineHeight: 23 },
  noteCardWrap: { marginTop: 8 },
  noteCard: {
    padding: 18,
    backgroundColor: colors.glassStrong,
  },
  noteTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  noteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDeep,
    marginLeft: 12,
  },
  noteDescription: { color: colors.body, lineHeight: 22, marginBottom: 14 },
  noteInput: {
    minHeight: 120,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    padding: 14,
    color: colors.ink,
    fontSize: 15,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    marginBottom: 14,
  },
  noteInputFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  buttonRow: { flexDirection: 'row', gap: 10 },
  noteHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  noteHint: { color: colors.muted, fontSize: 13.5, flex: 1 },
});

export default TopicDetailScreen;
