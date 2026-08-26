import React, { useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { getStickerCategories, getStickersByCategory, type Sticker } from '@/utils/stickers';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  emotions: '😀',
  hands: '👍',
  animals: '🐶',
  objects: '🎉',
};

export default function StickerPicker({ visible, onClose, onSelect }: Props) {
  const [category, setCategory] = useState(getStickerCategories()[0]);
  const stickers = getStickersByCategory(category);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Categories */}
        <View style={styles.catRow}>
          {getStickerCategories().map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catBtn, c === category && styles.catActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={styles.catIcon}>{CATEGORY_LABELS[c] ?? c}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <FlatList
          data={stickers}
          numColumns={5}
          keyExtractor={(s) => s.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cell} onPress={() => onSelect(item)}>
              <Text style={styles.emoji}>{item.content}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1d1626',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 24,
    maxHeight: '45%',
    borderWidth: 1,
    borderColor: '#322b3a',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  catBtn: {
    width: 42,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catActive: {
    backgroundColor: '#641efd',
  },
  catIcon: {
    fontSize: 20,
  },
  close: {
    color: '#8b8b8b',
    fontSize: 16,
    paddingHorizontal: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  emoji: {
    fontSize: 34,
  },
});
