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
} from 'react-native';
import type { Message } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { sendMessage } from '@/services/firebase';

export default function ChatScreen() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const { messages, users, currentRoomId, isLoading, setCurrentRoom } = useChatStore();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      // Keep the newest message visible
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  async function handleSend() {
    const content = input.trim();
    if (!content || !user) return;
    setInput('');
    await sendMessage(
      user.id,
      user.username,
      user.animal,
      content,
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined,
      currentRoomId
    );
  }

  function renderMessage({ item }: { item: Message }) {
    const isOwn = item.userId === user.id;
    return (
      <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
        {!isOwn && <View style={styles.avatar}><Text style={styles.avatarText}>{item.animal ?? '🐾'}</Text></View>}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!isOwn && <Text style={styles.author}>{item.animal} {item.username}</Text>}
          <Text style={styles.content}>{item.content}</Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}># general</Text>
        <Text style={styles.headerSub}>{users.length} online</Text>
        <TouchableOpacity onPress={logout} hitSlop={12}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isLoading && messages.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Memuat pesan...</Text></View>
      ) : (
        <FlatList
          ref={listRef}
          data={[...messages].sort((a, b) => a.timestamp - b.timestamp)}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Belum ada pesan. Mulai percakapan!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
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
    </KeyboardAvoidingView>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
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
});
