<template>
  <teleport to="body">
    <div
      v-if="shown && (filteredUsers.length > 0 || hasAll)"
      class="mention-dropdown"
      :style="{
        position: 'fixed',
        top: dropdownPosition.top + 'px',
        left: dropdownPosition.left + 'px',
        zIndex: 99999,
      }"
    >
      <div class="mention-item mention-all" @click="selectMention('all')">
        <span class="mention-avatar">👥</span>
        <span class="mention-text">@all</span>
      </div>

      <div v-if="filteredUsers.length > 0 && hasAll" class="mention-divider"></div>

      <div
        v-for="user in filteredUsers"
        :key="user.id"
        class="mention-item"
        @click="selectMention(user.username)"
      >
        <span class="mention-avatar">{{ user.animal }}</span>
        <span class="mention-text">@{{ user.username }}</span>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { User } from '@/types'
import { getLastMentionBeingTyped } from '@/utils/mentionFormatter'

interface Props {
  text: string
  cursorPosition: number
  users: User[]
  currentUserId?: string
}

interface Emits {
  (e: 'select', username: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const shown = ref(false)
const dropdownPosition = ref({ top: 0, left: 0 })

const mentionData = computed(() => {
  return getLastMentionBeingTyped(props.text, props.cursorPosition)
})

const shouldShow = computed(() => {
  return mentionData.value !== null
})

watch(shouldShow, async (val) => {
  shown.value = val
  if (val) {
    await nextTick()
    positionDropdown()
  }
})

watch(() => props.text, () => {
  if (shown.value) {
    positionDropdown()
  }
})

const hasAll = computed(() => {
  if (!mentionData.value) return false
  return 'all'.startsWith(mentionData.value.mention.toLowerCase())
})

const filteredUsers = computed(() => {
  if (!mentionData.value) return []

  const query = mentionData.value.mention.toLowerCase()
  return props.users
    .filter(
      (user) =>
        user.id !== props.currentUserId &&
        user.username.toLowerCase().startsWith(query),
    )
    .slice(0, 5)
})

function positionDropdown() {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement
  if (!textarea) return

  const rect = textarea.getBoundingClientRect()
  const scrollTop = window.scrollY
  
  // Calculate actual dropdown height based on filtered items
  const itemCount = filteredUsers.value.length + (hasAll.value ? 1 : 0)
  const itemHeight = itemCount * 48 // 48px per item
  const containerPadding = 16 // 8px top + 8px bottom
  const dividerHeight = filteredUsers.value.length > 0 && hasAll.value ? 1 : 0
  const totalHeight = itemHeight + containerPadding + dividerHeight
  
  // Position dropdown above textarea with consistent bottom position
  // Add 20px gap to avoid covering textarea
  const topPosition = rect.top + scrollTop - totalHeight - 20
  
  dropdownPosition.value = {
    top: topPosition,
    left: rect.left + window.scrollX,
  }
}

// Reposition dropdown when filtered items change
watch([filteredUsers, hasAll], () => {
  if (shown.value) {
    positionDropdown()
  }
})

function selectMention(username: string) {
  emit('select', username)
  shown.value = false
}
</script>

<style scoped>
.mention-dropdown {
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.15);
  width: 240px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
  position: relative;
  z-index: 99999;
}

.mention-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;
}

.mention-item:hover {
  background-color: #1976d2;
}

.mention-item:hover .mention-avatar,
.mention-item:hover .mention-text {
  color: white;
}

.mention-avatar {
  font-size: 1.3em;
  margin-right: 12px;
  min-width: 28px;
  text-align: center;
  transition: color 0.2s ease;
}

.mention-text {
  color: #111;
  font-weight: 500;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.mention-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}

.mention-all {
  margin-bottom: 4px;
}

.mention-all:hover {
  background-color: #ff9800;
}
</style>
