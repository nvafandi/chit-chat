/**
 * CURL Request Formatter Utilities
 * Detects and properly formats curl requests for display and copying
 */

/**
 * Check if text is a curl request
 */
export function isCurlRequest(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.startsWith('curl ')
}

/**
 * Extract curl from mixed text (e.g., "Here's my curl:" followed by curl request)
 */
export function extractCurlFromText(text: string): string | null {
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('curl ')) {
      // Found curl start, collect all consecutive lines that are part of it
      const curlLines: string[] = [lines[i]]
      
      // Continue collecting lines that are part of the curl (lines starting with -- or continuation)
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim()
        if (nextLine.startsWith('--') || nextLine.startsWith('\\') || /^['"{]/.test(nextLine)) {
          curlLines.push(lines[j])
        } else if (nextLine === '') {
          // Empty line might be part of multiline curl, continue
          continue
        } else {
          // Stop if we hit something that's not part of curl
          break
        }
      }
      
      return curlLines.join('\n').trim()
    }
  }
  
  return null
}

/**
 * Parse curl request into components
 */
interface CurlComponents {
  url: string | null
  headers: Map<string, string>
  data: string | null
  method: string
}

export function parseCurl(curlText: string): CurlComponents {
  const components: CurlComponents = {
    url: null,
    headers: new Map(),
    data: null,
    method: 'GET',
  }

  // Extract URL
  const urlMatch = curlText.match(/curl\s+(?:--location\s+)?['"']?([^'"'\s]+)['"']?/)
  if (urlMatch) {
    components.url = urlMatch[1]
  }

  // Extract headers
  const headerMatches = curlText.matchAll(/'--header'\s+'([^:]+):\s*([^']+)'|--header\s+'([^:]+):\s*([^']+)'/g)
  for (const match of headerMatches) {
    const key = match[1] || match[3]
    const value = match[2] || match[4]
    if (key && value) {
      components.headers.set(key.trim(), value.trim())
    }
  }

  // Alternative header parsing (without quotes)
  const headerMatches2 = curlText.matchAll(/--header\s+['"]([^:]+):\s*([^'"]+)['"]/g)
  for (const match of headerMatches2) {
    components.headers.set(match[1].trim(), match[2].trim())
  }

  // Extract data - handle both --data and --data-raw
  // Use more robust matching that handles nested quotes and large JSON
  
  // Try single-quoted data first
  let dataMatch = curlText.match(/--data(?:-raw)?\s+'({[\s\S]*})'(?=\s*(?:\\|$))/s)
  if (!dataMatch) {
    // Try double-quoted data
    dataMatch = curlText.match(/--data(?:-raw)?\s+"({[\s\S]*})"(?=\s*(?:\\|$))/s)
  }
  if (!dataMatch) {
    // Try unquoted data
    dataMatch = curlText.match(/--data(?:-raw)?\s+({[\s\S]*})(?=\s*(?:\\|$))/s)
  }
  
  // If still no match, try a more flexible approach for --data-raw with line breaks
  if (!dataMatch) {
    dataMatch = curlText.match(/--data-raw\s+'?([\s\S]*?)'?(?=\s*(?:\\|$))/s)
  }
  
  if (dataMatch) {
    let data = dataMatch[1].trim()
    // Remove trailing quotes if they exist
    if ((data.startsWith("'") && data.endsWith("'")) || 
        (data.startsWith('"') && data.endsWith('"'))) {
      data = data.slice(1, -1)
    }
    components.data = data
  }

  // Extract method
  const methodMatch = curlText.match(/--request\s+(['"]?)([A-Z]+)\1/)
  if (methodMatch) {
    components.method = methodMatch[2]
  }

  return components
}

/**
 * Format curl request for perfect copying (optimized for Postman)
 * Compacts JSON data to single line so Postman can parse body correctly
 * Preserves headers and structure
 */
export function formatCurlForCopy(curlText: string): string {
  // Parse the curl first
  const components = parseCurl(curlText)
  
  // Build curl for copy with compact JSON
  const lines: string[] = []
  
  // Add URL with --location
  if (components.url) {
    lines.push(`curl --location '${components.url}' \\`)
  }
  
  // Add headers
  components.headers.forEach((value, key) => {
    lines.push(`  --header '${key}: ${value}' \\`)
  })
  
  // Add data with compact JSON (single line)
  if (components.data) {
    try {
      // Try to parse as JSON to ensure it's valid
      const jsonData = JSON.parse(components.data)
      // Compact JSON for single line (no newlines/tabs)
      const compactJson = JSON.stringify(jsonData)
      lines.push(`  --data '${compactJson}'`)
    } catch (e) {
      // If JSON is invalid, just use as is
      const singleLineData = components.data.replace(/\s+/g, ' ').trim()
      lines.push(`  --data '${singleLineData}'`)
    }
  }
  
  // Remove trailing backslash from last line
  if (lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\\$/, '')
  }
  
  return lines.join('\n')
}

/**
 * Format curl request for display in UI
 * Shows pretty-printed JSON with indentation for readability
 */
export function formatCurlForDisplay(curlText: string): string {
  // Parse the curl
  const components = parseCurl(curlText)
  
  // Build formatted curl for display
  const lines: string[] = []
  
  // Add URL with --location
  if (components.url) {
    lines.push(`curl --location '${components.url}' \\`)
  }
  
  // Add headers
  components.headers.forEach((value, key) => {
    lines.push(`  --header '${key}: ${value}' \\`)
  })
  
  // Add data with pretty-printed JSON
  if (components.data) {
    try {
      // Try to parse and pretty-print
      const jsonData = JSON.parse(components.data)
      const prettyJson = JSON.stringify(jsonData, null, 2)
      lines.push(`  --data '${prettyJson}'`)
    } catch (e) {
      // If not valid JSON, just format the data
      const formattedData = components.data.replace(/\s+/g, ' ').trim()
      lines.push(`  --data '${formattedData}'`)
    }
  }
  
  // Remove trailing backslash from last line
  if (lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\\$/, '')
  }
  
  return lines.join('\n')
}

/**
 * Get copyable text for curl - returns exact format as sent by user
 * This preserves the original curl with line breaks and backslashes
 */
export function getCurlCopyableText(curlText: string): string {
  return formatCurlForCopy(curlText)
}

/**
 * Get displayable text for curl - returns pretty-formatted
 */
export function getCurlDisplayText(curlText: string): string {
  return formatCurlForDisplay(curlText)
}
