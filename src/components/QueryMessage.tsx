import React from 'react'

interface QueryMessageProps {
  content: string
}

export const QueryMessage: React.FC<QueryMessageProps> = ({ content }) => {
  return (
    <div className="query-container">
      <div className="query-card">
        <div className="query-header">
          <div className="query-info">
            <i className="mdi mdi-database-search mr-2" style={{ color: '#ce9178', fontSize: '0.95rem' }}></i>
            <span className="query-label">SQL QUERY</span>
          </div>
        </div>
        <div className="query-content">
          <pre className="query-code">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export default QueryMessage
