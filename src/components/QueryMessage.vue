<template>
  <div class="query-container">
    <!-- SQL Query Display Box -->
    <v-card
      class="query-card"
      elevation="2"
    >
      <v-card-text class="pa-0">
        <div class="query-header">
          <div class="query-info">
            <v-icon size="small" color="#ce9178" class="mr-2">mdi-database-search</v-icon>
            <span class="query-label">SQL QUERY</span>
          </div>
        </div>

        <!-- Query Content with Syntax Highlighting -->
        <div class="query-content">
          <pre class="query-code"><code>{{ content }}</code></pre>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  content: string
}

defineProps<Props>()
</script>

<style scoped lang="css">
.query-container {
  margin: 8px 0;
}

.query-card {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 8px;
  overflow: hidden;
}

.query-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.query-info {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #ce9178;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.query-label {
  margin-left: 4px;
}

.query-content {
  position: relative;
  background: #1e1e1e;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.query-code {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre;
  word-break: break-word;
  background-color: #1e1e1e;
}

.query-code code {
  font-family: inherit;
  color: inherit;
}

/* Scrollbar styling for code block */
.query-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.query-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.query-content::-webkit-scrollbar-thumb {
  background: #464647;
  border-radius: 3px;
}

.query-content::-webkit-scrollbar-thumb:hover {
  background: #5e5e5e;
}

/* Dark theme (default) */
:root.dark .query-card,
.query-card {
  background: #1e1e1e;
  border-color: #3e3e42;
}

:root.dark .query-header,
.query-header {
  background: #252526;
  border-bottom-color: #3e3e42;
}

:root.dark .query-code,
.query-code {
  background-color: #1e1e1e;
  color: #d4d4d4;
}
</style>
