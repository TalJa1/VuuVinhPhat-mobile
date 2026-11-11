/* eslint-disable react-native/no-inline-styles */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { SCAN_HISTORY_KEY } from './OCRResultScreen';
import type { ScanRecord } from './OCRResultScreen';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import GradientButton from '../components/ui/GradientButton';
import PressableScale from '../components/ui/PressableScale';
import AppIcon from '../components/ui/AppIcon';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { colors, glowShadow, gradients, radius } from '../theme/theme';

type MapPoint = { latitude: number; longitude: number; label?: string };

function buildMapHtml(points: MapPoint[]): string {
  // "<" is escaped so label text can never close the inline <script> tag.
  const pointsJson = JSON.stringify(points).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var points = ${pointsJson};
    var map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    var latLngs = points.map(function (p) {
      var latLng = [p.latitude, p.longitude];
      var marker = L.marker(latLng).addTo(map);
      if (p.label) { marker.bindPopup(p.label); }
      return latLng;
    });
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 16);
    } else {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });
    }
  </script>
</body>
</html>`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function textPreview(text: string, maxLen = 90): string {
  if (!text.trim()) { return '(Không có văn bản)'; }
  return text.length > maxLen ? `${text.slice(0, maxLen).trimEnd()}…` : text;
}

export default function ScanHistoryScreen() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScanRecord | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [mapPoints, setMapPoints] = useState<MapPoint[] | null>(null);
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();

  const locationPoints = useMemo<MapPoint[]>(
    () =>
      records
        .filter(r => r.latitude != null && r.longitude != null)
        .map(r => ({
          latitude: r.latitude as number,
          longitude: r.longitude as number,
          label: `📅 ${formatDate(r.takenAt)} 🕒 ${formatTime(r.takenAt)}`,
        })),
    [records],
  );
  const hasLocations = locationPoints.length > 0;

  // FAB animations: spring-in entrance, soft pulsing ring, press scale.
  const fabEntrance = useRef(new Animated.Value(0)).current;
  const fabPress = useRef(new Animated.Value(1)).current;
  const fabPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fabEntrance, {
      toValue: hasLocations ? 1 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [hasLocations, fabEntrance]);

  useEffect(() => {
    if (!hasLocations) { return; }
    fabPulse.setValue(0);
    const loop = Animated.loop(
      Animated.timing(fabPulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [hasLocations, fabPulse]);

  const animateFabPress = (toValue: number) =>
    Animated.spring(fabPress, {
      toValue,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      const list: ScanRecord[] = raw ? JSON.parse(raw) : [];
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xoá scan?', 'Bản ghi này sẽ bị xoá vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          const updated = records.filter(r => r.id !== id);
          setRecords(updated);
          await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (records.length === 0) { return; }
    Alert.alert('Xoá tất cả?', 'Toàn bộ lịch sử scan sẽ bị xoá.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xoá tất cả',
        style: 'destructive',
        onPress: async () => {
          setRecords([]);
          await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
        },
      },
    ]);
  };

  const openDetail = (record: ScanRecord) => {
    setSelected(record);
    setEditText(record.text);
  };

  const handleUpdateText = async () => {
    if (!selected) { return; }
    setSaving(true);
    try {
      const updated = records.map(r =>
        r.id === selected.id ? { ...r, text: editText } : r
      );
      setRecords(updated);
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
      setSelected(null);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, index }: { item: ScanRecord; index: number }) => (
    <FloatingCard
      index={index}
      style={styles.card}
      containerStyle={styles.cardWrap}
      onPress={() => openDetail(item)}
      accessibilityLabel={`Scan ${formatDate(item.takenAt)} ${formatTime(item.takenAt)}`}
    >
      <Image
        source={{ uri: item.imageUri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <View style={styles.cardDateRow}>
          <View style={styles.dateChip}>
            <AppIcon name="calendar-outline" size={12} color={colors.primaryDark} />
            <Text style={styles.cardDate}>{formatDate(item.takenAt)}</Text>
          </View>
          <View style={styles.timeChip}>
            <AppIcon name="time-outline" size={12} color={colors.body} />
            <Text style={styles.cardTime}>{formatTime(item.takenAt)}</Text>
          </View>
        </View>
        <Text style={styles.cardText}>{textPreview(item.text)}</Text>
        {item.latitude != null && item.longitude != null && (
          <PressableScale
            style={styles.locationBadge}
            onPress={() =>
              setMapPoints([{ latitude: item.latitude as number, longitude: item.longitude as number }])
            }
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Xem vị trí trên bản đồ"
          >
            <AppIcon name="location" size={12} color={colors.primaryDark} />
            <Text style={styles.locationBadgeText}>
              {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
            </Text>
          </PressableScale>
        )}
        <View style={styles.cardFooter}>
          <View style={styles.charsRow}>
            <AppIcon name="text-outline" size={12} color={colors.faint} />
            <Text style={styles.cardChars}>{item.text.length} ký tự</Text>
          </View>
          <PressableScale
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Xoá bản ghi"
          >
            <AppIcon name="trash-outline" size={13} color={colors.danger} />
            <Text style={styles.deleteBtnText}>Xoá</Text>
          </PressableScale>
        </View>
      </View>
    </FloatingCard>
  );

  return (
    <WaterScreen>
      <AppHeader
        title="Lịch sử Scan"
        subtitle={records.length > 0 ? `${records.length} kết quả đã lưu` : 'Chưa có bản ghi nào'}
        icon="time"
        right={
          records.length > 0 ? (
            <PressableScale
              style={styles.clearAllBtn}
              onPress={handleClearAll}
              accessibilityLabel="Xoá tất cả"
            >
              <AppIcon name="trash-outline" size={14} color={colors.danger} />
              <Text style={styles.clearAllText}>Xoá tất cả</Text>
            </PressableScale>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centredText}>Đang tải...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={[styles.centred, { paddingBottom: tabSpace }]}>
          <FloatingCard style={styles.emptyCard} amplitude={6}>
            <IconBubble icon="file-tray-outline" size={84} rounded="circle" gradient={gradients.primary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Chưa có lịch sử scan</Text>
            <Text style={styles.emptySub}>
              Hãy dùng tab Scan để chụp ảnh và nhận diện văn bản.
            </Text>
          </FloatingCard>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabSpace + 70 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating button: all scan locations */}
      {hasLocations && (
        <Animated.View
          style={[
            styles.fabWrap,
            { bottom: tabSpace - 4 },
            {
              opacity: fabEntrance,
              transform: [
                { scale: Animated.multiply(fabEntrance, fabPress) },
                {
                  translateY: fabEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.fabPulse,
              {
                opacity: fabPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 0],
                }),
                transform: [
                  {
                    scale: fabPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.7],
                    }),
                  },
                ],
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.fab, glowShadow]}
            activeOpacity={0.9}
            onPress={() => setMapPoints(locationPoints)}
            onPressIn={() => animateFabPress(0.92)}
            onPressOut={() => animateFabPress(1)}
            accessibilityRole="button"
            accessibilityLabel="Xem tất cả vị trí trên bản đồ"
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabFill}
            />
            <AppIcon name="map" size={25} color={colors.white} />
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{locationPoints.length}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Detail / Edit modal */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <IconBubble icon="document-text-outline" size={36} gradient={gradients.primary} />
                <Text style={styles.modalTitle}>Chi tiết scan</Text>
              </View>
              <PressableScale
                style={styles.modalClose}
                onPress={() => setSelected(null)}
                accessibilityLabel="Đóng"
              >
                <AppIcon name="close" size={18} color={colors.body} />
              </PressableScale>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {selected && (
                <>
                  <Image
                    source={{ uri: selected.imageUri }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                  <View style={styles.modalMeta}>
                    <View style={styles.modalMetaItem}>
                      <AppIcon name="calendar-outline" size={14} color={colors.primaryDark} />
                      <Text style={styles.modalMetaText}>{formatDate(selected.takenAt)}</Text>
                    </View>
                    <View style={styles.modalMetaItem}>
                      <AppIcon name="time-outline" size={14} color={colors.primaryDark} />
                      <Text style={styles.modalMetaText}>{formatTime(selected.takenAt)}</Text>
                    </View>
                  </View>
                  {selected.latitude != null && selected.longitude != null && (
                    <PressableScale
                      style={styles.modalLocationRow}
                      scaleTo={0.97}
                      onPress={() =>
                        setMapPoints([
                          {
                            latitude: selected.latitude as number,
                            longitude: selected.longitude as number,
                          },
                        ])
                      }
                    >
                      <AppIcon name="location" size={16} color={colors.primaryDark} />
                      <Text style={styles.modalLocationText}>
                        {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                      </Text>
                      <Text style={styles.modalLocationLink}>Xem bản đồ</Text>
                      <AppIcon name="chevron-forward" size={14} color={colors.primaryDark} />
                    </PressableScale>
                  )}
                  <View style={styles.modalSectionRow}>
                    <AppIcon name="create-outline" size={15} color={colors.body} />
                    <Text style={styles.modalSectionTitle}>Văn bản (có thể chỉnh sửa)</Text>
                  </View>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    textAlignVertical="top"
                    placeholder="Không có văn bản..."
                    placeholderTextColor={colors.faint}
                  />
                  <Text style={styles.modalCharCount}>{editText.length} ký tự</Text>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <GradientButton
                label="Đóng"
                variant="ghost"
                onPress={() => setSelected(null)}
                style={{ flex: 1 }}
              />
              <GradientButton
                label="Lưu chỉnh sửa"
                icon="save-outline"
                onPress={handleUpdateText}
                loading={saving}
                disabled={saving}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Map modal */}
      <Modal
        visible={mapPoints !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMapPoints(null)}
      >
        <View style={styles.mapModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMapPoints(null)} />
          <View style={styles.mapModalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <IconBubble icon="map-outline" size={36} gradient={gradients.coral} />
                <Text style={styles.modalTitle}>
                  {mapPoints && mapPoints.length > 1
                    ? `Tất cả vị trí (${mapPoints.length})`
                    : 'Vị trí trên bản đồ'}
                </Text>
              </View>
              <PressableScale
                style={styles.modalClose}
                onPress={() => setMapPoints(null)}
                accessibilityLabel="Đóng"
              >
                <AppIcon name="close" size={18} color={colors.body} />
              </PressableScale>
            </View>
            {mapPoints && (
              <View style={styles.mapFrame}>
                <WebView
                  style={styles.mapWebView}
                  originWhitelist={['*']}
                  source={{ html: buildMapHtml(mapPoints) }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginLeft: 8,
  },
  clearAllText: { color: colors.danger, fontSize: 12, fontWeight: '800' },

  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  centredText: { color: colors.body, fontSize: 14, marginTop: 8, fontWeight: '600' },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: radius.xl,
    backgroundColor: colors.glassStrong,
  },
  emptyIcon: { marginBottom: 18 },
  emptyTitle: { fontSize: 19, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  emptySub: {
    fontSize: 14,
    color: colors.body,
    textAlign: 'center',
    lineHeight: 22,
  },

  listContent: { paddingHorizontal: 16, paddingTop: 10 },
  cardWrap: { marginBottom: 14 },
  card: {
    flexDirection: 'row',
    padding: 10,
  },
  thumbnail: {
    width: 92,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    minHeight: 124,
  },
  cardContent: { flex: 1, paddingLeft: 12, paddingVertical: 2 },
  cardDateRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11,49,66,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardDate: { fontSize: 11.5, color: colors.primaryDark, fontWeight: '800' },
  cardTime: { fontSize: 11.5, color: colors.body, fontWeight: '700' },
  cardText: {
    fontSize: 13.5,
    color: colors.ink,
    lineHeight: 20,
    flex: 1,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  charsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardChars: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  locationBadgeText: { fontSize: 11, color: colors.primaryDark, fontWeight: '800' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteBtnText: { fontSize: 12, color: colors.danger, fontWeight: '800' },

  fabWrap: {
    position: 'absolute',
    right: 22,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
  },
  fabFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 30,
  },
  fabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.waterTop,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '92%',
    flex: 0,
    overflow: 'hidden',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(10,162,184,0.35)',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, flexShrink: 1 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalImage: {
    width: '100%',
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    marginBottom: 14,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  modalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalMetaText: { fontSize: 13, color: colors.primaryDeep, fontWeight: '700' },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 18,
  },
  modalLocationText: { fontSize: 13, color: colors.primaryDeep, fontWeight: '700', flex: 1 },
  modalLocationLink: { fontSize: 13, color: colors.primaryDark, fontWeight: '900' },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 18,
  },
  mapModalSheet: {
    backgroundColor: colors.waterTop,
    borderRadius: radius.xl,
    height: '72%',
    overflow: 'hidden',
  },
  mapFrame: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  mapWebView: { flex: 1 },
  modalSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.body,
  },
  modalTextInput: {
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 22,
    backgroundColor: colors.white,
  },
  modalCharCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 8,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.glassStrong,
  },
});
