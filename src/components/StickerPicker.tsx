import React, { useState, useMemo, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { 
  getStickerCategories, 
  getStickersByCategory,
  saveCustomStickerWithSync,
  deleteCustomSticker,
  type Sticker 
} from '@/utils/stickers'
import { compressImageMaximum } from '@/utils/imageCompression'

interface StickerPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (sticker: Sticker) => void
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const authStore = useAuthStore()
  const [activeCategory, setActiveCategory] = useState<string>('emotions')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const categories = useMemo(() => getStickerCategories(), [])

  const currentCategoryStickers = useMemo(() => {
    return getStickersByCategory(activeCategory)
  }, [activeCategory])

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      emotions: '😊',
      hands: '👋',
      animals: '🐱',
      objects: '🎁',
      custom: '⭐',
    }
    return icons[category] || '🎨'
  }

  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setUploadError('')

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB')
      return
    }

    try {
      setIsCompressing(true)

      const compressionResult = await compressImageMaximum(file)
      
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string
          const customSticker = await saveCustomStickerWithSync(file, dataUrl, authStore.user?.id || '')
          
          onSelect(customSticker)
          onClose()
          console.log('[StickerPicker] Custom sticker created:', customSticker.id)
        } catch (err) {
          setUploadError(`Failed to save sticker: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
      reader.readAsDataURL(compressionResult.blob)
    } catch (err) {
      setUploadError(`Compression error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('[StickerPicker] Compression error:', err)
    } finally {
      setIsCompressing(false)
      event.target.value = ''
    }
  }

  const handleDeleteSticker = (stickerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Delete this custom sticker?')) {
      if (deleteCustomSticker(stickerId)) {
        console.log('[StickerPicker] Custom sticker deleted:', stickerId)
      } else {
        setUploadError('Failed to delete sticker')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="sticker-modal-overlay" onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: `
        .sticker-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          backdrop-filter: blur(4px);
        }
        .sticker-modal-card {
          background: var(--clr-surface-a0);
          color: var(--text-primary);
          width: 90%;
          max-width: 500px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          max-height: 80vh;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        :global(html.dark) .sticker-modal-card {
          background: var(--clr-surface-a10);
        }
        .sticker-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        .sticker-modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
        }
        .sticker-close-btn {
          background: none;
          border: none;
          color: inherit;
          font-size: 1.2rem;
          cursor: pointer;
        }
        .sticker-category-tabs {
          display: flex;
          overflow-x: auto;
          border-bottom: 1px solid var(--border);
          background: var(--clr-surface-a10);
        }
        .sticker-tab-button {
          flex: 1;
          padding: 12px;
          border: none;
          background: none;
          color: inherit;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .sticker-tab-button.active {
          border-bottom-color: var(--clr-primary-a0);
          color: var(--clr-primary-a0);
          background: var(--clr-surface-a0);
        }
        .sticker-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .upload-area {
          padding: 16px;
          border: 1px dashed var(--border);
          border-radius: 8px;
          text-align: center;
          margin-bottom: 16px;
        }
        .upload-button {
          background: var(--clr-primary-a0);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .upload-button:hover {
          background: var(--clr-primary-a10);
        }
        .sticker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 12px;
        }
        .sticker-item-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sticker-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border: 2px solid transparent;
          border-radius: 8px;
          background: var(--clr-surface-a10);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
          min-height: 85px;
          width: 100%;
          color: inherit;
        }
        .sticker-item:hover {
          border-color: var(--clr-primary-a0);
          background: var(--clr-surface-tonal-a0);
          transform: translateY(-2px);
        }
        .sticker-emoji {
          font-size: 40px;
          line-height: 1;
        }
        .sticker-image {
          max-width: 50px;
          max-height: 50px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 4px;
        }
        .sticker-name {
          text-align: center;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
          font-size: 11px;
        }
        .sticker-delete-btn {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--clr-surface-a0);
          border: 1px solid var(--border);
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--clr-danger-a10);
          font-size: 0.8rem;
        }
        .sticker-delete-btn:hover {
          background: var(--clr-danger-a10);
          color: white;
        }
        .empty-state {
          text-align: center;
          padding: 32px 16px;
          color: var(--text-secondary);
        }
        .empty-state i {
          font-size: 3rem;
          margin-bottom: 8px;
          display: block;
        }
      ` }} />
      <div className="sticker-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="sticker-modal-header">
          <h3>Select Sticker</h3>
          <button className="sticker-close-btn" onClick={onClose}>
            <i className="mdi mdi-close"></i>
          </button>
        </div>
        <div className="sticker-category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              className={`sticker-tab-button ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {getCategoryIcon(category)} {capitalize(category)}
            </button>
          ))}
        </div>
        <div className="sticker-modal-body">
          {activeCategory === 'custom' && (
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <button className="upload-button" onClick={() => fileInputRef.current?.click()}>
                <i className="mdi mdi-image-plus mr-1"></i> Upload Photo as Sticker
              </button>
              {uploadError && (
                <div style={{ color: 'var(--clr-danger-a10)', marginTop: '8px', fontSize: '13px' }}>
                  {uploadError}
                </div>
              )}
              {isCompressing && (
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  Compressing image...
                </div>
              )}
            </div>
          )}

          <div className="sticker-grid">
            {currentCategoryStickers.map((sticker) => (
              <div key={sticker.id} className="sticker-item-wrapper">
                <button className="sticker-item" title={sticker.name} onClick={() => { onSelect(sticker); onClose(); }}>
                  {sticker.type === 'emoji' ? (
                    <span className="sticker-emoji">{sticker.content}</span>
                  ) : (
                    <img src={sticker.content} alt={sticker.name} className="sticker-image" />
                  )}
                  <span className="sticker-name">{sticker.name}</span>
                </button>
                {activeCategory === 'custom' && (
                  <button className="sticker-delete-btn" onClick={(e) => handleDeleteSticker(sticker.id, e)}>
                    <i className="mdi mdi-delete"></i>
                  </button>
                )}
              </div>
            ))}
          </div>

          {currentCategoryStickers.length === 0 && activeCategory === 'custom' && (
            <div className="empty-state">
              <i className="mdi mdi-image-off"></i>
              <p>No custom stickers. Upload a photo to create your first custom sticker!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StickerPicker
