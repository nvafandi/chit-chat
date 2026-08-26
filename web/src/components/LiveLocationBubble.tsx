import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Box, Typography } from '@mui/material'
import { subscribeToLiveLocation } from '@/services/firebase'
import type { Message } from '@/types'

const ICON = L.divIcon({
  className: 'live-marker',
  html: '<div class="live-marker-dot"><div class="live-marker-pulse"></div></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export default function LiveLocationBubble({ message }: { message: Message }) {
  const loc = message.location!
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [active, setActive] = useState<boolean | null>(null)

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return

    const map = L.map(mapEl.current, {
      center: [loc.latitude, loc.longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    markerRef.current = L.marker([loc.latitude, loc.longitude], { icon: ICON }).addTo(map)
    mapRef.current = map

    const unsub = subscribeToLiveLocation(message.id, (data) => {
      if (!data) return
      setActive(data.active)
      markerRef.current?.setLatLng([data.latitude, data.longitude])
      mapRef.current?.setView([data.latitude, data.longitude], 16, { animate: true })
    })

    return () => {
      unsub()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id])

  const lat = loc.latitude
  const lng = loc.longitude

  function openMaps() {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
  }

  return (
    <Box
      onClick={openMaps}
      sx={{
        width: 240,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid rgba(76,175,80,0.4)',
        cursor: 'pointer',
        mb: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.75 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: active === false ? '#757575' : '#4caf50',
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {active === false ? 'Live Location berakhir' : 'Live Location'}
        </Typography>
      </Box>
      <Box ref={mapEl} sx={{ height: 140, width: '100%', bgcolor: 'action.hover' }} />
      <Typography
        variant="caption"
        sx={{ px: 1.25, py: 0.5, display: 'block', opacity: 0.6, fontFamily: 'monospace', fontSize: 10 }}
      >
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </Typography>
    </Box>
  )
}
