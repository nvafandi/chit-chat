import React, { useMemo } from 'react'
import type { User } from '@/types'
import { convertUrlsToHtml } from '@/utils/urlFormatter'
import { MENTION_REGEX, extractMentions } from '@/utils/mentionFormatter'

interface MentionMessageProps {
  content: string
  users?: User[]
  isSent?: boolean
}

function convertMentionsWithContext(text: string, users: User[]): string {
  if (!text || typeof text !== 'string') return ''
  
  try {
    const mentions = extractMentions(text)
    
    // Escape existing HTML to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    if (mentions.length > 0) {
      console.log('[MentionMessage] Found mentions:', mentions, 'Users available:', users?.length || 0)
    }

    return escaped.replace(MENTION_REGEX, (mention) => {
      const username = mention.substring(1) // Remove @ prefix
      
      let user = null
      if (users && users.length > 0) {
        user = users.find(u => 
          u.username && u.username.toLowerCase() === username.toLowerCase()
        )
      }
      
      if (user) {
        return `<span class="mention-tag mention-valid" title="@${user.username}">${user.animal || '👤'} @${user.username}</span>`
      } else if (username.toLowerCase() === 'all') {
        return `<span class="mention-tag mention-all" title="@all">👥 @all</span>`
      } else {
        return mention
      }
    })
  } catch (err) {
    console.error('[mentionFormatter] Error in convertMentionsWithContext:', err)
    return text
  }
}

export const MentionMessage: React.FC<MentionMessageProps> = ({
  content,
  users = [],
  isSent = false
}) => {
  const htmlContent = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return ''
    }
    
    try {
      let html = convertMentionsWithContext(content, users)
      html = convertUrlsToHtml(html)
      return html
    } catch (err) {
      console.error('[MentionMessage] Error processing content:', err)
      return content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }, [content, users])

  const linkColor = isSent ? "#FFFF00" : "#4FC3F7"
  const hoverLinkColor = isSent ? "#FFFF66" : "#81D4FA"
  const tagColor = isSent ? "#FFFF00" : "#fff"
  const hoverTagColor = isSent ? "#FFFF66" : "#fff"

  return (
    <div className="mention-message-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .mention-message-container {
          width: 100%;
        }
        .mention-message-container .message-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          line-height: 1.5;
          font-size: 0.95rem;
        }
        .mention-message-container .url-link {
          color: ${linkColor};
          background: linear-gradient(135deg, rgba(79, 195, 247, 0.25), rgba(66, 165, 245, 0.15));
          padding: 3px 8px;
          border-radius: 4px;
          text-decoration: underline;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          border: 1px solid rgba(79, 195, 247, 0.4);
          display: inline-block;
          box-shadow: 0 2px 6px rgba(79, 195, 247, 0.15);
        }
        .mention-message-container .url-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: ${linkColor};
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mention-message-container .url-link:hover {
          color: ${hoverLinkColor};
          background: linear-gradient(135deg, rgba(79, 195, 247, 0.4), rgba(66, 165, 245, 0.25));
          border-color: rgba(79, 195, 247, 0.6);
          box-shadow: 0 3px 12px rgba(79, 195, 247, 0.3);
        }
        .mention-message-container .mention-tag {
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          display: inline-block;
          border: 1px solid;
        }
        .mention-message-container .mention-valid {
          color: ${tagColor};
          background: linear-gradient(135deg, rgba(79, 195, 247, 0.35), rgba(30, 144, 255, 0.25));
          border-color: rgba(10, 92, 255, 0.5);
          box-shadow: 0 2px 6px rgba(10, 92, 255, 0.15);
        }
        .mention-message-container .mention-valid:hover {
          background: linear-gradient(135deg, rgba(79, 195, 247, 0.45), rgba(30, 144, 255, 0.35));
          box-shadow: 0 3px 8px rgba(10, 92, 255, 0.25);
          color: ${hoverTagColor};
        }
        .mention-message-container .mention-all {
          color: ${tagColor};
          background: linear-gradient(135deg, rgba(255, 45, 85, 0.25), rgba(255, 107, 107, 0.2));
          border-color: rgba(255, 45, 85, 0.5);
          box-shadow: 0 2px 6px rgba(255, 45, 85, 0.15);
        }
        .mention-message-container .mention-all:hover {
          background: linear-gradient(135deg, rgba(255, 45, 85, 0.35), rgba(255, 107, 107, 0.3));
          box-shadow: 0 3px 8px rgba(255, 45, 85, 0.25);
          color: ${hoverTagColor};
        }
        .mention-message-container .mention-invalid {
          color: #888;
          background: rgba(200, 200, 200, 0.15);
          border-color: rgba(100, 100, 100, 0.3);
          text-decoration: line-through;
          opacity: 0.75;
        }
        .mention-message-container .mention-invalid:hover {
          background: rgba(200, 200, 200, 0.25);
        }
      ` }} />
      <p className="message-content mb-0" dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  )
}

export default MentionMessage
