import React, { useMemo } from 'react'
import { convertUrlsToHtml } from '@/utils/urlFormatter'

interface LinkMessageProps {
  content: string
}

export const LinkMessage: React.FC<LinkMessageProps> = ({ content }) => {
  const htmlContent = useMemo(() => {
    return convertUrlsToHtml(content)
  }, [content])

  return (
    <div className="link-message-container">
      <p 
        className="message-content mb-0" 
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}

export default LinkMessage
