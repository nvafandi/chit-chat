import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import type { Message, ChatRoom } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import {
  sendMessage,
  joinRoom,
  startLiveLocation,
  updateLiveLocation,
  stopLiveLocation as fbStopLiveLocation,
} from '@/services/firebase';
import { uploadFromUri, isImageMime } from '@/services/storage';
import {
  loadEnabledFlag,
  ensureAndroidChannel,
  setNotificationUserId,
  startMessageNotifier,
  requestPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
} from '@/services/notificationService';
import { DEFAULT_ROOM_ID } from '@/utils/const';
import LiveLocationBubble from '@/components/LiveLocationBubble';
import StickerView from '@/components/StickerView';
import StickerPicker from '@/components/StickerPicker';
import { formatAsSticker, isStickerMessage, type Sticker as StickerItem } from '@/utils/stickers';

interface PendingFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  isImage: boolean;
}

export default function ChatScreen() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const {
    messages,
    users,
    rooms,
    currentRoomId,
    isLoading,
    isLoadingMore,
    hasMore,
    setCurrentRoom,
    loadMore,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [showChannels, setShowChannels] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Notification setup: permission, Android channel, Firestore bridge
  useEffect(() => {
    if (!user) return;
    setNotificationUserId(user.id);
    (async () => {
      await loadEnabledFlag();
      setNotifEnabled(isNotificationsEnabled());
      if (isNotificationsEnabled()) {
        await requestPermission();
      }
      await ensureAndroidChannel();
    })();
    const stopNotifier = startMessageNotifier();
    return () => {
      stopNotifier();
      setNotificationUserId(null);
    };
  }, [user]);
  const liveMsgIdRef = useRef<string | null>(null);
  const locSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocUpdateRef = useRef(0);
  const listRef = useRef<FlatList<Message>>(null);

  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const currentRoomName =
    currentRoom?.name ?? (currentRoomId === DEFAULT_ROOM_ID ? 'General' : currentRoomId);

  async function handleSend() {
    const content = input.trim();
    if ((!content && pendingFiles.length === 0) || !user || isUploading) return;

    let attachments;
    let files = pendingFiles;
    if (files.length > 0) {
      try {
        setIsUploading(true);
        const uploaded = await Promise.all(
          files.map(async (f) => {
            const { url, size } = await uploadFromUri(f.uri, f.name, f.mimeType ?? '', f.isImage);
            return {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              url,
              type: (f.isImage ? 'image' : 'file') as 'image' | 'file',
              mimeType: f.isImage ? 'image/jpeg' : f.mimeType ?? 'application/octet-stream',
              name: f.name,
              size,
            };
          })
        );
        attachments = uploaded;
      } catch (e) {
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setPendingFiles([]);
    }

    setInput('');
    await sendMessage(
      user.id,
      user.username,
      user.animal,
      content || `📎 ${files[0]?.name ?? 'Attachment'}`,
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      undefined,
      attachments,
      undefined,
      currentRoomId
    );
  }

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
        });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setPendingFiles((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
        isImage: true,
      },
    ]);
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPendingFiles((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        isImage: isImageMime(asset.mimeType),
      },
    ]);
  }

  // ============================================================================
  // LIVE LOCATION
  // ============================================================================

  useEffect(() => {
    return () => {
      locSubRef.current?.remove();
    };
  }, []);

  async function toggleLive() {
    if (isLiveTracking) {
      await stopLiveTracking();
    } else {
      await startLiveTracking();
    }
  }

  async function startLiveTracking() {
    if (!user) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin lokasi', 'Izin akses lokasi ditolak. Aktifkan di pengaturan.');
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const sent = await sendMessage(
        user.id,
        user.username,
        user.animal,
        '📍 Live Location',
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined,
        { latitude: lat, longitude: lng },
        currentRoomId,
        true
      );

      await startLiveLocation(
        sent.id,
        currentRoomId ?? DEFAULT_ROOM_ID,
        user.id,
        user.username,
        user.animal,
        lat,
        lng
      );

      liveMsgIdRef.current = sent.id;
      lastLocUpdateRef.current = Date.now();
      setIsLiveTracking(true);

      locSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (p) => {
          const now = Date.now();
          if (now - lastLocUpdateRef.current < 10_000 || !liveMsgIdRef.current) return;
          lastLocUpdateRef.current = now;
          updateLiveLocation(
            liveMsgIdRef.current!,
            p.coords.latitude,
            p.coords.longitude
          ).catch(() => {});
        }
      );
    } catch (e) {
      console.warn('[Chat] live location start failed:', e);
      Alert.alert('Live Location', 'Gagal memulai live location.');
    }
  }

  async function stopLiveTracking() {
    locSubRef.current?.remove();
    locSubRef.current = null;
    if (liveMsgIdRef.current) {
      try {
        await fbStopLiveLocation(liveMsgIdRef.current);
      } catch {}
    }
    liveMsgIdRef.current = null;
    setIsLiveTracking(false);
  }

  function renderMessage({ item }: { item: Message }) {
    const isOwn = item.userId === user.id;
    if (isStickerMessage(item.content) || item.stickerData) {
      return (
        <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
          {renderSticker(item)}
        </View>
      );
    }
    const hasAttachments =
      !!item.attachments?.length || !!item.imageUrl || !!item.fileUrl;
    return (
      <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
        {!isOwn && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.animal ?? '🐾'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!isOwn && (
            <Text style={styles.author}>
              {item.animal} {item.username}
            </Text>
          )}
          {item.isLiveLocation && item.location && (
            <LiveLocationBubble message={item} />
          )}
          {renderAttachments(item)}
          {!!item.content &&
            !(hasAttachments && !item.content.startsWith('📎')) && (
              <Text style={[styles.content, hasAttachments && styles.caption]}>
                {item.content}
              </Text>
            )}
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  }

  function renderSticker(item: Message) {
    const isOwn = item.userId === user.id;
    return (
      <View style={[styles.stickerWrap, isOwn && { alignItems: 'flex-end' }]}>
        {!isOwn && (
          <Text style={styles.stickerAuthor}>
            {item.animal} {item.username}
          </Text>
        )}
        <StickerView message={item} />
      </View>
    );
  }

  function handleSelectSticker(sticker: StickerItem) {
    if (!user) return;
    setShowStickers(false);
    sendMessage(
      user.id,
      user.username,
      user.animal,
      formatAsSticker(sticker.id),
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      { id: sticker.id, type: sticker.type, content: sticker.content, name: sticker.name },
      undefined, undefined,
      currentRoomId
    ).catch(() => {});
  }

  function renderAttachments(item: Message) {
    const list =
      item.attachments ??
      [
        item.imageUrl
          ? { url: item.imageUrl, type: 'image', name: item.imageName ?? 'image', size: item.imageSize ?? 0 }
          : null,
        item.fileUrl
          ? { url: item.fileUrl, type: 'file', name: item.fileName ?? 'file', size: item.fileSize ?? 0 }
          : null,
      ].filter(Boolean);

    if (!list.length) return null;

    return (
      <View style={{ gap: 6 }}>
        {list.map((att: any, i: number) =>
          att.type === 'image' ? (
            <TouchableOpacity key={i} onPress={() => setViewerUrl(att.url)}>
              <Image source={{ uri: att.url }} style={styles.attImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={i}
              style={styles.attFile}
              onPress={() => Linking.openURL(att.url)}
            >
              <Text style={styles.attFileIcon}>📄</Text>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.attFileName} numberOfLines={1}>
                  {att.name}
                </Text>
                {!!att.size && <Text style={styles.attFileSize}>{formatSize(att.size)}</Text>}
              </View>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  }

  function handleSelectRoom(room: ChatRoom) {
    setShowChannels(false);
    if (room.id === currentRoomId) return;
    if (room.type === 'room') {
      joinRoom(room.id, { id: user.id, username: user.username, animal: user.animal }).catch(
        () => {}
      );
    }
    setCurrentRoom(room.id);
  }

  function renderHeader() {
    if (!hasMore && messages.length > 0) {
      return <Text style={styles.listEdge}>— Awal percakapan —</Text>;
    }
    if (isLoadingMore) {
      return <ActivityIndicator style={{ marginVertical: 10 }} color="#9358ff" />;
    }
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.channelBtn}
          onPress={() => setShowChannels(true)}
          hitSlop={8}
        >
          <Text style={styles.channelIcon}>☰</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            # {currentRoomName}
            {currentRoom?.type === 'group' ? ' 🔒' : ''}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerSub}>{users.length} users</Text>
        <TouchableOpacity
          onPress={async () => {
            const next = !notifEnabled;
            setNotifEnabled(next);
            await setNotificationsEnabled(next);
            if (next) await requestPermission();
          }}
          hitSlop={10}
          style={{ marginRight: 12 }}
        >
          <Text style={{ fontSize: 16 }}>{notifEnabled ? '🔔' : '🔕'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} hitSlop={12}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading && messages.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#641efd" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={(e) => {
            if (e.nativeEvent.contentOffset.y < 80) loadMore();
          }}
          scrollEventThrottle={200}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Belum ada pesan. Mulai percakapan!</Text>
            </View>
          }
        />
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <View style={styles.previewRow}>
          {pendingFiles.map((f, i) => (
            <View key={i} style={styles.previewChip}>
              {f.isImage ? (
                <Image source={{ uri: f.uri }} style={styles.previewThumb} />
              ) : (
                <Text style={{ fontSize: 22 }}>📄</Text>
              )}
              <TouchableOpacity
                style={styles.previewRemove}
                onPress={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {isUploading && (
        <Text style={styles.uploading}>Mengunggah...</Text>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setAttachMenu(true)}
          disabled={isUploading}
        >
          <Text style={{ fontSize: 20 }}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attachBtn, isLiveTracking && styles.liveActive]}
          onPress={toggleLive}
          disabled={isUploading}
        >
          <Text style={{ fontSize: 18 }}>{isLiveTracking ? '⏹️' : '🎯'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setShowStickers(true)}
          disabled={isUploading}
        >
          <Text style={{ fontSize: 20 }}>😊</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Ketik pesan..."
          placeholderTextColor="#717171"
          multiline
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Attach menu */}
      <Modal visible={attachMenu} transparent animationType="fade" onRequestClose={() => setAttachMenu(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAttachMenu(false)}>
          <View style={[styles.modalSheet, { maxHeight: undefined }]}>
            <Text style={[styles.modalTitle, { textTransform: 'none', letterSpacing: 0 }]}>Lampirkan</Text>
            <TouchableOpacity style={styles.roomItem} onPress={() => { setAttachMenu(false); pickImage(false); }}>
              <Text style={{ fontSize: 18 }}>🖼️</Text>
              <Text style={styles.roomName}>Foto dari galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roomItem} onPress={() => { setAttachMenu(false); pickImage(true); }}>
              <Text style={{ fontSize: 18 }}>📷</Text>
              <Text style={styles.roomName}>Ambil foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roomItem} onPress={() => { setAttachMenu(false); pickDocument(); }}>
              <Text style={{ fontSize: 18 }}>📄</Text>
              <Text style={styles.roomName}>Dokumen</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen image viewer */}
      <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUrl(null)} hitSlop={12}>
            <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
          {!!viewerUrl && (
            <Image source={{ uri: viewerUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Sticker picker */}
      <StickerPicker
        visible={showStickers}
        onClose={() => setShowStickers(false)}
        onSelect={handleSelectSticker}
      />

      {/* Channel Picker */}
      <Modal visible={showChannels} transparent animationType="slide" onRequestClose={() => setShowChannels(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowChannels(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Channels</Text>
            <FlatList
              data={rooms.length > 0 ? rooms : [{ id: DEFAULT_ROOM_ID, name: 'General', type: 'room' } as ChatRoom]}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.roomItem, item.id === currentRoomId && styles.roomItemActive]}
                  onPress={() => handleSelectRoom(item)}
                >
                  <Text style={styles.roomHash}>#</Text>
                  <Text
                    style={[styles.roomName, item.id === currentRoomId && styles.roomNameActive]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.type === 'group' && <Text style={styles.roomLock}>🔒</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 32 : 56,
    paddingBottom: 12,
    backgroundColor: '#1d1626',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#322b3a',
  },
  channelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  channelIcon: {
    color: '#c79fff',
    fontSize: 18,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  headerSub: {
    color: '#8b8b8b',
    fontSize: 12,
    marginRight: 14,
  },
  logout: {
    color: '#9358ff',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  listEdge: {
    textAlign: 'center',
    color: '#575757',
    fontSize: 11,
    paddingVertical: 8,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowOwn: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#322b3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: {
    backgroundColor: '#1d1626',
    borderTopLeftRadius: 4,
  },
  bubbleOwn: {
    backgroundColor: '#641efd',
    borderBottomRightRadius: 4,
  },
  author: {
    color: '#c79fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  content: {
    color: '#f2f2f2',
    fontSize: 15,
    lineHeight: 20,
  },
  caption: {
    marginTop: 4,
  },
  attImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#322b3a',
  },
  attFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 220,
  },
  attFileIcon: {
    fontSize: 20,
  },
  attFileName: {
    color: '#f2f2f2',
    fontSize: 13,
    fontWeight: '600',
  },
  attFileSize: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#1d1626',
  },
  previewChip: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#322b3a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
  },
  previewRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploading: {
    color: '#9358ff',
    fontSize: 12,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveActive: {
    backgroundColor: 'rgba(76,175,80,0.25)',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  stickerWrap: {
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  stickerAuthor: {
    color: '#8b8b8b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 4,
  },
  time: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    backgroundColor: '#1d1626',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#322b3a',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: '#322b3a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#641efd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#717171',
    fontSize: 14,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerClose: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 64,
    right: 20,
    zIndex: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: '#1d1626',
    borderRadius: 16,
    maxHeight: '65%',
    paddingTop: 18,
    paddingBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#322b3a',
  },
  modalTitle: {
    color: '#8b8b8b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  roomItemActive: {
    backgroundColor: '#322b3a',
  },
  roomHash: {
    color: '#717171',
    fontSize: 16,
    fontWeight: '700',
  },
  roomName: {
    color: '#b6b6b6',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  roomNameActive: {
    color: '#fff',
  },
  roomLock: {
    fontSize: 12,
  },
});
