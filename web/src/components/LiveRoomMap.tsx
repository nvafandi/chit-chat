import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Box, Typography, IconButton, List, ListItem, ListItemAvatar, Avatar } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { subscribeToActiveRoomLocations } from '@/services/firebase'
import type { LiveLocation } from '@/types'

interface Props {
  roomId: string
  onClose: () => void
}

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4']

function colorFor(userId: string): string {
  let h = 0
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function markerIcon(color: string, label: string) {
  return L.divIcon({
    className: 'live-marker',
    html: `<div class="live-marker-dot" style="background:${color}"><div class="live-marker-pulse" style="background:${color}44"></div></div>
           <div class="live-marker-label">${label}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

/** Combined realtime map of everyone sharing live location in a room. */
export default function LiveRoomMap({ roomId, onClose }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const [sharers, setSharers] = useState<LiveLocation[]>([])

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { center: [-6.2, 106.8], zoom: 12, zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    mapRef.current = map

    const unsub = subscribeToActiveRoomLocations(roomId, (locs) => {
      setSharers(locs)
      const markers = markersRef.current
      const seen = new Set<string>()

      for (const loc of locs) {
        seen.add(loc.id)
        const color = colorFor(loc.userId)
        const existing = markers.get(loc.id)
        if (existing) {
          existing.setLatLng([loc.latitude, loc.longitude])
        } else {
          const m = L.marker([loc.latitude, loc.longitude], {
            icon: markerIcon(color, loc.username),
          }).addTo(map)
          markers.set(loc.id, m)
        }
      }
      for (const [id, m] of markers) {
        if (!seen.has(id)) {
          m.remove()
          markers.delete(id)
        }
      }
      if (locs.length > 0) {
        const bounds = L.latLngBounds(locs.map((l) => [l.latitude, l.longitude] as [number, number]))
        map.fitBounds(bounds.pad(0.35), { maxZoom: 16 })
      }
    })

    return () => {
      unsub()
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [roomId])

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: '#121212', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'background.paper' }}>
        <Typography sx={{ fontWeight: 700 }}>📍 Live Location — semua yang sedang share</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ width: 230, borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', p: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            {sharers.length} sedang share
          </Typography>
          <List dense>
            {sharers.map((s) => (
              <ListItem key={s.id}>
                <ListItemAvatar>
                  <Avatar sx={{ width: 26, height: 26, fontSize: 13, bgcolor: colorFor(s.userId) }}>
                    {s.animal ?? '🐾'}
                  </Avatar>
                </ListItemAvatar>
                <Typography variant="body2" noWrap>{s.username}</Typography>
              </ListItem>
            ))}
            {sharers.length === 0 && (
              <Typography variant="caption" sx={{ px: 2, display: 'block', mt: 1 }}>
                Belum ada yang share. Mulai lewat tombol 🎯 di composer.
              </Typography>
            )}
          </List>
        </Box>
        <Box ref={mapEl} sx={{ flexGrow: 1 }} />
      </Box>
    </Box>
  )
}
