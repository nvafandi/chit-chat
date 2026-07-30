/**
 * Cookie Service
 * Handles browser cookie operations with expiration tracking
 */

interface CookieOptions {
  maxAge?: number // in seconds
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

/**
 * Set a cookie with expiration
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const {
    maxAge = 86400, // 1 day default
    path = '/',
    domain,
    secure = false,
    sameSite = 'Lax',
  } = options

  let cookieString = `${name}=${encodeURIComponent(value)}`

  if (maxAge) {
    cookieString += `; Max-Age=${maxAge}`
  }

  if (path) {
    cookieString += `; Path=${path}`
  }

  if (domain) {
    cookieString += `; Domain=${domain}`
  }

  if (secure) {
    cookieString += '; Secure'
  }

  if (sameSite) {
    cookieString += `; SameSite=${sameSite}`
  }

  document.cookie = cookieString
}

/**
 * Get a cookie value
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`
  const cookies = document.cookie.split(';')

  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length))
    }
  }

  return null
}

/**
 * Delete a cookie
 * @param name - Cookie name
 */
export function deleteCookie(name: string): void {
  setCookie(name, '', { maxAge: 0 })
}

/**
 * Check if cookie exists
 * @param name - Cookie name
 * @returns True if cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null
}

/**
 * Get all cookies as an object
 * @returns Object with all cookies
 */
export function getAllCookies(): Record<string, string> {
  const cookies: Record<string, string> = {}
  const cookieList = document.cookie.split(';')

  for (let cookie of cookieList) {
    cookie = cookie.trim()
    const [name, value] = cookie.split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  }

  return cookies
}

/**
 * Delete all cookies
 */
export function deleteAllCookies(): void {
  const cookies = getAllCookies()
  for (const name in cookies) {
    deleteCookie(name)
  }
}
