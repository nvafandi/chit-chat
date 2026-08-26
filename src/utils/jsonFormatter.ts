/**
 * JSON and Code Block Detection & Formatting
 */

export interface FormattedContent {
  type: 'text' | 'json' | 'code' | 'sql'
  content: string
  language?: string
}

/**
 * Check if string is valid JSON (objects or arrays only, not primitives)
 */
export function isValidJSON(str: string): boolean {
  try {
    const trimmed = str.trim()
    
    // Only consider objects and arrays as valid JSON for display purposes
    // Reject plain numbers, strings, booleans, null
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false
    }
    
    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      return false
    }
    
    // Try to parse it
    const parsed = JSON.parse(trimmed)
    
    // Ensure it's actually an object or array, not a primitive that was stringified
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

/**
 * Check if string is formatted code block (starts with ``` or ```language)
 */
export function isCodeBlock(str: string): boolean {
  return str.trim().startsWith('```') && str.trim().endsWith('```')
}

/**
 * Check if string is SQL query
 */
export function isSQLQuery(str: string): boolean {
  const trimmed = str.trim().toUpperCase()
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
    'TRUNCATE', 'UNION', 'WITH', 'REPLACE', 'UPSERT'
  ]
  
  // Check if starts with SQL keyword and contains newlines or multiple spaces (formatted)
  const startsWithSQL = sqlKeywords.some(keyword => trimmed.startsWith(keyword))
  const isFormatted = str.includes('\n') || (str.split(' ').length > 3)
  
  return startsWithSQL && isFormatted
}

/**
 * Extract language from code block
 */
export function extractLanguageFromCodeBlock(str: string): string {
  const match = str.trim().match(/^```(\w+)?/)
  return match?.[1] || 'plaintext'
}

/**
 * Extract code from code block
 */
export function extractCodeFromCodeBlock(str: string): string {
  return str
    .trim()
    .replace(/^```\w*\n?/, '')
    .replace(/\n?```$/, '')
}

/**
 * Detect content type and return formatted content
 */
export function detectContentType(content: string): FormattedContent {
  const trimmed = content.trim()

  // Check if it's a code block
  if (isCodeBlock(trimmed)) {
    const language = extractLanguageFromCodeBlock(trimmed)
    const code = extractCodeFromCodeBlock(trimmed)
    return {
      type: 'code',
      content: code,
      language,
    }
  }

  // Check if it's SQL query
  if (isSQLQuery(trimmed)) {
    return {
      type: 'sql',
      content: trimmed,
    }
  }

  // Check if it's JSON (including single-line JSON)
  // Detect single-line JSON like: { "key": "value" }
  if (isValidJSON(trimmed)) {
    // If it's single-line JSON, beautify it first
    const beautified = formatJSON(trimmed)
    return {
      type: 'json',
      content: beautified,
    }
  }

  // Regular text
  return {
    type: 'text',
    content: content,
  }
}

/**
 * Format JSON with proper indentation
 */
export function formatJSON(content: string): string {
  try {
    const parsed = JSON.parse(content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return content
  }
}

/**
 * Check if message contains formatted content
 */
export function hasFormattedContent(content: string): boolean {
  const trimmed = content.trim()
  return isCodeBlock(trimmed) || isValidJSON(trimmed)
}

export default {
  isValidJSON,
  isCodeBlock,
  isSQLQuery,
  extractLanguageFromCodeBlock,
  extractCodeFromCodeBlock,
  detectContentType,
  formatJSON,
  hasFormattedContent,
}
