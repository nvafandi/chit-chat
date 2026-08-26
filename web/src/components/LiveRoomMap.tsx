import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Box, Typography, IconButton, List, ListItem, ListItemButton, ListItemAvatar, Avatar, Chip, CircularProgress } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MyLocationIcon from '@mui/icons-material/MyLocation'
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

function myPositionIcon() {
  return L.divIcon({
    className: 'live-marker',
    html: `<div style="width:14px;height:14px;background:#1976d2;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #1976d2,0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

async function fetchRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][] | null> {
  try {
    const dist = haversine(from[0], from[1], to[0], to[1])
    const profile = dist < 2 ? 'foot' : 'car'
    const url = `https://routing.openstreetmap.de/${profile}/v2/route/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.routes?.length) return null
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
  } catch {
    return null
  }
}

export default function LiveRoomMap({ roomId, onClose }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const myMarkerRef = useRef<L.Marker | null>(null)
  const lineRef = useRef<L.Polyline | null>(null)
  const popupRef = useRef<L.Popup | null>(null)

  const [sharers, setSharers] = useState<LiveLocation[]>([])
  const [myPos, setMyPos] = useState<[number, number] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Track own position
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Init map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { center: [-6.2, 106.8], zoom: 12, zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    mapRef.current = map

    map.on('click', () => {
      setSelectedId(null)
      lineRef.current?.remove()
      lineRef.current = null
      popupRef.current?.remove()
      popupRef.current = null
    })

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [roomId])

  // Update my position marker
  useEffect(() => {
    if (!mapRef.current || !myPos) return
    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng(myPos)
    } else {
      myMarkerRef.current = L.marker(myPos, { icon: myPositionIcon(), zIndexOffset: 1000 }).addTo(mapRef.current)
    }
  }, [myPos])

  // Draw route to selected user
  const drawRoute = async (target: LiveLocation) => {
    if (!mapRef.current || !myPos) return
    const map = mapRef.current
    setLoading(true)

    lineRef.current?.remove()
    popupRef.current?.remove()

    const coords = await fetchRoute(myPos, [target.latitude, target.longitude])
    setLoading(false)

    if (coords && coords.length > 1) {
      lineRef.current = L.polyline(coords, {
        color: '#1976d2',
        weight: 3,
        opacity: 0.85,
      }).addTo(map)
      map.fitBounds(lineRef.current.getBounds().pad(0.15), { maxZoom: 16 })
    } else {
      // Fallback: straight line
      lineRef.current = L.polyline([myPos, [target.latitude, target.longitude]], {
        color: '#1976d2',
        weight: 2,
        dashArray: '6,4',
        opacity: 0.8,
      }).addTo(map)
    }

    const dist = haversine(myPos[0], myPos[1], target.latitude, target.longitude)
    popupRef.current = L.popup({ closeButton: false, className: 'live-dist-popup' })
      .setLatLng([target.latitude, target.longitude])
      .setContent(`<div style="text-align:center;font-size:12px;font-weight:600;padding:2px 6px">${target.username}<br/>${formatDist(dist)}</div>`)
      .openOn(map)
  }

  // Subscribe to locations
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

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

          m.on('click', () => {
            setSelectedId(loc.id)
            drawRoute(loc)
          })

          markers.set(loc.id, m)
        }
      }
      for (const [id, m] of markers) {
        if (!seen.has(id)) {
          m.remove()
          markers.delete(id)
        }
      }

      if (!selectedId && locs.length > 0) {
        const allPoints: [number, number][] = locs.map((l) => [l.latitude, l.longitude])
        if (myPos) allPoints.push(myPos)
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds.pad(0.35), { maxZoom: 16 })
      }
    })

    return () => unsub()
  }, [roomId, myPos, selectedId])

  // Re-center on my position (max zoom)
  const recenter = () => {
    if (mapRef.current && myPos) {
      mapRef.current.setView(myPos, 19, { animate: true })
    }
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: '#121212', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>📍 Live Location — semua yang sedang share</Typography>
          {loading && <CircularProgress size={16} />}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ width: 230, borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', p: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            {sharers.length} sedang share
          </Typography>
          <List dense disablePadding>
            {sharers.map((s) => {
              const isSelected = selectedId === s.id
              return (
                <ListItem key={s.id} disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => {
                      if (mapRef.current) {
                        setSelectedId(s.id)
                        drawRoute(s)
                      }
                    }}
                    sx={{ borderRadius: 1, px: 1, py: 0.5 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Avatar sx={{ width: 26, height: 26, fontSize: 13, bgcolor: colorFor(s.userId) }}>
                        {s.animal ?? '🐾'}
                      </Avatar>
                    </ListItemAvatar>
                    <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                      {s.username}
                    </Typography>
                    {myPos && (
                      <Chip
                        size="small"
                        label={formatDist(haversine(myPos[0], myPos[1], s.latitude, s.longitude))}
                        sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              )
            })}
            {sharers.length === 0 && (
              <Typography variant="caption" sx={{ px: 2, display: 'block', mt: 1 }}>
                Belum ada yang share. Mulai lewat tombol 🎯 di composer.
              </Typography>
            )}
          </List>
        </Box>

        <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 0 }}>
          <Box ref={mapEl} sx={{ position: 'absolute', inset: 0 }} />
          {myPos && (
            <IconButton
              onClick={recenter}
              sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                zIndex: 3001,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <MyLocationIcon />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  )
}
