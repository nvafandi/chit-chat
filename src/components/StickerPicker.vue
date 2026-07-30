<template>
  <v-dialog v-model="isOpen" max-width="500px" class="sticker-picker-dialog">
    <template #default="{ isActive }">
      <v-card class="sticker-picker-card">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Select Sticker</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="isActive.value = false"
          ></v-btn>
        </v-card-title>

        <!-- Category Tabs -->
        <v-tabs v-model="activeCategory" class="sticker-tabs">
          <v-tab 
            v-for="category in categories" 
            :key="category"
            :value="category"
          >
            {{ getCategoryIcon(category) }} {{ capitalize(category) }}
          </v-tab>
        </v-tabs>

        <v-divider></v-divider>

        <!-- Upload Section (for custom category) -->
        <v-fade-transition>
          <div v-if="activeCategory === 'custom'" class="custom-upload-section pa-4">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileSelect"
            />
            <v-btn
              color="primary"
              variant="outlined"
              block
              @click="fileInput?.click()"
              prepend-icon="mdi-image-plus"
              class="mb-3"
            >
              Upload Photo as Sticker
            </v-btn>
            <v-alert
              v-if="uploadError"
              type="error"
              closable
              class="mb-3"
              @click:close="uploadError = ''"
            >
              {{ uploadError }}
            </v-alert>
            <v-progress-linear
              v-if="isCompressing"
              indeterminate
              class="mb-3"
            />
          </div>
        </v-fade-transition>

        <!-- Stickers Grid -->
        <v-card-text class="sticker-grid-container pa-4">
          <div class="sticker-grid">
            <!-- For custom stickers with delete button -->
            <div
              v-for="sticker in currentCategoryStickers"
              :key="sticker.id"
              class="sticker-item-wrapper"
            >
              <button
                class="sticker-item"
                :title="sticker.name"
                @click="selectSticker(sticker)"
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
                <span class="sticker-name">{{ sticker.name }}</span>
              </button>
              <v-btn
                v-if="activeCategory === 'custom'"
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                class="sticker-delete-btn"
                @click.stop="handleDeleteSticker(sticker.id)"
              />
            </div>
          </div>
          <v-empty-state
            v-if="currentCategoryStickers.length === 0 && activeCategory === 'custom'"
            icon="mdi-image-off"
            title="No custom stickers"
            text="Upload a photo to create your first custom sticker!"
          />
        </v-card-text>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { 
  getStickerCategories, 
  getStickersByCategory,
  saveCustomStickerWithSync,
  deleteCustomSticker,
  type Sticker 
} from '@/utils/stickers'
import { compressImageMaximum } from '@/utils/imageCompression'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', sticker: Sticker): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()
const activeCategory = ref<string>('emotions')
const fileInput = ref<HTMLInputElement | null>(null)
const isCompressing = ref(false)
const uploadError = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const categories = computed(() => getStickerCategories())

const currentCategoryStickers = computed(() => {
  return getStickersByCategory(activeCategory.value)
})

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    emotions: '😊',
    hands: '👋',
    animals: '🐱',
    objects: '🎁',
    custom: '⭐',
  }
  return icons[category] || '🎨'
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const selectSticker = (sticker: Sticker) => {
  emit('select', sticker)
  isOpen.value = false
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) {
    return
  }

  const file = files[0]
  uploadError.value = ''

  // Validate file
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Please select an image file'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'Image size must be less than 5MB'
    return
  }

  try {
    isCompressing.value = true

    // Compress image
    const compressionResult = await compressImageMaximum(file)
    
    // Convert blob to data URL
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string
        const customSticker = await saveCustomStickerWithSync(file, dataUrl, authStore.user?.id || '')
        
        // Auto-select the new sticker
        selectSticker(customSticker)
        
        console.log('[StickerPicker] Custom sticker created:', customSticker.id)
      } catch (err) {
        uploadError.value = `Failed to save sticker: ${err instanceof Error ? err.message : 'Unknown error'}`
      }
    }
    reader.readAsDataURL(compressionResult.blob)
  } catch (err) {
    uploadError.value = `Compression error: ${err instanceof Error ? err.message : 'Unknown error'}`
    console.error('[StickerPicker] Compression error:', err)
  } finally {
    isCompressing.value = false
    // Reset input
    target.value = ''
  }
}

const handleDeleteSticker = (stickerId: string) => {
  if (confirm('Delete this custom sticker?')) {
    if (deleteCustomSticker(stickerId)) {
      console.log('[StickerPicker] Custom sticker deleted:', stickerId)
    } else {
      uploadError.value = 'Failed to delete sticker'
    }
  }
}
</script>

<style scoped>
.sticker-picker-dialog :deep(.v-overlay__content) {
  border-radius: 12px;
}

.sticker-picker-card {
  background: var(--clr-surface-a0);
  color: var(--text-primary);
}

:root.dark .sticker-picker-card {
  background: var(--clr-surface-a10);
  color: var(--text-primary);
}

.sticker-tabs {
  border-bottom: 1px solid var(--clr-surface-a20);
}

.custom-upload-section {
  border-bottom: 1px solid var(--clr-surface-a20);
}

.sticker-grid-container {
  max-height: 400px;
  overflow-y: auto;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
}

.sticker-item-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sticker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--clr-surface-a10);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 12px;
  min-height: 80px;
  width: 100%;
}

:root.dark .sticker-item {
  background: var(--clr-surface-a20);
}

.sticker-item:hover {
  border-color: var(--clr-primary-a0);
  background: var(--clr-surface-tonal-a0);
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:root.dark .sticker-item:hover {
  background: var(--clr-surface-a30);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.sticker-emoji {
  font-size: 44px;
  line-height: 1;
}

.sticker-image {
  max-width: 50px;
  max-height: 50px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
}

.sticker-name {
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  font-weight: 500;
  color: var(--text-secondary);
}

:root.dark .sticker-name {
  color: var(--clr-surface-a50);
}

.sticker-delete-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--clr-surface-a0);
  
  &:hover {
    background: var(--clr-danger-a10);
  }
}

:root.dark .sticker-delete-btn {
  background: var(--clr-surface-a20);
}
</style>
