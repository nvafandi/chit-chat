<template>
  <div class="mention-message-container">
    <p class="message-content mb-0" v-html="htmlContent"></p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/types'
import { convertUrlsToHtml } from '@/utils/urlFormatter'
import { MENTION_REGEX, extractMentions } from '@/utils/mentionFormatter'

interface Props {
  content: string
  users?: User[]
  isSent?: boolean
}

const props = defineProps<Props>()

const htmlContent = computed(() => {
  if (!props.content || typeof props.content !== 'string') {
    return ''
  }
  
  try {
    // First convert mentions with user context
    let html = convertMentionsWithContext(props.content, props.users || [])
    // Then convert URLs to links
    html = convertUrlsToHtml(html)
    return html
  } catch (err) {
    console.error('[MentionMessage] Error processing content:', err)
    // Fallback to plain text
    return props.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
})

function convertMentionsWithContext(text: string, users: User[]): string {
  if (!text || typeof text !== 'string') return ''
  
  try {
    // Extract all mentions first for logging
    const mentions = extractMentions(text)
    
    // Escape existing HTML to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    // Debug: log users and mentions
    if (mentions.length > 0) {
      console.log('[MentionMessage] Found mentions:', mentions, 'Users available:', users?.length || 0)
    }

    // Replace mentions with user context
    return escaped.replace(MENTION_REGEX, (mention) => {
      const username = mention.substring(1) // Remove @ prefix
      
      // Only exact case-insensitive match - no partial matching
      let user = null
      if (users && users.length > 0) {
        user = users.find(u => 
          u.username && u.username.toLowerCase() === username.toLowerCase()
        )
      }
      
      // Debug logging
      if (mentions.includes(username)) {
        console.log('[MentionMessage] Mention:', mention, '| Username:', username, '| Found:', !!user, '| Available users:', users?.length)
        if (user) {
          console.log('[MentionMessage] Matched to:', user.username, 'with animal:', user.animal)
        }
      }
      
      if (user) {
        // User found - show with context
        return `<span class="mention-tag mention-valid" title="@${user.username}">${user.animal || '👤'} @${user.username}</span>`
      } else if (username.toLowerCase() === 'all') {
        // Special case for @all
        return `<span class="mention-tag mention-all" title="@all">👥 @all</span>`
      } else {
        // User not found - show as plain text (no tag styling)
        return mention
      }
    })
  } catch (err) {
    console.error('[mentionFormatter] Error in convertMentionsWithContext:', err)
    return text
  }
}
</script>

<style scoped>
.mention-message-container {
  width: 100%;
}

.message-content {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 0.95rem;
}

:deep(.url-link) {
  color: v-bind('props.isSent ? "#FFFF00" : "#4FC3F7"');
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

:deep(.url-link)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: v-bind('props.isSent ? "#FFFF00" : "#4FC3F7"');
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.url-link):hover {
  color: v-bind('props.isSent ? "#FFFF66" : "#81D4FA"');
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.4), rgba(66, 165, 245, 0.25));
  border-color: rgba(79, 195, 247, 0.6);
  box-shadow: 0 3px 12px rgba(79, 195, 247, 0.3);
}

:deep(.mention-tag) {
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-block;
  border: 1px solid;
}

:deep(.mention-valid) {
  color: v-bind('props.isSent ? "#FFFF00" : "#fff"');
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.35), rgba(30, 144, 255, 0.25));
  border-color: rgba(10, 92, 255, 0.5);
  box-shadow: 0 2px 6px rgba(10, 92, 255, 0.15);
}

:deep(.mention-valid):hover {
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.45), rgba(30, 144, 255, 0.35));
  box-shadow: 0 3px 8px rgba(10, 92, 255, 0.25);
  color: v-bind('props.isSent ? "#FFFF66" : "#fff"');
}

:deep(.mention-all) {
  color: v-bind('props.isSent ? "#FFFF00" : "#fff"');
  background: linear-gradient(135deg, rgba(255, 45, 85, 0.25), rgba(255, 107, 107, 0.2));
  border-color: rgba(255, 45, 85, 0.5);
  box-shadow: 0 2px 6px rgba(255, 45, 85, 0.15);
}

:deep(.mention-all):hover {
  background: linear-gradient(135deg, rgba(255, 45, 85, 0.35), rgba(255, 107, 107, 0.3));
  box-shadow: 0 3px 8px rgba(255, 45, 85, 0.25);
  color: v-bind('props.isSent ? "#FFFF66" : "#fff"');
}

:deep(.mention-invalid) {
  color: #888;
  background: rgba(200, 200, 200, 0.15);
  border-color: rgba(100, 100, 100, 0.3);
  text-decoration: line-through;
  opacity: 0.75;
}

:deep(.mention-invalid):hover {
  background: rgba(200, 200, 200, 0.25);
}
</style>
