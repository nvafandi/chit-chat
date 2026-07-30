<template>
  <div class="curl-container">
    <!-- Curl Display Box -->
    <v-card
      class="curl-card"
      elevation="2"
    >
      <v-card-text class="pa-0">
        <div class="curl-header">
          <div class="curl-info">
            <v-icon size="small" color="primary" class="mr-2">mdi-console</v-icon>
            <span class="curl-label">CURL Request</span>
          </div>
        </div>

        <!-- Curl Code Block -->
        <div class="curl-content">
          <pre class="curl-code"><code>{{ displayText }}</code></pre>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCurlForDisplay } from '@/utils/curlFormatter'

interface Props {
  curl: string
}

const props = defineProps<Props>()

const displayText = computed(() => {
  return formatCurlForDisplay(props.curl)
})
</script>

<style scoped lang="css">
.curl-container {
  margin: 8px 0;
}

.curl-card {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  overflow: hidden;
}

.curl-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.curl-info {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #ce9178;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.curl-label {
  margin-left: 4px;
}

.curl-content {
  position: relative;
  background: #1e1e1e;
  overflow-x: auto;
}

.curl-code {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre;
  background-color: #1e1e1e;
}

.curl-code code {
  font-family: inherit;
  color: inherit;
}

/* Syntax highlighting for curl parts */
.curl-code {
  background-color: #1e1e1e;
}

/* Scrollbar styling */
.curl-content::-webkit-scrollbar {
  height: 8px;
}

.curl-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.curl-content::-webkit-scrollbar-thumb {
  background: #464647;
  border-radius: 4px;
}

.curl-content::-webkit-scrollbar-thumb:hover {
  background: #5a5a5a;
}
</style>
