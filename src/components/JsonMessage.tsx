import React, { useMemo } from 'react'

interface JsonMessageProps {
  content: string
  type: 'json' | 'code' | 'text' | 'sql'
  language?: string
}

export const JsonMessage: React.FC<JsonMessageProps> = ({ content, type, language }) => {
  const formatType = useMemo(() => {
    if (type === 'json') return 'JSON'
    if (type === 'code') return `${language?.toUpperCase() || 'CODE'} Code`
    return 'CODE'
  }, [type, language])

  const headerIcon = useMemo(() => {
    if (type === 'json') return 'mdi-code-json'
    if (type === 'code') return 'mdi-code-braces'
    return 'mdi-console'
  }, [type])

  const iconColor = useMemo(() => {
    if (type === 'json') return '#ce9178' // Brownish for JSON
    if (type === 'code') return '#4ec9b0' // Green for code
    return '#569cd6' // Blue for generic code
  }, [type])

  return (
    <div className="json-container">
      <div className="json-card">
        <div className="json-header">
          <div className="json-info">
            <i className={`mdi ${headerIcon} mr-2`} style={{ color: iconColor, fontSize: '0.95rem' }}></i>
            <span className="json-label">{formatType}</span>
          </div>
        </div>
        <div className="json-content">
          <pre className="json-code">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export default JsonMessage
