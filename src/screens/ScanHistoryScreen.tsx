/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import AppHeader from '../components/AppHeader';
import { useFocusEffect } from '@react-navigation/native';
import { SCAN_HISTORY_KEY } from './OCRResultScreen';
import type { ScanRecord } from './OCRResultScreen';

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

  const renderItem = ({ item }: { item: ScanRecord }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetail(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.imageUri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <View style={styles.cardDateRow}>
          <View style={styles.dateChip}>
            <Text style={styles.cardDate}>📅 {formatDate(item.takenAt)}</Text>
          </View>
          <View style={styles.timeChip}>
            <Text style={styles.cardTime}>🕒 {formatTime(item.takenAt)}</Text>
          </View>
        </View>
        <Text style={styles.cardText}>{textPreview(item.text)}</Text>
        {item.latitude != null && item.longitude != null && (
          <TouchableOpacity
            style={styles.locationBadge}
            onPress={() =>
              setMapPoints([{ latitude: item.latitude as number, longitude: item.longitude as number }])
            }
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.locationBadgeText}>
              📍 {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.cardChars}>{item.text.length} ký tự</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtnText}>🗑️ Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader
        title="Lịch sử Scan"
        subtitle={records.length > 0 ? `${records.length} kết quả đã lưu` : 'Chưa có bản ghi nào'}
        right={
          records.length > 0 ? (
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
              <Text style={styles.clearAllText}>Xoá tất cả</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={styles.centredText}>Đang tải...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.centred}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>📭</Text>
          </View>
          <Text style={styles.emptyTitle}>Chưa có lịch sử scan</Text>
          <Text style={styles.emptySub}>
            Hãy dùng tab Scan để chụp ảnh và nhận diện văn bản.
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
      )}

      {/* Floating button: all scan locations */}
      {hasLocations && (
        <Animated.View
          style={[
            styles.fabWrap,
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
            style={styles.fab}
            activeOpacity={0.9}
            onPress={() => setMapPoints(locationPoints)}
            onPressIn={() => animateFabPress(0.92)}
            onPressOut={() => animateFabPress(1)}
            accessibilityRole="button"
            accessibilityLabel="Xem tất cả vị trí trên bản đồ"
          >
            <Text style={styles.fabIcon}>🗺️</Text>
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
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết scan</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
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
                    <Text style={styles.modalMetaText}>
                      📅 {formatDate(selected.takenAt)}  🕒 {formatTime(selected.takenAt)}
                    </Text>
                  </View>
                  {selected.latitude != null && selected.longitude != null && (
                    <TouchableOpacity
                      style={styles.modalLocationRow}
                      onPress={() =>
                        setMapPoints([
                          {
                            latitude: selected.latitude as number,
                            longitude: selected.longitude as number,
                          },
                        ])
                      }
                    >
                      <Text style={styles.modalLocationText}>
                        📍 {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                      </Text>
                      <Text style={styles.modalLocationLink}>Xem bản đồ ›</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.modalSectionTitle}>Văn bản (có thể chỉnh sửa)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    textAlignVertical="top"
                    placeholder="Không có văn bản..."
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.modalCharCount}>{editText.length} ký tự</Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.modalCancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, saving && { opacity: 0.6 }]}
                onPress={handleUpdateText}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalSaveText}>💾 Lưu chỉnh sửa</Text>}
              </TouchableOpacity>
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
          <View style={styles.mapModalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mapPoints && mapPoints.length > 1
                  ? `Tất cả vị trí (${mapPoints.length})`
                  : 'Vị trí trên bản đồ'}
              </Text>
              <TouchableOpacity onPress={() => setMapPoints(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {mapPoints && (
              <WebView
                style={styles.mapWebView}
                originWhitelist={['*']}
                source={{ html: buildMapHtml(mapPoints) }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  clearAllBtn: {
    backgroundColor: 'rgba(254,202,202,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(254,202,202,0.45)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 12,
  },
  clearAllText: { color: '#fecaca', fontSize: 13, fontWeight: '700' },

  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  centredText: { color: '#64748b', fontSize: 14, marginTop: 8 },
  emptyIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#1e293b' },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  listContent: { padding: 16, paddingBottom: 110 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    padding: 10,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  thumbnail: {
    width: 92,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    minHeight: 120,
  },
  cardContent: { flex: 1, paddingLeft: 12, paddingVertical: 2 },
  cardDateRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dateChip: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardDate: { fontSize: 11.5, color: '#3730a3', fontWeight: '700' },
  cardTime: { fontSize: 11.5, color: '#475569', fontWeight: '600' },
  cardText: {
    fontSize: 13.5,
    color: '#1e293b',
    lineHeight: 20,
    flex: 1,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  cardChars: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  locationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  locationBadgeText: { fontSize: 11, color: '#1d4ed8', fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteBtnText: { fontSize: 12, color: '#dc2626', fontWeight: '700' },

  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 24,
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
    backgroundColor: '#1d4ed8',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: { fontSize: 26 },
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    flex: 0,
    overflow: 'hidden',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalClose: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
    overflow: 'hidden',
  },
  modalContent: { padding: 20 },
  modalImage: {
    width: '100%',
    height: 210,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    marginBottom: 14,
  },
  modalMeta: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  modalMetaText: { fontSize: 13, color: '#3730a3', fontWeight: '600' },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dbeafe',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  modalLocationText: { fontSize: 13, color: '#1d4ed8', fontWeight: '600', flexShrink: 1 },
  modalLocationLink: { fontSize: 13, color: '#1d4ed8', fontWeight: '800', marginLeft: 8 },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  mapModalSheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    height: '72%',
    overflow: 'hidden',
  },
  mapWebView: { flex: 1 },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  modalTextInput: {
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 22,
    backgroundColor: '#f8fafc',
  },
  modalCharCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  modalSaveBtn: {
    flex: 2,
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
