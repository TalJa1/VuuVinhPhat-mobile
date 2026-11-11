import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import RNFS from 'react-native-fs';
import Geolocation from '@react-native-community/geolocation';
import type { GeolocationResponse } from '@react-native-community/geolocation';
import { SERVER_URL } from '@env';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ScanStackParamList } from '../navigation/ScanStack';
import AppHeader from '../components/AppHeader';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import GradientButton from '../components/ui/GradientButton';
import PressableScale from '../components/ui/PressableScale';
import AppIcon from '../components/ui/AppIcon';
import { colors, gradients, radius } from '../theme/theme';

export const SCAN_HISTORY_KEY = '@ocr_scan_history';

export interface ScanRecord {
  id: string;
  imageUri: string;
  text: string;
  takenAt: string;
  latitude: number | null;
  longitude: number | null;
}

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Quyền truy cập vị trí',
      message: 'Ứng dụng cần quyền vị trí để lưu vị trí chụp ảnh.',
      buttonPositive: 'Đồng ý',
      buttonNegative: 'Từ chối',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

type Props = {
  navigation: NativeStackNavigationProp<ScanStackParamList, 'OCRResult'>;
  route: RouteProp<ScanStackParamList, 'OCRResult'>;
};

export default function OCRResultScreen({ navigation, route }: Props) {
  const { imageUri } = route.params;
  const insets = useSafeAreaInsets();
  const [recognizing, setRecognizing] = useState(true);
  const [editedText, setEditedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [locating, setLocating] = useState(true);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    runOCR();
    fetchLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLocation = async () => {
    setLocating(true);
    setLocationError('');
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setLocating(false);
        setLocationError('Chưa cấp quyền vị trí. Vui lòng cấp quyền trong Cài đặt.');
        return;
      }

      const applyPosition = (pos: GeolocationResponse) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      };

      Geolocation.getCurrentPosition(
        applyPosition,
        err => {
          console.log('[LOCATION ERROR] high-accuracy attempt failed:', err.code, err.message);
          // GPS-only fix can fail indoors or on a cold start; fall back to a
          // lower-accuracy (network/cell) fix with a longer timeout.
          Geolocation.getCurrentPosition(
            applyPosition,
            err2 => {
              console.log('[LOCATION ERROR] fallback attempt failed:', err2.code, err2.message);
              setLocating(false);
              setLocationError('Không thể lấy vị trí. Hãy bật GPS/vị trí và thử lại.');
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
      );
    } catch {
      setLocating(false);
      setLocationError('Không thể lấy vị trí. Hãy bật GPS/vị trí và thử lại.');
    }
  };

  const runOCR = async () => {
    try {
      const filePath = imageUri.startsWith('file://') ? imageUri.slice(7) : imageUri;
      const imageBase64 = await RNFS.readFile(filePath, 'base64');
      console.log('[OCR] Image base64 length:', imageBase64.length, 'chars (~', Math.round(imageBase64.length / 1024), 'KB)');
      console.log('[OCR] Sending to:', `${SERVER_URL}/ocr`);
      const { data } = await axios.post<{ text: string }>(
        `${SERVER_URL}/ocr`,
        { image_base64: imageBase64 },
        { headers: { 'Content-Type': 'application/json' }, timeout: 120000 },
      );
      console.log('[OCR] Response:', data);
      const text = (data.text ?? '').trim();
      setEditedText(text);
      setCharCount(text.length);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.log('[OCR ERROR]', err.code, err.message, err.response?.status, JSON.stringify(err.response?.data));
      } else {
        console.log('[OCR ERROR]', err instanceof Error ? err.message : String(err));
      }
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Lỗi OCR', `Chi tiết lỗi:\n${msg}`);
      setEditedText('');
    } finally {
      setRecognizing(false);
    }
  };

  const handleTextChange = useCallback((text: string) => {
    setEditedText(text);
    setCharCount(text.length);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      const history: ScanRecord[] = raw ? JSON.parse(raw) : [];
      const parsedLat = parseFloat(latitude);
      const parsedLng = parseFloat(longitude);
      const record: ScanRecord = {
        id: Date.now().toString(),
        imageUri,
        text: editedText,
        takenAt: new Date().toISOString(),
        latitude: Number.isFinite(parsedLat) ? parsedLat : null,
        longitude: Number.isFinite(parsedLng) ? parsedLng : null,
      };
      history.unshift(record);
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
      Alert.alert('Đã lưu', 'Kết quả scan đã được lưu vào lịch sử.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Bỏ qua?', 'Kết quả scan sẽ không được lưu.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Bỏ qua',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <WaterScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppHeader title="Kết quả scan" subtitle="Kiểm tra và lưu kết quả" icon="document-text-outline" />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image preview */}
          <FloatingCard index={1} amplitude={4} style={styles.imageCard} containerStyle={styles.cardGap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <View style={styles.imageBadge}>
              <AppIcon name="camera-outline" size={13} color={colors.white} />
              <Text style={styles.imageBadgeText}>Ảnh đã chụp</Text>
            </View>
          </FloatingCard>

          {/* OCR result card — stops bobbing once editable so typing is steady */}
          <FloatingCard index={2} style={styles.resultCard} containerStyle={styles.cardGap} float={recognizing}>
            <View style={styles.resultCardHeader}>
              <View style={styles.cardTitleRow}>
                <IconBubble icon="reader-outline" size={34} gradient={gradients.primary} />
                <Text style={styles.resultCardTitle}>Văn bản nhận diện</Text>
              </View>
              {!recognizing && (
                <View style={styles.hintChip}>
                  <AppIcon name="create-outline" size={12} color={colors.primaryDark} />
                  <Text style={styles.editHint}>Nhấn để chỉnh sửa</Text>
                </View>
              )}
            </View>

            {recognizing ? (
              <View style={styles.loadingOCR}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  Đang nhận diện văn bản...
                </Text>
                <Text style={styles.loadingSubText}>
                  Vui lòng chờ trong giây lát
                </Text>
              </View>
            ) : (
              <>
                {editedText.length === 0 && (
                  <View style={styles.emptyOCR}>
                    <IconBubble icon="search" size={46} rounded="circle" background={colors.primarySoft} color={colors.primary} />
                    <Text style={styles.emptyOCRText}>
                      Không nhận diện được văn bản. Hãy thử chụp lại với ánh
                      sáng tốt hơn.
                    </Text>
                  </View>
                )}
                <TextInput
                  style={[
                    styles.textInput,
                    editedText.length === 0 && styles.textInputEmpty,
                  ]}
                  value={editedText}
                  onChangeText={handleTextChange}
                  multiline
                  textAlignVertical="top"
                  placeholder="Không có văn bản nào được nhận diện..."
                  placeholderTextColor={colors.faint}
                  scrollEnabled={false}
                />
                <Text style={styles.charCount}>{charCount} ký tự</Text>
              </>
            )}
          </FloatingCard>

          {/* Location card */}
          <FloatingCard index={3} style={styles.resultCard} containerStyle={styles.cardGap} float={locating}>
            <View style={styles.resultCardHeader}>
              <View style={styles.cardTitleRow}>
                <IconBubble icon="location-outline" size={34} gradient={gradients.coral} />
                <Text style={styles.resultCardTitle}>Vị trí chụp</Text>
              </View>
              <PressableScale
                onPress={fetchLocation}
                disabled={locating}
                style={styles.hintChip}
                accessibilityLabel="Lấy lại vị trí"
              >
                <AppIcon name="refresh-outline" size={12} color={colors.primaryDark} />
                <Text style={styles.editHint}>
                  {locating ? 'Đang lấy vị trí...' : 'Lấy lại vị trí'}
                </Text>
              </PressableScale>
            </View>
            {locating ? (
              <View style={styles.loadingOCR}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingSubText}>Đang xác định vị trí...</Text>
              </View>
            ) : (
              <View style={styles.locationRow}>
                <View style={styles.locationField}>
                  <Text style={styles.locationLabel}>Vĩ độ (lat)</Text>
                  <TextInput
                    style={styles.locationInput}
                    value={latitude}
                    onChangeText={setLatitude}
                    keyboardType="numbers-and-punctuation"
                    placeholder="—"
                    placeholderTextColor={colors.faint}
                  />
                </View>
                <View style={styles.locationField}>
                  <Text style={styles.locationLabel}>Kinh độ (long)</Text>
                  <TextInput
                    style={styles.locationInput}
                    value={longitude}
                    onChangeText={setLongitude}
                    keyboardType="numbers-and-punctuation"
                    placeholder="—"
                    placeholderTextColor={colors.faint}
                  />
                </View>
              </View>
            )}
            {!!locationError && (
              <View style={styles.locationErrorRow}>
                <AppIcon name="warning-outline" size={14} color={colors.danger} />
                <Text style={styles.locationErrorText}>{locationError}</Text>
              </View>
            )}
          </FloatingCard>

          {/* Metadata preview */}
          {!recognizing && (
            <FloatingCard index={4} style={styles.metaCard}>
              <View style={styles.cardTitleRow}>
                <IconBubble icon="information-circle-outline" size={34} gradient={gradients.mint} />
                <Text style={styles.resultCardTitle}>Thông tin lưu trữ</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Thời gian:</Text>
                <Text style={styles.metaValue}>
                  {new Date().toLocaleString('vi-VN')}
                </Text>
              </View>
              <View style={[styles.metaRow, styles.metaRowLast]}>
                <Text style={styles.metaLabel}>Trạng thái:</Text>
                <View style={styles.readyChip}>
                  <AppIcon name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.readyText}>Sẵn sàng lưu</Text>
                </View>
              </View>
            </FloatingCard>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Action buttons */}
        <FloatingCard
          enter={false}
          amplitude={2}
          containerStyle={[styles.actionsWrap, { marginBottom: Math.max(insets.bottom, 12) }]}
          style={styles.actions}
        >
          <GradientButton
            label="Hủy"
            variant="ghost"
            icon="close"
            onPress={handleDiscard}
            style={styles.discardBtn}
          />
          <GradientButton
            label="Lưu vào lịch sử"
            icon="save-outline"
            onPress={handleSave}
            loading={saving}
            disabled={recognizing || saving}
            style={styles.saveBtn}
          />
        </FloatingCard>
      </KeyboardAvoidingView>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10 },
  cardGap: { marginBottom: 16 },

  imageCard: { padding: 8, borderRadius: radius.xl },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg - 4,
    backgroundColor: colors.primarySoft,
  },
  imageBadge: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(4,40,56,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  imageBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  resultCard: {
    padding: 16,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  resultCardTitle: { fontSize: 15.5, fontWeight: '800', color: colors.ink },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  editHint: { fontSize: 11.5, color: colors.primaryDark, fontWeight: '700' },

  loadingOCR: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  loadingSubText: { fontSize: 13, color: colors.muted },

  emptyOCR: {
    alignItems: 'center',
    paddingBottom: 12,
    gap: 10,
  },
  emptyOCRText: {
    fontSize: 13,
    color: colors.body,
    textAlign: 'center',
    lineHeight: 20,
  },

  textInput: {
    minHeight: 130,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 24,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.inputBg,
  },
  textInputEmpty: { minHeight: 80 },
  charCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '600',
  },

  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationField: { flex: 1 },
  locationLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
    fontWeight: '700',
  },
  locationInput: {
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    padding: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.inputBg,
  },
  locationErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  locationErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },

  metaCard: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  metaRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  metaLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  metaValue: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  readyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  readyText: { fontSize: 12.5, color: colors.success, fontWeight: '800' },
  bottomSpacer: { height: 20 },

  actionsWrap: { marginHorizontal: 16, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.glassStrong,
  },
  discardBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});
