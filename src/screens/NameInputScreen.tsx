import React, { useState, useEffect } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/RootStack';
import { getStorageValue, setStorageValue } from '../storage/storage';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import GradientButton from '../components/ui/GradientButton';
import AppIcon from '../components/ui/AppIcon';
import { colors, gradients, radius } from '../theme/theme';

const STORAGE_KEY = '@user_name';

type NameInputNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NameInput'>;

function NameInputScreen() {
  const navigation = useNavigation<NameInputNavigationProp>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    async function loadName() {
      try {
        const storedName = await getStorageValue(STORAGE_KEY);
        if (storedName) {
          navigation.replace('MainTabs');
        }
      } catch (error) {
        console.warn('Lỗi khi đọc tên người dùng', error);
      } finally {
        setLoading(false);
      }
    }

    loadName();
  }, [navigation]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Tên bắt buộc', 'Vui lòng nhập tên của bạn để tiếp tục.');
      return;
    }

    try {
      await setStorageValue(STORAGE_KEY, trimmedName);
      navigation.replace('MainTabs');
    } catch (error) {
      console.warn('Lỗi khi lưu tên', error);
      Alert.alert('Lỗi', 'Không thể lưu tên. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <WaterScreen style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang chuẩn bị...</Text>
      </WaterScreen>
    );
  }

  return (
    <WaterScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FloatingCard style={styles.card} amplitude={5}>
            <IconBubble icon="water" size={64} rounded="circle" gradient={gradients.primary} style={styles.logo} />
            <Text style={styles.eyebrow}>Chào mừng bạn 👋</Text>
            <Text style={styles.title}>Nhập tên của bạn</Text>
            <Text style={styles.subtitle}>
              Tên này sẽ được lưu lại để cá nhân hóa trải nghiệm của bạn.
            </Text>
            <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
              <AppIcon name="person-outline" size={20} color={focused ? colors.primary : colors.muted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tên của bạn"
                placeholderTextColor={colors.faint}
                style={styles.input}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
            <GradientButton label="Lưu và tiếp tục" icon="arrow-forward" onPress={handleSave} />
          </FloatingCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 22, flexGrow: 1, justifyContent: 'center' },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: colors.body, fontSize: 16, fontWeight: '600' },
  card: {
    padding: 26,
    borderRadius: radius.xl,
    backgroundColor: colors.glassStrong,
  },
  logo: { alignSelf: 'center', marginBottom: 18 },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink, marginBottom: 10, textAlign: 'center' },
  subtitle: { color: colors.body, fontSize: 15, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    marginLeft: 10,
    paddingVertical: 0,
  },
});

export default NameInputScreen;
