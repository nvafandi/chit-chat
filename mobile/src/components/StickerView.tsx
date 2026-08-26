import React, { useEffect, useState } from 'react';
import { Text, Image, StyleSheet } from 'react-native';
import type { Message } from '@/types';
import {
  isStickerMessage,
  extractStickerId,
  getBuiltinStickerById,
  fetchCustomStickerFromFirestore,
  type Sticker,
} from '@/utils/stickers';

interface Props {
  message: Message;
}

/**
 * Renders a sticker message as a large emoji or image (no bubble chrome).
 */
export default function StickerView({ message }: Props) {
  const [resolved, setResolved] = useState<Sticker | null>(null);

  useEffect(() => {
    // 1) Inline stickerData wins
    if (message.stickerData?.content) {
      setResolved({
        id: message.stickerData.id,
        name: message.stickerData.name,
        type: message.stickerData.type,
        content: message.stickerData.content,
        category: 'inline',
      });
      return;
    }

    if (!isStickerMessage(message.content)) return;
    const id = extractStickerId(message.content);
    if (!id) return;

    // 2) Built-in lookup
    const builtin = getBuiltinStickerById(id);
    if (builtin) {
      setResolved(builtin);
      return;
    }

    // 3) Custom sticker shared via Firestore
    let cancelled = false;
    fetchCustomStickerFromFirestore(id).then((s) => {
      if (!cancelled && s) setResolved(s);
    });
    return () => {
      cancelled = true;
    };
  }, [message.id, message.stickerData, message.content]);

  if (!resolved) {
    return <Text style={styles.fallback}>🙂</Text>;
  }

  if (resolved.type === 'image') {
    return <Image source={{ uri: resolved.content }} style={styles.image} resizeMode="contain" />;
  }

  return <Text style={styles.emoji}>{resolved.content}</Text>;
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 64,
    lineHeight: 76,
  },
  image: {
    width: 140,
    height: 140,
  },
  fallback: {
    fontSize: 40,
  },
});
