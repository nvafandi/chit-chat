/**
 * URL Detection and Formatting Utilities
 */

/**
 * Regex pattern to detect URLs
 * Matches http(s)://, ftp://, www., and other common URL patterns
 */
const URL_REGEX = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+|www\.[^\s]+)/gi

/**
 * Check if text contains URLs
 */
export function containsUrls(text: string): boolean {
  return URL_REGEX.test(text)
}

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): string[] {
  const urls: string[] = []
  let match
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0
  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags)
  while ((match = regex.exec(text)) !== null) {
    let url = match[0]
    // Add protocol if missing (www. needs http://)
    if (!url.startsWith('http') && !url.startsWith('ftp')) {
      url = 'http://' + url
    }
    urls.push(url)
  }
  return urls
}

/**
 * Convert text with URLs into HTML with clickable links
 * Returns HTML string safe for v-html
 */
export function convertUrlsToHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  try {
    // Escape existing HTML to prevent XSS (but preserve already-escaped HTML)
    let result = text
    
    // Only escape if not already escaped (check for &)
    if (!text.includes('&lt;') && !text.includes('<span')) {
      result = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    // Replace URLs with clickable links
    return result.replace(URL_REGEX, (url) => {
      // Add protocol if missing
      const fullUrl = url.startsWith('http') || url.startsWith('ftp') 
        ? url 
        : 'http://' + url
      
      // Create link with target="_blank" and rel="noopener noreferrer" for security
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="url-link">${url}</a>`
    })
  } catch (err) {
    console.error('[urlFormatter] Error in convertUrlsToHtml:', err)
    return text
  }
}
