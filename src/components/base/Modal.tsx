import clsx from 'clsx'
import { useCallback, useEffect, useId, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslate } from '../../i18n/index.js'
import { IconCloseOutline16 } from './icons.js'
import { IconButton } from './IconButton.js'
import { Fade, FadeInZoomIn } from './Transition.js'
import styles from './Modal.module.css'

/** 当前打开的弹窗，后打开的在末尾；叠放时 Esc 只关闭最上层 */
const openModals: object[] = []

/**
 * 遮罩 + 居中卡片。
 *
 * 动画与官网 `Modal`（模块 43377）一致：
 *   - 遮罩：ds-fade-in 100ms
 *   - 面板：ds-fade-in-zoom-in 0.96 → 1，100ms，transform-origin center
 * 关闭时先播放退出动画，`onExited` 后才回调 `onClose`，因此父组件可以安全卸载。
 */
export const Modal = ({
  title,
  children,
  footer,
  closable = false,
  className,
  mainClassName,
  onClose,
  width,
  closeRef,
  wrapperClassName,
}: {
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** 标题栏右侧显示关闭按钮 */
  closable?: boolean
  className?: string
  /** 内容区的 class */
  mainClassName?: string
  onClose: () => void
  /** 面板宽度（px），默认 380 */
  width?: number
  /** 暴露给内容区的关闭函数（会先播放退出动画） */
  closeRef?: MutableRefObject<(() => void) | null>
  /** 追加到 .ds-modal-wrapper 的类（官方 wrapperClassName） */
  wrapperClassName?: string
}) => {
  const t = useTranslate()
  const titleId = useId()
  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(true)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const requestClose = useCallback(() => {
    if (!open) {
      return
    }
    setOpen(false)
  }, [open])

  if (closeRef) {
    closeRef.current = requestClose
  }

  useEffect(() => {
    if (!open) {
      return
    }
    const token = {}
    openModals.push(token)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModals.at(-1) === token) {
        event.preventDefault()
        requestClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      openModals.splice(openModals.indexOf(token), 1)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, requestClose])

  if (!mounted) {
    return null
  }

  return createPortal(
    <>
      <Fade in={open} appear>
        {(nodeRef) => (
          <div
            ref={nodeRef}
            className="ds-modal-overlay"
            style={{ zIndex: 1000 }}
            onMouseDown={(event) => event.target === event.currentTarget && requestClose()}
          />
        )}
      </Fade>
      <div
        className={clsx(
          'ds-theme',
          'ds-modal-wrapper',
          !open && 'ds-modal-wrapper--hide',
          wrapperClassName
        )}
        data-transform-origin="center"
        style={{ zIndex: 1001 }}
      >
        <FadeInZoomIn
          in={open}
          appear
          onExited={() => {
            setMounted(false)
            onCloseRef.current()
          }}
        >
          {(nodeRef) => (
            <div ref={nodeRef} className="ds-modal">
              <div
                className={clsx(styles.content, className)}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                style={width ? { width } : undefined}
              >
                {title !== undefined || closable ? (
                  <div className={styles.header}>
                    <div id={titleId} className={styles.title}>
                      {title}
                    </div>
                    {closable ? (
                      <IconButton
                        className={styles.close}
                        tone="primary"
                        icon={<IconCloseOutline16 />}
                        aria-label={t('close')}
                        onClick={requestClose}
                      />
                    ) : null}
                  </div>
                ) : null}
                {children ? <div className={clsx(styles.main, mainClassName)}>{children}</div> : null}
                {footer ? <div className={styles.footer}>{footer}</div> : null}
              </div>
            </div>
          )}
        </FadeInZoomIn>
      </div>
    </>,
    document.body
  )
}
