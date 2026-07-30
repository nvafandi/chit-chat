<template>
  <div class="link-message-container">
    <p class="message-content mb-0" v-html="htmlContent"></p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { convertUrlsToHtml } from '@/utils/urlFormatter'

interface Props {
  content: string
}

const props = defineProps<Props>()

const htmlContent = computed(() => {
  return convertUrlsToHtml(props.content)
})
</script>

<style scoped>
.link-message-container {
  width: 100%;
}

.message-content {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
}

:deep(.url-link) {
  color: var(--clr-info-a10);
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.1), rgba(66, 165, 245, 0.05));
  padding: 2px 6px;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border-bottom: 2px solid var(--clr-info-a10);
}

:deep(.url-link)::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--clr-info-a0);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.url-link):hover {
  color: var(--clr-info-a0);
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.2), rgba(66, 165, 245, 0.15));
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(79, 195, 247, 0.25);
}

:deep(.url-link):hover::after {
  width: 100%;
}

:deep(.url-link):active {
  transform: scale(0.98);
}
</style>
