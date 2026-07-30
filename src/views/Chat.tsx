import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { 
  sendMessage, 
  getMessages, 
  subscribeToMessages, 
  subscribeToUsers, 
  subscribeToMessageCount, 
  getUserById, 
  hideMessage, 
  getMessagesBefore 
} from '@/services/firebase'
import { uploadImage, uploadFile } from '@/services/supabase'
import { performFileCleanup, schedulePeriodicCleanup } from '@/services/fileCleanup'
import { validateSession } from '@/services/session'
import { clearAllStorage } from '@/services/storageCleanup'
import { 
  requestNotificationPermission,
  notifyNewMessage,
  notifyMentioned,
  isNotificationSupported,
  playNotificationSoundDouble,
  initAudioContext,
} from '@/services/notificationService'
import { 
  PERIODIC_CLEANUP_INTERVAL, 
  AUTO_CLEANUP_ON_MOUNT, 
  CHECK_FILE_ON_NEW_MESSAGE,
  TOAST_TIMEOUT,
  MESSAGE_HIGHLIGHT_DURATION,
  SCROLL_DELAY,
  SCROLL_LOAD_THRESHOLD,
  SCROLL_DEBOUNCE_MS,
} from '@/utils/const'
import { compressImageMaximum, formatFileSize, isCompressibleImage, validateFileForUpload } from '@/utils/imageCompression'
import { isCurlRequest, getCurlCopyableText } from '@/utils/curlFormatter'
import { detectContentType, hasFormattedContent } from '@/utils/jsonFormatter'
import { containsMentions, insertMention, extractMentions } from '@/utils/mentionFormatter'
import { isStickerMessage } from '@/utils/stickers'
import CurlMessage from '@/components/CurlMessage'
import JsonMessage from '@/components/JsonMessage'
import QueryMessage from '@/components/QueryMessage'
import MentionMessage from '@/components/MentionMessage'
import MentionDropdown from '@/components/MentionDropdown'
import StickerMessage from '@/components/StickerMessage'
import StickerPicker from '@/components/StickerPicker'
import type { Message, ReplyTo } from '@/types'
import type { CompressionResult } from '@/utils/imageCompression'
import type { Sticker } from '@/utils/stickers'

import './Chat.css'

export const Chat: React.FC = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const chatStore = useChatStore()

  const [isDark, setIsDark] = useState<boolean>(false)
  const [messageInput, setMessageInput] = useState('')
  const [inputCursorPosition, setInputCursorPosition] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [copyToastMessage, setCopyToastMessage] = useState('Copied to clipboard!')
  const [showSessionExpiredToast, setShowSessionExpiredToast] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('⏰ Session has expired. Please login again.')
  const [showNewMessageToast, setShowNewMessageToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastAnimal, setToastAnimal] = useState('')
  const [toastUsername, setToastUsername] = useState('')
  
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [isLoadingAllMessages, setIsLoadingAllMessages] = useState(false)
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [compressionInfos, setCompressionInfos] = useState<CompressionResult[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number[]>([])
  
  const [isGlobalDragover, setIsGlobalDragover] = useState(false)
  
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('')
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  
  const [pendingStickerData, setPendingStickerData] = useState<{
    id: string
    type: 'emoji' | 'image'
    content: string
    name: string
  } | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Track scroll flags using refs to avoid triggering re-renders
  const isPrependingRef = useRef(false)
  const shouldForceScrollRef = useRef(false)
  const lastActionRef = useRef<'idle' | 'prepend' | 'send' | 'receive' | 'init'>('idle')
  const prependLockUntilRef = useRef(0)
  const isMomentumScrollingRef = useRef(false)
  const pendingPrependRequestRef = useRef(false)
  const lastKnownScrollTopRef = useRef(0)
  const lastUserScrollTimeRef = useRef(0)
  const isFetchingRef = useRef(false)
  const lastProcessedMessageIdsRef = useRef<Set<string>>(new Set())
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set())
  const lastSubscriptionUpdateTimeRef = useRef(0)
  const stopPeriodicCleanupRef = useRef<(() => void) | null>(null)

  const isPageVisibleRef = useRef<boolean>(true)

  const setAction = (action: typeof lastActionRef.current) => {
    if (lastActionRef.current !== action) {
      console.log(`[Chat] State: ${lastActionRef.current} → ${action}`)
      lastActionRef.current = action
    }
  }

  const displayMessages = useMemo(() => {
    return searchQuery.length >= 3 ? searchResults : chatStore.messages
  }, [searchQuery, searchResults, chatStore.messages])

  useEffect(() => {
    const handleVisibility = () => {
      isPageVisibleRef.current = !document.hidden
      console.log('[Chat] Page visibility changed:', isPageVisibleRef.current ? 'visible' : 'hidden')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const isCurrentUser = (userId: string) => userId === authStore.user?.id

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateSeparator = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const shouldShowDateSeparator = (currentIndex: number, messages: Message[]): boolean => {
    if (currentIndex === 0) return true
    const currentDate = new Date(messages[currentIndex].timestamp)
    const previousDate = new Date(messages[currentIndex - 1].timestamp)
    return currentDate.toDateString() !== previousDate.toDateString()
  }

  const getAvatarColor = (userId: string): string => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
      'linear-gradient(135deg, #2e2e78 0%, #662d8c 100%)',
      'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    localStorage.setItem('theme', nextDark ? 'dark' : 'light')
    if (nextDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const setReply = (message: Message) => {
    setReplyingTo({
      id: message.id,
      username: message.username,
      animal: message.animal || '',
      content: message.hidden ? 'message has been deleted' : message.content
    })
  }

  const cancelReply = () => setReplyingTo(null)

  const handleLogout = () => {
    clearAllStorage()
    navigate('/create-account')
  }

  const handleSessionExpiredWithToast = () => {
    console.warn('[Chat] Session expired. Showing toast and redirecting...')
    setShowSessionExpiredToast(true)
    setTimeout(() => {
      clearAllStorage()
      navigate('/create-account')
    }, 2000)
  }

  const validateUserDataConsistency = async (): Promise<boolean> => {
    if (!authStore.user) {
      handleSessionExpiredWithToast()
      return false
    }
    try {
      const dbUser = await getUserById(authStore.user.id)
      if (!dbUser) {
        setSessionExpiredMessage('❌ Your account has been deleted. Please login with another account.')
        handleSessionExpiredWithToast()
        return false
      }
      const passwordMismatch = authStore.user.password && authStore.user.password !== dbUser.password
      if (dbUser.id !== authStore.user.id || dbUser.username !== authStore.user.username || dbUser.animal !== authStore.user.animal || passwordMismatch) {
        if (passwordMismatch) {
          setSessionExpiredMessage('🔐 Your password has changed. Please login again.')
        } else {
          setSessionExpiredMessage('⚠️ Your account information has changed. Please login again.')
        }
        handleSessionExpiredWithToast()
        return false
      }
      return true
    } catch (err) {
      console.error('[Chat] Error validating user data:', err)
      handleSessionExpiredWithToast()
      return false
    }
  }

  const isFileImage = (file: File): boolean => file.type.startsWith('image/')

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    setError(null)
    
    const newFiles = [...selectedFiles]
    const newPreviews = [...filePreviews]
    const newCompressionInfos = [...compressionInfos]
    const newUploadProgress = [...uploadProgress]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateFileForUpload(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        continue
      }

      newFiles.push(file)
      newUploadProgress.push(0)

      if (validation.isImage) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)

        if (isCompressibleImage(file)) {
          setIsCompressing(true)
          try {
            const compressionResult = await compressImageMaximum(file)
            newCompressionInfos.push(compressionResult)
          } catch (err) {
            setError(`Compression error for ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
            const idx = newFiles.indexOf(file)
            if (idx > -1) {
              newFiles.splice(idx, 1)
              newUploadProgress.splice(idx, 1)
            }
          } finally {
            setIsCompressing(false)
          }
        } else {
          newCompressionInfos.push(null as any)
        }
      } else {
        newPreviews.push('')
        newCompressionInfos.push(null as any)
      }
    }

    setSelectedFiles(newFiles)
    setCompressionInfos(newCompressionInfos)
    setUploadProgress(newUploadProgress)
    event.target.value = ''
    
    setTimeout(() => {
      const inputSection = document.querySelector('.input-section')
      if (inputSection) {
        inputSection.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    }, 50)
  }

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles]
    const newPreviews = [...filePreviews]
    const newCompression = [...compressionInfos]
    const newProgress = [...uploadProgress]

    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    newCompression.splice(index, 1)
    newProgress.splice(index, 1)

    setSelectedFiles(newFiles)
    setFilePreviews(newPreviews)
    setCompressionInfos(newCompression)
    setUploadProgress(newProgress)
  }

  const handleGlobalDragEnter = (event: DragEvent) => {
    const items = event.dataTransfer?.types
    if (items && items.includes('Files')) {
      setIsGlobalDragover(true)
      event.preventDefault()
    }
  }

  const handleGlobalDragOver = (event: DragEvent) => {
    const items = event.dataTransfer?.types
    if (items && items.includes('Files')) {
      event.preventDefault()
      event.dataTransfer!.dropEffect = 'copy'
    }
  }

  const handleGlobalDragLeave = (event: DragEvent) => {
    if ((event.target as Element).tagName === 'HTML' || (event.target as Element).tagName === 'BODY' || (event.clientX === 0 && event.clientY === 0)) {
      setIsGlobalDragover(false)
    }
  }

  const handleGlobalDrop = async (event: DragEvent) => {
    event.preventDefault()
    setIsGlobalDragover(false)
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return
    setError(null)
    
    const newFiles = [...selectedFiles]
    const newPreviews = [...filePreviews]
    const newCompression = [...compressionInfos]
    const newProgress = [...uploadProgress]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateFileForUpload(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        continue
      }

      newFiles.push(file)
      newProgress.push(0)

      if (validation.isImage) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)

        if (isCompressibleImage(file)) {
          setIsCompressing(true)
          try {
            const compressionResult = await compressImageMaximum(file)
            newCompression.push(compressionResult)
          } catch (err) {
            setError(`Compression error: ${err instanceof Error ? err.message : 'Unknown error'}`)
            const idx = newFiles.indexOf(file)
            if (idx > -1) {
              newFiles.splice(idx, 1)
              newProgress.splice(idx, 1)
            }
          } finally {
            setIsCompressing(false)
          }
        } else {
          newCompression.push(null as any)
        }
      } else {
        newPreviews.push('')
        newCompression.push(null as any)
      }
    }

    setSelectedFiles(newFiles)
    setCompressionInfos(newCompression)
    setUploadProgress(newProgress)
  }

  const cancelFileSelect = () => {
    setSelectedFiles([])
    setFilePreviews([])
    setCompressionInfos([])
    setUploadProgress([])
  }

  const handlePasteFile = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items || items.length === 0) return

    let imageFile: File | null = null
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        imageFile = item.getAsFile()
        break
      }
    }
    if (!imageFile) return
    event.preventDefault()
    setError(null)
    
    const validation = validateFileForUpload(imageFile)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    const newFiles = [...selectedFiles, imageFile]
    setSelectedFiles(newFiles)

    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreviews(prev => [...prev, e.target?.result as string])
    }
    reader.readAsDataURL(imageFile)

    if (isCompressibleImage(imageFile)) {
      setIsCompressing(true)
      try {
        const compressionResult = await compressImageMaximum(imageFile)
        setCompressionInfos(prev => [...prev, compressionResult])
      } catch (err) {
        setError(`Compression error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setSelectedFiles(prev => prev.filter(f => f !== imageFile))
      } finally {
        setIsCompressing(false)
      }
    } else {
      setCompressionInfos(prev => [...prev, null as any])
    }
  }

  const openImageModal = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl)
    setShowImageModal(true)
  }

  const downloadFile = (fileUrl: string | undefined, fileName: string | undefined) => {
    if (!fileUrl) return
    fetch(fileUrl)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName || 'file'
        link.click()
        window.URL.revokeObjectURL(blobUrl)
      })
      .catch(err => {
        console.error('Error downloading file:', err)
        setError(`Failed to download file: ${err?.message}`)
      })
  }

  const scrollToMessage = (messageId: string) => {
    const container = messagesContainerRef.current
    if (!container) return
    const targetElement = document.querySelector(`[data-message-id="${messageId}"]`)
    if (!targetElement) return
    targetElement.scrollIntoView({ behavior: 'auto', block: 'center' })
    targetElement.classList.add('message-highlighted')
    setTimeout(() => {
      targetElement.classList.remove('message-highlighted')
    }, MESSAGE_HIGHLIGHT_DURATION)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyToastMessage('✅ Copied to clipboard!')
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), TOAST_TIMEOUT)
    })
  }

  const handleMessageCopy = (message: Message) => {
    let contentToCopy = message.content
    if (message.hidden) {
      contentToCopy = 'message has been deleted'
    } else if (hasFormattedContent(message.content)) {
      contentToCopy = detectContentType(message.content).content
    } else if (isCurlRequest(message.content)) {
      contentToCopy = getCurlCopyableText(message.content)
    }
    copyToClipboard(contentToCopy)
  }

  const handleHideMessage = async (messageId: string) => {
    try {
      chatStore.updateMessageHidden(messageId, true)
      await hideMessage(messageId)
      setCopyToastMessage('✅ Message has been deleted')
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), TOAST_TIMEOUT)
    } catch (err) {
      chatStore.updateMessageHidden(messageId, false)
      setError(`Failed to delete message: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !authStore.user) return
    if (isLoading) return
    if (!validateSession()) {
      handleSessionExpiredWithToast()
      return
    }
    if (!(await validateUserDataConsistency())) return

    setIsLoading(true)
    setError(null)
    setIsUploading(true)

    try {
      const attachments: any[] = []
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const compressionInfo = compressionInfos[i]
          let uploadUrl = null
          let uploadedSize = file.size
          let originalSize = file.size
          let compressedSize = undefined
          
          const onProgress = (prog: number) => {
            setUploadProgress(prev => {
              const updated = [...prev]
              updated[i] = prog
              return updated
            })
          }

          if (isFileImage(file) && compressionInfo) {
            uploadUrl = await uploadImage(compressionInfo.blob, file.name, 'chat-images', onProgress)
            uploadedSize = compressionInfo.compressedSize
            originalSize = compressionInfo.originalSize
            compressedSize = compressionInfo.compressedSize
          } else {
            uploadUrl = await uploadFile(file, file.name, 'chat-images', onProgress)
          }

          if (!uploadUrl) {
            setError(`Failed to upload file: ${file.name}`)
            setIsLoading(false)
            setIsUploading(false)
            return
          }

          attachments.push({
            id: `attachment-${i}-${Date.now()}`,
            url: uploadUrl,
            type: isFileImage(file) ? 'image' : 'file',
            mimeType: file.type,
            name: file.name,
            size: uploadedSize,
            originalSize,
            ...(compressedSize && { compressedSize })
          })
        }
      }

      await sendMessage(
        authStore.user.id,
        authStore.user.username,
        authStore.user.animal,
        messageInput.trim(),
        replyingTo || undefined,
        undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        pendingStickerData || undefined,
        attachments.length > 0 ? attachments : undefined
      )
      
      setPendingStickerData(null)
      setMessageInput('')
      setReplyingTo(null)
      cancelFileSelect()
      setAction('send')
      shouldForceScrollRef.current = true
      
      setTimeout(scrollToBottom, 50)
    } catch (err) {
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
      setIsUploading(false)
    }
  }

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages || chatStore.messages.length === 0) return
    if (isMomentumScrollingRef.current) {
      pendingPrependRequestRef.current = true
      return
    }

    isFetchingRef.current = true
    setIsLoadingMore(true)
    isPrependingRef.current = true
    setAction('prepend')

    try {
      const container = messagesContainerRef.current
      if (!container) return
      
      const prevScrollHeight = container.scrollHeight
      const prevScrollTop = container.scrollTop
      const oldestMessage = chatStore.messages[0]
      const olderMessages = await getMessagesBefore(oldestMessage)

      if (olderMessages.length === 0) {
        setHasMoreMessages(false)
      } else {
        chatStore.prependMessages(olderMessages)
        
        setTimeout(() => {
          const newScrollHeight = container.scrollHeight
          const scrollHeightDelta = newScrollHeight - prevScrollHeight
          const targetScrollTop = prevScrollTop + scrollHeightDelta
          container.scrollTop = targetScrollTop
          lastKnownScrollTopRef.current = targetScrollTop
          prependLockUntilRef.current = Date.now() + 100
        }, 50)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingMore(false)
      isPrependingRef.current = false
      setAction('idle')
      isFetchingRef.current = false
    }
  }

  const loadAllMessagesForSearch = async () => {
    setIsLoadingAllMessages(true)
    try {
      let attempts = 0
      while (hasMoreMessages && attempts < 100) {
        attempts++
        if (chatStore.messages.length === 0) break
        const oldestMessage = chatStore.messages[0]
        const olderMessages = await getMessagesBefore(oldestMessage)
        if (olderMessages.length === 0) {
          setHasMoreMessages(false)
          break
        }
        chatStore.prependMessages(olderMessages)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingAllMessages(false)
    }
  }

  const handleSearch = async (val: string) => {
    setSearchQuery(val)
    if (val.length < 3) {
      setSearchResults([])
      return
    }
    if (hasMoreMessages && !isLoadingAllMessages) {
      await loadAllMessagesForSearch()
    }
    const query = val.toLowerCase()
    const results = chatStore.messages.filter((msg) => {
      if (msg.hidden) return false
      return msg.content.toLowerCase().includes(query) || 
             msg.username.toLowerCase().includes(query) || 
             (msg.animal || '').toLowerCase().includes(query)
    })
    setSearchResults(results)
  }

  const handleSearchClear = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    isMomentumScrollingRef.current = true
    
    const settleHandler = () => {
      isMomentumScrollingRef.current = false
      if (pendingPrependRequestRef.current) {
        pendingPrependRequestRef.current = false
        loadMoreMessages()
      }
    }
    
    // Simple debounce
    const scrollDebounceTimer = setTimeout(() => {
      settleHandler()
      if (searchQuery.length >= 3 || isLoadingAllMessages || isFetchingRef.current) return
      
      const isNearTop = container.scrollTop < SCROLL_LOAD_THRESHOLD
      if (isNearTop && !isLoadingMore && hasMoreMessages) {
        loadMoreMessages()
      }
    }, SCROLL_DEBOUNCE_MS)

    return () => clearTimeout(scrollDebounceTimer)
  }

  const isUserNearBottom = (): boolean => {
    const container = messagesContainerRef.current
    if (!container) return false
    const threshold = Math.max(100, container.clientHeight * 0.2)
    const distance = container.scrollHeight - (container.scrollTop + container.clientHeight)
    return distance < threshold
  }

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    const savedTheme = localStorage.getItem('theme')
    const darkActive = savedTheme === 'dark'
    setIsDark(darkActive)
    if (darkActive) document.documentElement.classList.add('dark')

    async function initChat() {
      if (!validateSession()) return
      
      if (authStore.user) {
        const exists = await getUserById(authStore.user.id)
        if (!exists) {
          authStore.logout()
          chatStore.unsubscribeFromUpdates()
          navigate('/create-account')
          return
        }
      }

      const initial = await getMessages()
      chatStore.setMessages(initial)
      lastProcessedMessageIdsRef.current = new Set(initial.map(m => m.id))
      notifiedMessageIdsRef.current = new Set(initial.map(m => m.id))

      if (AUTO_CLEANUP_ON_MOUNT) {
        performFileCleanup(initial).catch(console.error)
      }

      setTimeout(scrollToBottom, SCROLL_DELAY)
      setAction('init')
      if (messagesContainerRef.current) {
        lastKnownScrollTopRef.current = messagesContainerRef.current.scrollTop
      }
    }

    initChat()

    if (isNotificationSupported()) {
      requestNotificationPermission().then(permission => {
        chatStore.setNotificationsEnabled(!!permission)
      }).catch(console.error)
    }

    const audioInit = () => {
      initAudioContext()
      document.removeEventListener('click', audioInit)
      document.removeEventListener('keypress', audioInit)
      document.removeEventListener('touchstart', audioInit)
    }
    document.addEventListener('click', audioInit)
    document.addEventListener('keypress', audioInit)
    document.addEventListener('touchstart', audioInit)

    const dragEnter = (e: DragEvent) => handleGlobalDragEnter(e)
    const dragOver = (e: DragEvent) => handleGlobalDragOver(e)
    const dragLeave = (e: DragEvent) => handleGlobalDragLeave(e)
    const drop = (e: DragEvent) => handleGlobalDrop(e)

    document.addEventListener('dragenter', dragEnter)
    document.addEventListener('dragover', dragOver)
    document.addEventListener('dragleave', dragLeave)
    document.addEventListener('drop', drop)

    const unsubscribe = subscribeToMessages((msgs) => {
      if (!validateSession()) {
        handleSessionExpiredWithToast()
        return
      }

      const now = Date.now()
      if (now - lastSubscriptionUpdateTimeRef.current < 500) return
      lastSubscriptionUpdateTimeRef.current = now

      const currentIds = new Set(msgs.map(m => m.id))
      if (currentIds.size === lastProcessedMessageIdsRef.current.size && 
          [...currentIds].every(id => lastProcessedMessageIdsRef.current.has(id))) {
        return
      }

      lastProcessedMessageIdsRef.current = currentIds

      const newMessages = msgs.filter(m => !chatStore.messages.some(cur => cur.id === m.id))
      if (chatStore.notificationsEnabled && newMessages.length > 0) {
        let playSound = false
        newMessages.forEach((msg) => {
          if (!notifiedMessageIdsRef.current.has(msg.id) && msg.userId !== authStore.user?.id) {
            notifiedMessageIdsRef.current.add(msg.id)
            playSound = true
            
            const mentions = extractMentions(msg.content)
            const isMentioned = mentions.some(m => m.toLowerCase() === authStore.user?.username?.toLowerCase() || m.toLowerCase() === 'all')
            
            if (isPageVisibleRef.current) {
              const { toastData } = isMentioned 
                ? notifyMentioned(msg, authStore.user?.id || '', true)
                : notifyNewMessage(msg, authStore.user?.id || '', true)
              
              if (toastData) {
                setToastMessage(toastData.content.substring(0, 100))
                setToastAnimal(toastData.animal)
                setToastUsername(toastData.username)
                setShowNewMessageToast(true)
                setTimeout(() => setShowNewMessageToast(false), TOAST_TIMEOUT)
              }
            } else if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                data: {
                  title: isMentioned ? `🔔 ${msg.animal} ${msg.username} mentioned you` : `💬 ${msg.animal} ${msg.username}`,
                  body: msg.content.substring(0, 100),
                  icon: '/vite.svg',
                  badge: '/notification-badge.png',
                  tag: `message-${msg.id}`,
                  requireInteraction: true,
                  messageId: msg.id,
                  userId: authStore.user?.id || ''
                }
              })
            }
          }
        })
        if (playSound) playNotificationSoundDouble()
      }

      chatStore.syncMessages(msgs)
      if (CHECK_FILE_ON_NEW_MESSAGE) {
        performFileCleanup(msgs).catch(console.error)
      }

      if (isPrependingRef.current || lastActionRef.current === 'prepend') {
        setAction('idle')
        return
      }

      if (now < prependLockUntilRef.current) return

      const container = messagesContainerRef.current
      if (!container) return
      
      const manualScroll = Math.abs(container.scrollTop - lastKnownScrollTopRef.current) > 10 || 
                           (Date.now() - lastUserScrollTimeRef.current) < 150

      if (manualScroll) {
        lastKnownScrollTopRef.current = container.scrollTop
        return
      }

      if (shouldForceScrollRef.current || isUserNearBottom()) {
        scrollToBottom()
        shouldForceScrollRef.current = false
      }
      setAction('idle')
    })

    chatStore.setUnsubscribe(unsubscribe)

    const unsubUsers = subscribeToUsers((users) => {
      if (validateSession()) chatStore.setUsers(users)
    })
    chatStore.setUnsubscribeUsers(unsubUsers)

    const unsubCount = subscribeToMessageCount((cnt) => {
      if (validateSession()) chatStore.setMessageCount(cnt)
    })
    chatStore.setUnsubscribeMessageCount(unsubCount)

    stopPeriodicCleanupRef.current = schedulePeriodicCleanup(() => chatStore.messages, PERIODIC_CLEANUP_INTERVAL)

    return () => {
      chatStore.unsubscribeFromUpdates()
      if (stopPeriodicCleanupRef.current) stopPeriodicCleanupRef.current()
      document.removeEventListener('dragenter', dragEnter)
      document.removeEventListener('dragover', dragOver)
      document.removeEventListener('dragleave', dragLeave)
      document.removeEventListener('drop', drop)
    }
  }, [])

  const handleMessageKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Let standard behaviour handle new line
      } else {
        e.preventDefault()
        handleSendMessage()
      }
    } else {
      setTimeout(() => {
        setInputCursorPosition(e.currentTarget.selectionStart || 0)
      }, 0)
    }
  }

  const handleMentionSelect = (username: string) => {
    const result = insertMention(messageInput, inputCursorPosition, username)
    setMessageInput(result.text)
    setInputCursorPosition(result.cursorPosition)
    if (textareaRef.current) {
      textareaRef.current.focus()
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = result.cursorPosition
          textareaRef.current.selectionEnd = result.cursorPosition
        }
      }, 0)
    }
  }

  const handleSelectSticker = (sticker: Sticker) => {
    setPendingStickerData({
      id: sticker.id,
      type: sticker.type,
      content: sticker.content,
      name: sticker.name
    })
    setMessageInput(`[STIKER:${sticker.id}]`)
    setTimeout(handleSendMessage, 50)
  }

  const confirmDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId)
    setShowDeleteDialog(true)
  }

  const performDeleteMessage = () => {
    if (messageToDelete) {
      handleHideMessage(messageToDelete)
    }
    setShowDeleteDialog(false)
    setMessageToDelete(null)
  }

  const getMessageDisplayComponent = (message: Message) => {
    if (isStickerMessage(message.content)) {
      return <StickerMessage content={message.content} stickerData={message.stickerData} />
    }
    if (isCurlRequest(message.content)) {
      return <CurlMessage curl={message.content} />
    }
    const formatted = detectContentType(message.content)
    if (formatted.type === 'json' || formatted.type === 'code') {
      return <JsonMessage content={formatted.content} type={formatted.type} language={formatted.language} />
    }
    if (formatted.type === 'sql') {
      return <QueryMessage content={formatted.content} />
    }
    if (containsMentions(message.content)) {
      return <MentionMessage content={message.content} users={chatStore.users} isSent={isCurrentUser(message.userId)} />
    }
    // Normal content
    return <MentionMessage content={message.content} users={chatStore.users} isSent={isCurrentUser(message.userId)} />
  }

  return (
    <>
      {isGlobalDragover && (
        <div className="global-drop-zone-overlay">
          <div className="drop-zone-content">
            <i className="mdi mdi-cloud-upload-outline" style={{ fontSize: '120px', color: 'white', opacity: '0.9' }}></i>
            <h2 className="drop-zone-title">Drop Your File Here</h2>
            <p className="drop-zone-subtitle">Images, documents, photos - drop anything to upload</p>
          </div>
        </div>
      )}

      {showCopyToast && (
        <div className="toast-copy-popup">
          {copyToastMessage}
        </div>
      )}

      {showSessionExpiredToast && (
        <div className="toast-session-popup">
          {sessionExpiredMessage}
        </div>
      )}

      {error && <div className="toast-session-popup">{error}</div>}

      {showNewMessageToast && (
        <div className="toast-new-message" onClick={() => scrollToBottom()}>
          <span className="toast-avatar">{toastAnimal}</span>
          <div className="toast-body">
            <strong>{toastUsername}</strong>
            <p>{toastMessage}</p>
          </div>
        </div>
      )}

      <div className={`chat-container ${!isDark ? 'light-mode' : ''}`}>
        <header className="gradient-header d-flex align-center justify-between" style={{ padding: '0 16px', minHeight: '60px' }}>
          <div className="header-left d-flex align-center">
            <div className="logo-content" style={{ display: 'flex', alignItems: 'center', position: 'relative', marginRight: '12px' }}>
              <i className="mdi mdi-whatsapp text-white" style={{ fontSize: '24px' }}></i>
              <i className="mdi mdi-window-close text-white" style={{ fontSize: '18px', position: 'absolute', top: '-2px', right: '-4px' }}></i>
            </div>
            <div className="header-info">
              <h1 className="app-title" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>CHIT CHuT</h1>
              <div className="header-stats d-flex gap-2">
                <span className="stat-item-badge messages-count">
                  <i className="mdi mdi-message mr-1"></i> {chatStore.totalMessageCount}
                </span>
                <span className="stat-item-badge users-count">
                  <i className="mdi mdi-account-multiple mr-1"></i> {chatStore.users.length}
                </span>
              </div>
            </div>
          </div>

          <div className="header-right d-flex align-center gap-2">
            <div className="search-container position-relative">
              <input
                type="text"
                className="search-field-input"
                placeholder="Search chat..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={handleSearchClear}>
                  <i className="mdi mdi-close"></i>
                </button>
              )}
            </div>

            <button className="theme-toggle-mobile" onClick={toggleTheme}>
              <i className={`mdi ${isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'}`}></i>
            </button>

            <span className="user-chip">
              <span className="animal-emoji">{authStore.user?.animal}</span>
              <span className="username-text">{authStore.user?.username}</span>
            </span>

            <button className="logout-btn" onClick={handleLogout}>
              Logout <i className="mdi mdi-logout ml-1"></i>
            </button>
          </div>
        </header>

        <main className="chat-content">
          <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
            {chatStore.messages.length === 0 && (
              <div className="empty-state">
                <i className="mdi mdi-chat-outline" style={{ fontSize: '80px', opacity: 0.3 }}></i>
                <p>No messages yet</p>
                <p>Start the conversation! 👋</p>
              </div>
            )}

            <div className="messages-list">
              {isLoadingMore && (
                <div className="loading-more-indicator">
                  <div className="spinner"></div> Loading older messages...
                </div>
              )}

              {searchQuery.length >= 3 && (
                <div className="search-info-banner">
                  {isLoadingAllMessages ? 'Loading all messages...' : `${searchResults.length} results found`}
                </div>
              )}

              {displayMessages.map((message, index) => (
                <div key={message.id}>
                  {shouldShowDateSeparator(index, displayMessages) && (
                    <div className="date-separator">
                      <span className="date-text">{formatDateSeparator(message.timestamp)}</span>
                    </div>
                  )}

                  <div className="message-wrapper" data-message-id={message.id}>
                    <div 
                      className={`message-item ${isCurrentUser(message.userId) ? 'sent' : 'received'}`}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className="message-content-container">
                        {!isCurrentUser(message.userId) && (
                          <div className="message-header">
                            <div className="message-avatar" style={{ background: getAvatarColor(message.userId) }}>
                              <span className="avatar-emoji">{message.animal}</span>
                            </div>
                            <div className="message-sender-name">
                              {message.username}
                            </div>
                          </div>
                        )}

                        <div className={`message-card ${isCurrentUser(message.userId) ? 'message-sent' : 'message-received'}`}>
                          <div className="pa-3 d-flex flex-column" style={{ width: '100%' }}>
                            {message.replyTo && (
                              <div className="quoted-message" onClick={() => scrollToMessage(message.replyTo!.id)}>
                                <div className="quoted-content">
                                  <span className="quoted-emoji">{message.replyTo.animal}</span>
                                  <div className="quoted-text">
                                    <strong>{message.replyTo.username}</strong>
                                    <p>{message.replyTo.content}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {message.imageUrl && !message.hidden && (
                              <div className="image-display mb-2" onClick={() => openImageModal(message.imageUrl!)}>
                                <img src={message.imageUrl} alt={message.imageName || 'Image'} className="chat-image" />
                              </div>
                            )}

                            {message.fileUrl && !message.hidden && (
                              <div className="file-download-section mb-2" onClick={() => downloadFile(message.fileUrl, message.fileName)}>
                                <div className="file-card">
                                  <div className="d-flex align-center justify-between pa-3">
                                    <div className="d-flex align-center">
                                      <i className="mdi mdi-file-download mr-3" style={{ fontSize: '24px', color: 'var(--clr-primary-a0)' }}></i>
                                      <div>
                                        <p className="file-name" style={{ margin: 0 }}>{message.fileName}</p>
                                        <p className="file-size" style={{ margin: 0 }}>{formatFileSize(message.fileSize || 0)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Attachments array support */}
                            {message.attachments && message.attachments.length > 0 && !message.hidden && (
                              <div className="attachments-section d-flex flex-column gap-2 mb-2">
                                {message.attachments.map(att => (
                                  <div key={att.id}>
                                    {att.type === 'image' ? (
                                      <div className="image-display" onClick={() => openImageModal(att.url)}>
                                        <img src={att.url} alt={att.name} className="chat-image" />
                                      </div>
                                    ) : (
                                      <div className="file-card" onClick={() => downloadFile(att.url, att.name)}>
                                        <div className="d-flex align-center justify-between pa-3">
                                          <div className="d-flex align-center">
                                            <i className="mdi mdi-file-download mr-3" style={{ fontSize: '24px', color: 'var(--clr-primary-a0)' }}></i>
                                            <div>
                                              <p className="file-name" style={{ margin: 0 }}>{att.name}</p>
                                              <p className="file-size" style={{ margin: 0 }}>{formatFileSize(att.size)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="message-content">
                              {getMessageDisplayComponent(message)}
                            </div>

                            <div className="message-footer d-flex justify-between align-center mt-1">
                              <span className="message-time">{formatTime(message.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {hoveredMessageId === message.id && (
                        <div className="message-actions">
                          <button className="action-btn" title="Reply" onClick={() => setReply(message)}>
                            <i className="mdi mdi-reply"></i>
                          </button>
                          <button className="action-btn" title="Copy text" onClick={() => handleMessageCopy(message)}>
                            <i className="mdi mdi-content-copy"></i>
                          </button>
                          {isCurrentUser(message.userId) && !message.hidden && (
                            <button className="action-btn delete-btn" title="Delete" onClick={() => confirmDeleteMessage(message.id)}>
                              <i className="mdi mdi-delete"></i>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div className="input-section pa-4">
            {replyingTo && (
              <div className="reply-preview-container d-flex align-center justify-between">
                <div className="d-flex align-center">
                  <span className="reply-avatar">{replyingTo.animal}</span>
                  <div>
                    <strong>{replyingTo.username}</strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{replyingTo.content}</p>
                  </div>
                </div>
                <button className="cancel-reply-btn" onClick={cancelReply}>
                  <i className="mdi mdi-close"></i>
                </button>
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="file-previews-container d-flex gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="file-preview-card position-relative">
                    {isFileImage(file) && filePreviews[idx] ? (
                      <img src={filePreviews[idx]} alt="preview" className="preview-image" />
                    ) : (
                      <div className="file-icon-preview">
                        <i className="mdi mdi-file" style={{ fontSize: '32px' }}></i>
                        <span className="file-extension">{file.name.split('.').pop()?.toUpperCase()}</span>
                      </div>
                    )}
                    <button className="remove-preview-btn" onClick={() => removeFile(idx)}>
                      <i className="mdi mdi-close"></i>
                    </button>
                    {isUploading && (
                      <div className="upload-progress-bar" style={{ width: `${uploadProgress[idx] || 0}%` }}></div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="input-wrapper d-flex align-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              <button className="upload-btn" onClick={() => fileInputRef.current?.click()} title="Upload Files">
                <i className="mdi mdi-paperclip"></i>
              </button>

              <button className="sticker-btn" onClick={() => setShowStickerPicker(true)} title="Send Sticker">
                <i className="mdi mdi-sticker-emoji"></i>
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                className="message-input-textarea"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleMessageKeydown}
                onPaste={handlePasteFile}
              />

              <button className="send-btn" onClick={handleSendMessage} disabled={isLoading || isCompressing || (!messageInput.trim() && selectedFiles.length === 0)}>
                <i className="mdi mdi-send"></i>
              </button>
            </div>
          </div>
        </main>
      </div>

      <MentionDropdown
        text={messageInput}
        cursorPosition={inputCursorPosition}
        users={chatStore.users}
        currentUserId={authStore.user?.id}
        onSelect={handleMentionSelect}
      />

      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={handleSelectSticker}
      />

      {showImageModal && (
        <div className="image-lightbox-modal" onClick={() => setShowImageModal(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImageUrl} alt="Preview" />
            <button className="lightbox-close" onClick={() => setShowImageModal(false)}>
              <i className="mdi mdi-close"></i>
            </button>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="confirm-delete-modal-overlay">
          <div className="confirm-delete-modal">
            <h4>Delete Message?</h4>
            <p>Are you sure you want to delete this message? This action cannot be undone.</p>
            <div className="d-flex justify-end gap-2 mt-4">
              <button className="confirm-btn cancel" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              <button className="confirm-btn delete" onClick={performDeleteMessage}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Chat
