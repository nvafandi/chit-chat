/**
 * Mention Detection and Formatting Utilities
 */

/**
 * Regex pattern to detect mentions (@username or @all)
 */
export const MENTION_REGEX = /@(\w+)/g

/**
 * Check if text contains mentions
 */
export function containsMentions(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return MENTION_REGEX.test(text)
}

/**
 * Extract all mentions from text
 */
export function extractMentions(text: string): string[] {
  if (!text || typeof text !== 'string') return []
  
  const mentions: string[] = []
  let match
  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags)
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      mentions.push(match[1])
    }
  }
  return mentions
}

/**
 * Convert text with mentions into HTML with highlighted mentions
 */
export function convertMentionsToHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  
  try {
    // Escape existing HTML to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    // Replace mentions with highlighted spans
    return escaped.replace(MENTION_REGEX, (mention) => {
      return `<span class="mention-tag">${mention}</span>`
    })
  } catch (err) {
    console.error('[mentionFormatter] Error in convertMentionsToHtml:', err)
    return text
  }
}

/**
 * Get the last mention being typed (for autocomplete)
 * Returns { mention: string, startIndex: number } or null
 */
export function getLastMentionBeingTyped(text: string, cursorPosition: number): { mention: string; startIndex: number } | null {
  if (!text || typeof text !== 'string' || !Number.isInteger(cursorPosition)) return null
  
  try {
    // Look backward from cursor for @
    const beforeCursor = text.substring(0, cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')
    
    if (lastAtIndex === -1) return null
    
    // Get text after @
    const afterAt = beforeCursor.substring(lastAtIndex + 1)
    
    // Check if it's a valid mention pattern (only word characters)
    if (!/^\w*$/.test(afterAt)) return null
    
    // Check if @ is at start or preceded by space
    if (lastAtIndex > 0 && /\w/.test(text[lastAtIndex - 1])) return null
    
    return {
      mention: afterAt,
      startIndex: lastAtIndex
    }
  } catch (err) {
    console.error('[mentionFormatter] Error in getLastMentionBeingTyped:', err)
    return null
  }
}

/**
 * Insert mention into text at cursor position
 */
export function insertMention(text: string, cursorPosition: number, mentionUsername: string): { text: string; cursorPosition: number } {
  if (!text || !mentionUsername || !Number.isInteger(cursorPosition)) {
    return { text, cursorPosition }
  }
  
  try {
    const mentionData = getLastMentionBeingTyped(text, cursorPosition)
    
    if (!mentionData) return { text, cursorPosition }
    
    // Replace from @ to cursor with @username
    const before = text.substring(0, mentionData.startIndex)
    const after = text.substring(cursorPosition)
    const newText = before + '@' + mentionUsername + ' ' + after
    const newCursorPosition = mentionData.startIndex + mentionUsername.length + 2
    
    return { text: newText, cursorPosition: newCursorPosition }
  } catch (err) {
    console.error('[mentionFormatter] Error in insertMention:', err)
    return { text, cursorPosition }
  }
}
