<template>
  <div class="sticker-message-container">
    <div 
      v-if="sticker" 
      class="sticker-display"
      :title="`Sticker: ${sticker.name}`"
    >
      <span v-if="sticker.type === 'emoji'" class="sticker-emoji">
        {{ sticker.content }}
      </span>
      <img 
        v-else-if="sticker.type === 'image'" 
        :src="sticker.content"
        :alt="sticker.name"
        class="sticker-image"
      />
    </div>
    <div v-else-if="isLoading" class="sticker-loading">
      <v-progress-circular indeterminate size="40" color="primary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { getStickerById, extractStickerId, fetchCustomStickerFromFirestore } from '@/utils/stickers'
import type { Sticker } from '@/utils/stickers'

interface Props {
  content: string
  // Optional: sticker data embedded in message (new approach)
  stickerData?: {
    id: string
    type: 'emoji' | 'image'
    content: string
    name: string
  }
}

const props = defineProps<Props>()

const sticker = ref<Sticker | null>(null)
const isLoading = ref(false)

const stickerId = computed(() => {
  return extractStickerId(props.content)
})

// Function to fetch and set sticker
async function loadSticker() {
  // Priority 1: Use embedded sticker data from message (fastest, most reliable)
  if (props.stickerData) {
    console.log('[StickerMessage] Using embedded sticker data from message:', props.stickerData.id)
    sticker.value = props.stickerData as Sticker
    isLoading.value = false
    return
  }

  if (!stickerId.value) return
  
  // Priority 2: Check if sticker exists locally (built-in or custom)
  const localSticker = getStickerById(stickerId.value)
  if (localSticker) {
    console.log('[StickerMessage] Sticker found locally:', stickerId.value)
    sticker.value = localSticker
    isLoading.value = false
    return
  }
  
  // Priority 3: Fetch from Firestore for older messages
  if (stickerId.value.startsWith('custom_')) {
    console.log('[StickerMessage] Fetching custom sticker from Firestore:', stickerId.value)
    isLoading.value = true
    try {
      const firestoreSticker = await fetchCustomStickerFromFirestore(stickerId.value)
      if (firestoreSticker) {
        console.log('[StickerMessage] Sticker loaded from Firestore:', stickerId.value)
        sticker.value = firestoreSticker
      } else {
        console.warn('[StickerMessage] Sticker not found in Firestore:', stickerId.value)
      }
    } catch (err) {
      console.error('[StickerMessage] Error fetching sticker:', err)
    } finally {
      isLoading.value = false
    }
  }
}

// Load on mount
onMounted(() => {
  loadSticker()
})

// Watch for changes
watch([() => props.content, () => props.stickerData], () => {
  sticker.value = null
  loadSticker()
})
</script>

<style scoped>
.sticker-message-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.sticker-display {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sticker-emoji {
  font-size: 80px;
  line-height: 1;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sticker-display:hover .sticker-emoji {
  transform: scale(1.1) rotate(5deg);
}

.sticker-image {
  max-width: 150px;
  max-height: 150px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sticker-display:hover .sticker-image {
  transform: scale(1.08);
}

.sticker-error {
  color: var(--clr-danger-a10);
  font-size: 12px;
  margin: 0;
}

.sticker-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
</style>
