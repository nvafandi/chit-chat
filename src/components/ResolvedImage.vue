<template>
  <img :src="resolvedSrc" :alt="alt ?? ''" />
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useResolvedFileUrl } from '@/composables/useResolvedFileUrl'

const props = defineProps<{
  src: string
  alt?: string
}>()

const resolvedSrc = useResolvedFileUrl(toRef(props, 'src'))
</script>
