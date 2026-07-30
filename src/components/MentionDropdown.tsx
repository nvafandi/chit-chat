import React, { useState, useEffect, useMemo } from 'react'
import ReactDOM from 'react-dom'
import type { User } from '@/types'
import { getLastMentionBeingTyped } from '@/utils/mentionFormatter'

interface MentionDropdownProps {
  text: string
  cursorPosition: number
  users: User[]
  currentUserId?: string
  onSelect: (username: string) => void
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  text,
  cursorPosition,
  users,
  currentUserId,
  onSelect,
}) => {
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  const mentionData = useMemo(() => {
    return getLastMentionBeingTyped(text, cursorPosition)
  }, [text, cursorPosition])

  const shouldShow = mentionData !== null

  const hasAll = useMemo(() => {
    if (!mentionData) return false
    return 'all'.startsWith(mentionData.mention.toLowerCase())
  }, [mentionData])

  const filteredUsers = useMemo(() => {
    if (!mentionData) return []
    const query = mentionData.mention.toLowerCase()
    return users
      .filter(
        (user) =>
          user.id !== currentUserId &&
          user.username.toLowerCase().startsWith(query)
      )
      .slice(0, 5)
  }, [mentionData, users, currentUserId])

  const positionDropdown = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const rect = textarea.getBoundingClientRect()
    const scrollTop = window.scrollY
    
    const itemCount = filteredUsers.length + (hasAll ? 1 : 0)
    const itemHeight = itemCount * 48
    const containerPadding = 16
    const dividerHeight = filteredUsers.length > 0 && hasAll ? 1 : 0
    const totalHeight = itemHeight + containerPadding + dividerHeight
    
    const topPosition = rect.top + scrollTop - totalHeight - 20
    
    setDropdownPosition({
      top: topPosition,
      left: rect.left + window.scrollX,
    })
  }

  useEffect(() => {
    if (shouldShow) {
      positionDropdown()
    }
  }, [shouldShow, text, filteredUsers, hasAll])

  if (!shouldShow || (filteredUsers.length === 0 && !hasAll)) {
    return null
  }

  return ReactDOM.createPortal(
    <div
      className="mention-dropdown"
      style={{
        position: 'fixed',
        top: dropdownPosition.top + 'px',
        left: dropdownPosition.left + 'px',
        zIndex: 99999,
      }}
    >
      {hasAll && (
        <div className="mention-item mention-all" onClick={() => onSelect('all')}>
          <span className="mention-avatar">👥</span>
          <span className="mention-text">@all</span>
        </div>
      )}

      {filteredUsers.length > 0 && hasAll && <div className="mention-divider"></div>}

      {filteredUsers.map((user) => (
        <div
          key={user.id}
          className="mention-item"
          onClick={() => onSelect(user.username)}
        >
          <span className="mention-avatar">{user.animal}</span>
          <span className="mention-text">@{user.username}</span>
        </div>
      ))}
    </div>,
    document.body
  )
}

export default MentionDropdown
