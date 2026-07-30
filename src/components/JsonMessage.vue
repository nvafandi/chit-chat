<template>
  <div class="json-container">
    <!-- JSON/Code Display Box -->
    <v-card
      class="json-card"
      elevation="2"
    >
      <v-card-text class="pa-0">
        <div class="json-header">
          <div class="json-info">
            <v-icon size="small" :color="iconColor" class="mr-2">{{ headerIcon }}</v-icon>
            <span class="json-label">{{ formatType }}</span>
          </div>
        </div>

        <!-- Code Content with Syntax Highlighting -->
        <div class="json-content">
          <pre class="json-code"><code>{{ content }}</code></pre>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  content: string
  type: 'json' | 'code' | 'text' | 'sql'
  language?: string
}

const props = defineProps<Props>()

const formatType = computed(() => {
  if (props.type === 'json') {
    return 'JSON'
  } else if (props.type === 'code') {
    return `${props.language?.toUpperCase() || 'CODE'} Code`
  }
  return 'CODE'
})

const headerIcon = computed(() => {
  if (props.type === 'json') {
    return 'mdi-code-json'
  } else if (props.type === 'code') {
    return 'mdi-code-braces'
  }
  return 'mdi-console'
})

const iconColor = computed(() => {
  if (props.type === 'json') {
    return '#ce9178' // Brownish for JSON
  } else if (props.type === 'code') {
    return '#4ec9b0' // Green for code
  }
  return '#569cd6' // Blue for generic code
})
</script>

<style scoped lang="css">
.json-container {
  margin: 8px 0;
}

.json-card {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  overflow: hidden;
}

.json-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.json-info {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #ce9178;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.json-label {
  margin-left: 4px;
}

.json-content {
  position: relative;
  background: #1e1e1e;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 600px;
}

.json-code {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre;
  background-color: #1e1e1e;
  overflow: visible;
}

.json-code code {
  font-family: inherit;
  color: inherit;
}

/* Scrollbar styling for code block */
.json-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.json-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.json-content::-webkit-scrollbar-thumb {
  background: #464647;
  border-radius: 3px;
}

.json-content::-webkit-scrollbar-thumb:hover {
  background: #5e5e5e;
}

/* Dark theme (default) */
:root.dark .json-card,
.json-card {
  background: #1e1e1e;
  border-color: #3e3e42;
}

:root.dark .json-header,
.json-header {
  background: #252526;
  border-bottom-color: #3e3e42;
}

:root.dark .json-code,
.json-code {
  background-color: #1e1e1e;
  color: #d4d4d4;
}
</style>
