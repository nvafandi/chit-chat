import React, { useMemo } from 'react'
import { formatCurlForDisplay } from '@/utils/curlFormatter'

interface CurlMessageProps {
  curl: string
}

export const CurlMessage: React.FC<CurlMessageProps> = ({ curl }) => {
  const displayText = useMemo(() => {
    return formatCurlForDisplay(curl)
  }, [curl])

  return (
    <div className="curl-container">
      <div className="curl-card">
        <div className="curl-header">
          <div className="curl-info">
            <i className="mdi mdi-console mr-2" style={{ color: 'var(--clr-primary-a0)' }}></i>
            <span className="curl-label">CURL Request</span>
          </div>
        </div>
        <div className="curl-content">
          <pre className="curl-code">
            <code>{displayText}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

export default CurlMessage
