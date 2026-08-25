<template>
  <div class="live-location-message">
    <div class="live-location-header">
      <span class="live-dot" :class="{ stopped: !isActive }" />
      <v-icon size="small" :color="isActive ? 'success' : 'grey'">mdi-map-marker</v-icon>
      <span class="live-label">{{ isActive ? 'Live Location' : 'Live Location berakhir' }}</span>
    </div>
    <div ref="mapContainer" class="live-location-map" @click="openFullscreen" />
    <div class="live-location-footer">
      <span class="live-coords">{{ coords }}</span>
      <span v-if="isActive" class="live-updated">Updated {{ updatedAtText }}</span>
    </div>
    <div class="live-location-actions">
      <a
        :href="googleMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="live-action-btn"
      >
        <v-icon size="small">mdi-google-maps</v-icon>
        <span>Google Maps</span>
      </a>
      <a :href="nativeMapUrl" class="live-action-btn">
        <v-icon size="small">mdi-directions</v-icon>
        <span>Buka di Maps</span>
      </a>
      <button
        v-if="isOwnMessage && isActive"
        class="live-action-btn stop-btn"
        @click="handleStop"
      >
        <v-icon size="small">mdi-stop-circle</v-icon>
        <span>Stop</span>
      </button>
    </div>

    <!-- Fullscreen Map Overlay -->
    <Teleport to="body">
      <Transition name="map-fade">
        <div v-if="showFullscreen" class="live-map-overlay" @click.self="closeFullscreen">
          <div class="live-map-overlay-header">
            <div class="live-map-overlay-title">
              <span class="live-dot" :class="{ stopped: !isActive }" />
              <span>{{ isActive ? 'Live Location' : 'Live Location berakhir' }}</span>
              <span class="live-overlay-coords">{{ coords }}</span>
            </div>
            <button class="live-map-close" @click="closeFullscreen">
              <v-icon size="20">mdi-close</v-icon>
            </button>
          </div>
          <div ref="fullscreenMapContainer" class="live-map-fullscreen" />
          <div class="live-map-overlay-actions">
            <a
              :href="googleMapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="live-overlay-btn"
            >
              <v-icon size="small">mdi-google-maps</v-icon>
              <span>Google Maps</span>
            </a>
            <a :href="nativeMapUrl" class="live-overlay-btn">
              <v-icon size="small">mdi-directions</v-icon>
              <span>Buka di Maps</span>
            </a>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import { subscribeToLiveLocation, stopLiveLocation as fbStopLiveLocation } from '@/services/firebase'
import type { LiveLocation } from '@/types'

interface Props {
  location: { latitude: number; longitude: number; label?: string }
  messageId: string
  isOwnMessage?: boolean
}

const props = defineProps<Props>()

const mapContainer = ref<HTMLElement | null>(null)
const fullscreenMapContainer = ref<HTMLElement | null>(null)
const liveData = ref<LiveLocation | null>(null)
const lat = ref(props.location.latitude)
const lng = ref(props.location.longitude)
const showFullscreen = ref(false)

let map: L.Map | null = null
let fullscreenMap: L.Map | null = null
let marker: L.Marker | null = null
let fullscreenMarker: L.Marker | null = null
let unsubscribe: (() => void) | null = null

const isActive = computed(() => liveData.value?.active ?? false)
const coords = computed(() => `${lat.value.toFixed(6)}, ${lng.value.toFixed(6)}`)

const updatedAtText = computed(() => {
  if (!liveData.value?.updatedAt) return ''
  const diff = Math.floor((Date.now() - liveData.value.updatedAt) / 1000)
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
})

const googleMapsUrl = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${lat.value},${lng.value}`
)
const nativeMapUrl = computed(() => `geo:${lat.value},${lng.value}?q=${lat.value},${lng.value}`)

function createIcon() {
  return L.divIcon({
    className: 'live-marker',
    html: `<div class="live-marker-dot"><div class="live-marker-pulse"/></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function initMap() {
  if (!mapContainer.value || map) return

  map = L.map(mapContainer.value, {
    center: [lat.value, lng.value],
    zoom: 16,
    zoomControl: false,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)

  marker = L.marker([lat.value, lng.value], { icon: createIcon() }).addTo(map)

  unsubscribe = subscribeToLiveLocation(props.messageId, (data) => {
    liveData.value = data
    if (data) {
      lat.value = data.latitude
      lng.value = data.longitude
      if (marker && map) {
        marker.setLatLng([data.latitude, data.longitude])
      }
      if (fullscreenMarker && fullscreenMap) {
        fullscreenMarker.setLatLng([data.latitude, data.longitude])
        fullscreenMap.setView([data.latitude, data.longitude])
      }
    }
  })
}

function initFullscreenMap() {
  if (!fullscreenMapContainer.value || fullscreenMap) return

  fullscreenMap = L.map(fullscreenMapContainer.value, {
    center: [lat.value, lng.value],
    zoom: 17,
    zoomControl: true,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(fullscreenMap)

  fullscreenMarker = L.marker([lat.value, lng.value], { icon: createIcon() }).addTo(fullscreenMap)

  setTimeout(() => fullscreenMap?.invalidateSize(), 100)
}

function destroyFullscreenMap() {
  if (fullscreenMap) {
    fullscreenMap.remove()
    fullscreenMap = null
    fullscreenMarker = null
  }
}

async function openFullscreen() {
  showFullscreen.value = true
  await nextTick()
  initFullscreenMap()
}

function closeFullscreen() {
  showFullscreen.value = false
  destroyFullscreenMap()
}

async function handleStop() {
  try {
    await fbStopLiveLocation(props.messageId)
  } catch (e) {
    console.error('[LiveLocation] Failed to stop:', e)
  }
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  unsubscribe?.()
  destroyFullscreenMap()
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.live-location-message {
  width: 264px;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(76, 175, 80, 0.3);
  background: var(--clr-surface-a0, #fff);
}

:global(html.dark) .live-location-message {
  border-color: rgba(76, 175, 80, 0.4);
  background: #2b2d31;
}

.live-location-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
  animation: pulse-dot 1.5s infinite;
  flex-shrink: 0;
}

.live-dot.stopped {
  background: #757575;
  animation: none;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.live-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-location-map {
  width: 100%;
  height: 160px;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.live-location-map:hover {
  opacity: 0.9;
}

:global(html.dark) .live-location-map {
  background: #1e1f22;
}

:global(.live-marker) {
  background: transparent !important;
  border: none !important;
}

:global(.live-marker-dot) {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4caf50;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
}

:global(.live-marker-pulse) {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.25);
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.live-location-footer {
  padding: 6px 12px 2px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.live-coords {
  font-size: 11px;
  opacity: 0.7;
  font-family: 'Roboto Mono', monospace;
}

.live-updated {
  font-size: 10px;
  opacity: 0.5;
}

.live-location-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px 12px;
}

.live-action-btn {
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
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #4caf50;
  background: rgba(76, 175, 80, 0.08);
}

:global(html.dark) .live-action-btn {
  border-color: rgba(76, 175, 80, 0.5);
  color: #66bb6a;
  background: rgba(76, 175, 80, 0.12);
}

.live-action-btn:hover {
  background: #4caf50;
  color: #fff;
  border-color: transparent;
  transform: translateY(-1px);
}

.stop-btn {
  border-color: rgba(244, 67, 54, 0.4);
  color: #f44336;
  background: rgba(244, 67, 54, 0.08);
  cursor: pointer;
  font-family: inherit;
}

:global(html.dark) .stop-btn {
  border-color: rgba(244, 67, 54, 0.5);
  color: #ef5350;
  background: rgba(244, 67, 54, 0.12);
}

.stop-btn:hover {
  background: #f44336;
  color: #fff;
  border-color: transparent;
  transform: translateY(-1px);
}

/* Fullscreen Overlay */
:global(.live-map-overlay) {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
}

:global(.live-map-overlay-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #16213e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

:global(.live-map-overlay-title) {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
}

:global(.live-overlay-coords) {
  font-size: 12px;
  opacity: 0.5;
  font-family: 'Roboto Mono', monospace;
  margin-left: 8px;
}

:global(.live-map-close) {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

:global(.live-map-close:hover) {
  background: rgba(255, 255, 255, 0.2);
}

:global(.live-map-fullscreen) {
  flex: 1;
  width: 100%;
}

:global(.live-map-overlay-actions) {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #16213e;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

:global(.live-overlay-btn) {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  transition: all 0.2s;
}

:global(.live-overlay-btn:hover) {
  background: #4caf50;
  color: #fff;
}

/* Transition */
.map-fade-enter-active,
.map-fade-leave-active {
  transition: opacity 0.2s ease;
}
.map-fade-enter-from,
.map-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .live-location-message {
    width: 220px;
  }
}
</style>
