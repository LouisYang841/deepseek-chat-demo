import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslate } from '../../i18n/index.js'
import { IconButton } from '../base/IconButton.js'
import { IconCloseOutline16, IconFullscreenOutline16, IconLinkOutline16 } from '../base/icons.js'
import { useImageViewer, closeImageViewer } from './imageViewerState.js'
import styles from './ImageViewer.module.css'

/**
 * 图片大图预览（官网 fullScreen）：遮罩 + 居中图片，支持滚动缩放、
 * 全屏（浏览器 Fullscreen API）、新标签页打开原图与关闭。
 */
export const ImageViewer = () => {
  const t = useTranslate()
  const { src, alt } = useImageViewer()
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setScale(1)
  }, [src])

  useEffect(() => {
    if (!src) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeImageViewer()
      }
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      event.preventDefault()
      setScale((value) => Math.min(4, Math.max(0.25, +(value - event.deltaY / 500).toFixed(2))))
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [src])

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current
    if (!element) {
      return
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void element.requestFullscreen()
    }
  }, [])

  if (!src) {
    return null
  }

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={alt || t('fullScreen')}
      onClick={closeImageViewer}
    >
      <div className={styles.stage} ref={containerRef} onClick={(event) => event.stopPropagation()}>
        <img className={styles.image} src={src} alt={alt} style={{ transform: `scale(${scale})` }} />
      </div>
      <div className={styles.toolbar} onClick={(event) => event.stopPropagation()}>
        <IconButton
          icon={<IconFullscreenOutline16 />}
          tooltip={t('fullScreen')}
          tooltipPlacement="top"
          onClick={toggleFullscreen}
        />
        <a
          className={styles.open}
          href={src}
          target="_blank"
          rel="noreferrer"
          aria-label={src}
        >
          <IconLinkOutline16 />
        </a>
        <IconButton
          icon={<IconCloseOutline16 />}
          tooltip={t('closeImage')}
          tooltipPlacement="top"
          onClick={closeImageViewer}
        />
      </div>
    </div>,
    document.body
  )
}
