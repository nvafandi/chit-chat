import React, { useState, useEffect, useMemo } from 'react'
import { getStickerById, extractStickerId, fetchCustomStickerFromFirestore } from '@/utils/stickers'
import type { Sticker } from '@/utils/stickers'

interface StickerMessageProps {
  content: string
  stickerData?: {
    id: string
    type: 'emoji' | 'image'
    content: string
    name: string
  }
}

export const StickerMessage: React.FC<StickerMessageProps> = ({ content, stickerData }) => {
  const [sticker, setSticker] = useState<Sticker | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const stickerId = useMemo(() => {
    return extractStickerId(content)
  }, [content])

  useEffect(() => {
    async function loadSticker() {
      if (stickerData) {
        console.log('[StickerMessage] Using embedded sticker data from message:', stickerData.id)
        setSticker(stickerData as Sticker)
        setIsLoading(false)
        return
      }

      if (!stickerId) return
      
      const localSticker = getStickerById(stickerId)
      if (localSticker) {
        console.log('[StickerMessage] Sticker found locally:', stickerId)
        setSticker(localSticker)
        setIsLoading(false)
        return
      }
      
      if (stickerId.startsWith('custom_')) {
        console.log('[StickerMessage] Fetching custom sticker from Firestore:', stickerId)
        setIsLoading(true)
        try {
          const firestoreSticker = await fetchCustomStickerFromFirestore(stickerId)
          if (firestoreSticker) {
            console.log('[StickerMessage] Sticker loaded from Firestore:', stickerId)
            setSticker(firestoreSticker)
          } else {
            console.warn('[StickerMessage] Sticker not found in Firestore:', stickerId)
          }
        } catch (err) {
          console.error('[StickerMessage] Error fetching sticker:', err)
        } finally {
          setIsLoading(false)
        }
      }
    }

    setSticker(null)
    loadSticker()
  }, [content, stickerData, stickerId])

  return (
    <div className="sticker-message-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: var(--clr-primary-a0);
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` }} />
      {sticker ? (
        <div className="sticker-display" title={`Sticker: ${sticker.name}`}>
          {sticker.type === 'emoji' ? (
            <span className="sticker-emoji">{sticker.content}</span>
          ) : (
            <img 
              src={sticker.content}
              alt={sticker.name}
              className="sticker-image"
            />
          )}
        </div>
      ) : isLoading ? (
        <div className="sticker-loading">
          <div className="spinner"></div>
        </div>
      ) : null}
    </div>
  )
}

export default StickerMessage
