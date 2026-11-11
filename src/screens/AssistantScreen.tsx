/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import AppHeader from '../components/AppHeader';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {getStorageValue} from '../storage/storage';
import axios from 'axios';
import { SERVER_URL } from '@env';
import RNFS from 'react-native-fs';
import WaterScreen from '../components/water/WaterScreen';
import FloatingCard from '../components/water/FloatingCard';
import IconBubble from '../components/ui/IconBubble';
import PressableScale from '../components/ui/PressableScale';
import AppIcon from '../components/ui/AppIcon';
import { useTabBarSpace } from '../navigation/FloatingTabBar';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { colors, floatShadow, glowShadow, gradients, radius, softShadow } from '../theme/theme';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  imageUri?: string;
  type?: 'text' | 'image';
};

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 150),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={typingStyles.row}>
      <IconBubble icon="water" size={30} rounded="circle" style={typingStyles.avatar} />
      <View style={typingStyles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[typingStyles.dot, { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
          />
        ))}
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  avatar: { marginRight: 8, marginBottom: 2 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 15,
    ...floatShadow,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 3,
  },
});

function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const loadUserName = async () => {
      const userName = (await getStorageValue('@user_name')) || 'bạn';
      console.log('AssistantScreen: Loaded userName from storage:', userName);
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: `Xin chào ${userName} ! Tôi là trợ lý quan trắc nước. Nhập câu hỏi hoặc gửi ảnh để tôi hỗ trợ bạn.`,
        },
      ]);
    };
    loadUserName();
  }, []);
  const [inputText, setInputText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const animationValue = React.useRef(new Animated.Value(0)).current;
  const tabSpace = useTabBarSpace();
  const keyboardVisible = useKeyboardVisible();

  const openMediaOptions = () => {
    animationValue.setValue(0);
    setIsModalVisible(true);
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMediaOptions = () => {
    Animated.timing(animationValue, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
    });
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedImageUri) {
      return;
    }

    addMessage({
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed || undefined,
      imageUri: attachedImageUri || undefined,
      type: attachedImageUri ? 'image' : 'text',
    });

    const currentImage = attachedImageUri;
    setInputText('');
    setAttachedImageUri(null);
    setIsBotTyping(true);

    try {
      // Convert image to base64 if present
      let imageBase64: string | undefined;
      if (currentImage) {
        const cleanPath = currentImage.replace('file://', '');
        imageBase64 = await RNFS.readFile(cleanPath, 'base64');
      }

      const body: { message: string; image_url?: string } = {
        message: trimmed || '',
      };
      if (imageBase64) {
        body.image_url = `data:image/jpeg;base64,${imageBase64}`;
      }

      console.log('AssistantScreen: Sending request to', `${SERVER_URL}/chat`);
      const { data } = await axios.post<{ reply: string }>(
        `${SERVER_URL}/chat`,
        body,
        { headers: { 'Content-Type': 'application/json' }, timeout: 120000 },
      );
      console.log('AssistantScreen: Received response', data);

      const replyText = data.reply ?? 'Tôi không hiểu yêu cầu của bạn.';

      addMessage({
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        type: 'text',
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('AssistantScreen: Request failed -', error.code, error.message, error.response?.status, error.response?.data);
      } else {
        console.log('AssistantScreen: Error:', error);
      }
      addMessage({
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'Xin lỗi, không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
        type: 'text',
      });
    } finally {
      setIsBotTyping(false);
    }
  };

  const requestAndroidPermission = async (type: 'gallery' | 'camera'): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    if (type === 'camera') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Quyền truy cập Camera',
          message: 'Ứng dụng cần quyền truy cập camera để chụp ảnh mẫu nước.',
          buttonPositive: 'Đồng ý',
          buttonNegative: 'Từ chối',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const permission =
        parseInt(String(Platform.Version), 10) >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const result = await PermissionsAndroid.request(permission, {
        title: 'Quyền truy cập Thư viện',
        message: 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh mẫu nước.',
        buttonPositive: 'Đồng ý',
        buttonNegative: 'Từ chối',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  };

  const handleMediaOption = async (type: 'gallery' | 'camera') => {
    closeMediaOptions();

    const granted = await requestAndroidPermission(type);
    if (!granted) {
      return;
    }

    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      includeBase64: false,
      saveToPhotos: false,
    };

    const response =
      type === 'gallery'
        ? await launchImageLibrary(options)
        : await launchCamera({ ...options, cameraType: 'back' });

    if (response.didCancel || response.errorCode) {
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) {
      return;
    }

    setAttachedImageUri(asset.uri);
  };

  const canSend = inputText.trim().length > 0 || !!attachedImageUri;

  return (
    <WaterScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppHeader
          title="Trợ lý AI"
          subtitle="Hỏi đáp về chất lượng nước"
          icon="chatbubbles"
          right={
            <View style={styles.onlineChip}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>AI</Text>
            </View>
          }
        />
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.flatList}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isBotTyping ? <TypingIndicator /> : null}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            const imageOnly = !!item.imageUri && !item.text;
            return (
              <Reanimated.View
                entering={FadeInUp.duration(320)}
                style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}
              >
                {!isUser && (
                  <IconBubble icon="water" size={30} rounded="circle" style={styles.avatar} />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.botBubble,
                    imageOnly ? styles.imageBubble : undefined,
                  ]}
                >
                  {isUser && (
                    <LinearGradient
                      colors={gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, styles.userBubbleFill]}
                    />
                  )}
                  {item.imageUri && (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  )}
                  {item.text && (
                    <Text
                      style={[
                        styles.messageText,
                        isUser && styles.userText,
                        item.imageUri ? styles.textBelowImage : undefined,
                      ]}
                    >
                      {item.text}
                    </Text>
                  )}
                </View>
              </Reanimated.View>
            );
          }}
        />

        <FloatingCard
          enter={false}
          amplitude={1.5}
          float={!keyboardVisible}
          containerStyle={[
            styles.inputBarWrap,
            // Clears the tab bar plus the raised Scan button above it.
            { marginBottom: keyboardVisible ? 8 : tabSpace + 14 },
          ]}
          style={styles.inputBar}
        >
          {attachedImageUri && (
            <View style={styles.attachmentPreview}>
              <Image
                source={{ uri: attachedImageUri }}
                style={styles.attachmentThumb}
                resizeMode="cover"
              />
              <PressableScale
                style={styles.attachmentRemove}
                onPress={() => setAttachedImageUri(null)}
                accessibilityLabel="Bỏ ảnh đính kèm"
                hitSlop={8}
              >
                <AppIcon name="close" size={13} color={colors.white} />
              </PressableScale>
            </View>
          )}
          <View style={styles.inputRow}>
            <PressableScale
              style={styles.plusButton}
              onPress={openMediaOptions}
              accessibilityLabel="Đính kèm ảnh"
            >
              <AppIcon name="add" size={26} color={colors.primaryDark} />
            </PressableScale>

            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhập tin nhắn của bạn"
              placeholderTextColor={colors.faint}
              style={styles.textInput}
              multiline
            />

            <PressableScale
              style={[styles.sendButton, canSend ? glowShadow : null, !canSend && styles.sendButtonIdle]}
              onPress={handleSend}
              scaleTo={0.88}
              accessibilityLabel="Gửi"
            >
              {canSend && (
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, styles.sendFill]}
                />
              )}
              <AppIcon name="send" size={19} color={canSend ? colors.white : colors.faint} />
            </PressableScale>
          </View>
        </FloatingCard>

        <Modal
          visible={isModalVisible}
          transparent
          animationType="none"
          onRequestClose={closeMediaOptions}
        >
          <Pressable style={styles.modalOverlay} onPress={closeMediaOptions}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  opacity: animationValue,
                  transform: [
                    {
                      translateY: animationValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [280, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Chọn nguồn ảnh</Text>
              <PressableScale
                style={[styles.modalOption, softShadow]}
                scaleTo={0.97}
                onPress={() => handleMediaOption('gallery')}
              >
                <IconBubble icon="images-outline" size={44} gradient={gradients.primary} />
                <Text style={styles.modalOptionText}>Chọn từ thư viện</Text>
                <AppIcon name="chevron-forward" size={18} color={colors.faint} />
              </PressableScale>
              <PressableScale
                style={[styles.modalOption, softShadow]}
                scaleTo={0.97}
                onPress={() => handleMediaOption('camera')}
              >
                <IconBubble icon="camera-outline" size={44} gradient={gradients.coral} />
                <Text style={styles.modalOptionText}>Chụp ảnh</Text>
                <AppIcon name="chevron-forward" size={18} color={colors.faint} />
              </PressableScale>
            </Animated.View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </WaterScreen>
  );
}

const styles = StyleSheet.create({
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { fontSize: 11.5, fontWeight: '900', color: colors.success },
  flatList: {
    flex: 1,
  },
  chatContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  avatar: { marginRight: 8, marginBottom: 2 },
  messageBubble: {
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    maxWidth: '80%',
    ...floatShadow,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  userBubbleFill: {
    borderRadius: 22,
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  userText: {
    color: colors.white,
  },
  imageBubble: {
    padding: 4,
  },
  textBelowImage: {
    marginTop: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 18,
  },
  inputBarWrap: {
    marginHorizontal: 14,
  },
  inputBar: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 28,
    backgroundColor: colors.glassStrong,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 4,
    marginBottom: 8,
  },
  attachmentThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  attachmentRemove: {
    position: 'absolute',
    top: -6,
    left: 52,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: colors.inputBg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: colors.ink,
  },
  sendButton: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonIdle: {
    backgroundColor: 'rgba(11,49,66,0.06)',
  },
  sendFill: { borderRadius: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.waterTop,
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(10,162,184,0.35)',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 14,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 12,
  },
  modalOptionText: {
    flex: 1,
    color: colors.ink,
    fontSize: 15.5,
    fontWeight: '700',
    marginLeft: 14,
  },
});

export default AssistantScreen;
