import CryptoJS from 'crypto-js'
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '@/utils/const'

/**
 * Generate a LiveKit access token (JWT HS256) — same shape as
 * livekit-server-sdk's AccessToken. Client-side minting is fine for this
 * project's no-backend setup; move to a server if the app goes public.
 */
export function generateLiveKitToken(opts: {
  identity: string
  name: string
  room: string
  ttlSeconds?: number
}): string {
  const secret = LIVEKIT_API_SECRET
  if (!secret) {
    throw new Error('LIVEKIT_API_SECRET belum diisi di src/utils/const.ts')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({
      iss: LIVEKIT_API_KEY,
      sub: opts.identity,
      name: opts.name,
      nbf: now - 10,
      iat: now,
      exp: now + (opts.ttlSeconds ?? 6 * 3600),
      video: {
        roomJoin: true,
        room: opts.room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    })
  )

  const signature = CryptoJS.HmacSHA256(`${header}.${payload}`, secret)
  const sigB64 = CryptoJS.enc.Base64.stringify(signature)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${header}.${payload}.${sigB64}`
}

function b64url(str: string): string {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
