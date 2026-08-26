import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '@/utils/const'

/**
 * Mint a LiveKit access token (JWT HS256) using the browser's WebCrypto.
 * Same shape as livekit-server-sdk's AccessToken.
 */
export async function generateLiveKitToken(opts: {
  identity: string
  name: string
  room: string
  ttlSeconds?: number
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' })
  const payload = b64urlJson({
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

  const data = `${header}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(LIVEKIT_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return `${data}.${b64urlBytes(new Uint8Array(sig))}`
}

function b64urlJson(obj: unknown): string {
  return b64urlBytes(new TextEncoder().encode(JSON.stringify(obj)))
}

function b64urlBytes(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
