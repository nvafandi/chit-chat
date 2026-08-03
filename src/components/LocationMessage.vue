<template>
  <div class="location-message">
    <div class="location-header">
      <v-icon size="small" color="primary">mdi-map-marker</v-icon>
      <span class="location-label">{{ displayLabel }}</span>
    </div>
    <div class="location-map">
      <iframe
        :src="mapEmbedUrl"
        :title="`Map: ${displayLabel}`"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
      />
    </div>
    <div class="location-coords">
      {{ coords }}
    </div>
    <div class="location-actions">
      <a
        :href="googleMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="location-btn"
      >
        <v-icon size="small">mdi-google-maps</v-icon>
        <span>Google Maps</span>
      </a>
      <a
        :href="nativeMapUrl"
        class="location-btn"
      >
        <v-icon size="small">mdi-directions</v-icon>
        <span>Buka di Maps</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  location: {
    latitude: number
    longitude: number
    label?: string
  }
}

const props = defineProps<Props>()

const lat = computed(() => props.location.latitude)
const lng = computed(() => props.location.longitude)

const displayLabel = computed(() => {
  return props.location.label?.trim() || 'Lokasi Saya'
})

const coords = computed(() => {
  return `${lat.value.toFixed(6)}, ${lng.value.toFixed(6)}`
})

const mapEmbedUrl = computed(() => {
  return `https://maps.google.com/maps?q=${lat.value},${lng.value}&z=15&output=embed`
})

const googleMapsUrl = computed(() => {
  return `https://www.google.com/maps/search/?api=1&query=${lat.value},${lng.value}`
})

const nativeMapUrl = computed(() => {
  return `geo:${lat.value},${lng.value}?q=${lat.value},${lng.value}`
})
</script>

<style scoped>
.location-message {
  width: 264px;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--clr-surface-a0, #fff);
}

:global(html.dark) .location-message {
  border-color: rgba(255, 255, 255, 0.12);
}

.location-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
}

.location-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location-map {
  width: 100%;
  height: 140px;
  background: rgba(0, 0, 0, 0.05);
}

.location-map iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.location-coords {
  padding: 6px 12px 2px;
  font-size: 11px;
  opacity: 0.7;
  font-family: 'Roboto Mono', monospace;
}

.location-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px 12px;
}

.location-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(102, 126, 234, 0.4);
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
}

.location-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-color: transparent;
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .location-message {
    width: 220px;
  }
}
</style>
