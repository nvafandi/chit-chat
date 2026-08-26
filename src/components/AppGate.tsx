import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { ENABLE_CLOSING_COUNTDOWN, ENABLE_OPENING_COUNTDOWN, TIME_CLOSE, TIME_OPEN, OPENING_TEXT_MAIN, OPENING_TEXT_SUB, CLOSING_TEXT_MAIN, CLOSING_TEXT_SUB, CLOSING_TEXT_DESC } from '@/utils/const'

type Phase = 'open' | 'locked' | 'closed'

function computePhase(): Phase {
  const now = Date.now()
  if (ENABLE_OPENING_COUNTDOWN && now < new Date(TIME_OPEN).getTime()) return 'locked'
  if (ENABLE_CLOSING_COUNTDOWN && now >= new Date(TIME_CLOSE).getTime()) return 'closed'
  return 'open'
}

function diff(target: string) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now())
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1_000) % 60),
  }
}

export default function AppGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>(computePhase)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (phase === 'open') return
    const t = setInterval(() => {
      setTick((n) => n + 1)
      setPhase(computePhase())
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  if (phase === 'open') return <>{children}</>
  void tick

  const locked = phase === 'locked'
  const t = locked ? diff(TIME_OPEN) : diff(TIME_CLOSE)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: '#0d0b14',
        color: '#fff',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Box>
        <Typography variant="h3" color="primary" gutterBottom sx={{ fontWeight: 900 }}>
          {locked ? OPENING_TEXT_MAIN : CLOSING_TEXT_MAIN}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
          {locked ? OPENING_TEXT_SUB : CLOSING_TEXT_SUB}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
          {([['Days', t.days], ['Hours', t.hours], ['Mins', t.minutes], ['Secs', t.seconds]] as const).map(
            ([label, v]) => (
              <Box
                key={label}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  px: 2.5,
                  py: 1.5,
                  minWidth: 76,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {String(v).padStart(2, '0')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </Box>
            )
          )}
        </Box>

        {!locked && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: "auto" }}>
            {CLOSING_TEXT_DESC}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
