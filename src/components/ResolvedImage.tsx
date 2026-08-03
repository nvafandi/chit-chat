import React from 'react'
import { useResolvedFileUrl } from '@/hooks/useResolvedFileUrl'

interface ResolvedImageProps {
  src: string
  alt?: string
  className?: string
  onClick?: () => void
}

/**
 * Image that transparently handles chunked files:
 * large images uploaded in parts are reassembled before rendering.
 */
export const ResolvedImage: React.FC<ResolvedImageProps> = ({ src, alt, className, onClick }) => {
  const resolvedSrc = useResolvedFileUrl(src)
  return <img src={resolvedSrc} alt={alt} className={className} onClick={onClick} />
}

export default ResolvedImage
