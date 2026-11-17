import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { IconChevronRightOutline14 } from './icons.js'
import { IconButton } from './IconButton.js'
import styles from './ScrollArrows.module.css'

/**
 * 官网 ScrollArrows（f$，模块 74180）的移植：
 * - 容器自身 overflow:auto（隐藏滚动条），内容行作为 children 传入；
 * - 首尾各放一个哨兵 div，用 IntersectionObserver（root=容器）判断可见性，
 *   首哨兵不可见 → 显示左箭头，尾哨兵不可见 → 显示右箭头；
 * - 点箭头 scrollBy ±200（smooth）；滚轮 deltaY 转横向滚动（clamp 60，instant）；
 * - 箭头 = sticky 宽度 0 容器 + 80px 渐变遮罩，左态遮罩整体 rotate(180deg)。
 */
export const ScrollArrows = ({
  children,
  className,
  wrapperClassName,
}: {
  children: ReactNode
  /** 内容行的类（官网 d316d158） */
  className?: string
  /** 滚动容器的类（官网 ab016168） */
  wrapperClassName?: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const beginRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [beginVisible, setBeginVisible] = useState(true)
  const [endVisible, setEndVisible] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === beginRef.current) {
            setBeginVisible(entry.isIntersecting)
          } else if (entry.target === endRef.current) {
            setEndVisible(entry.isIntersecting)
          }
        }
      },
      { root: container, threshold: 0 }
    )
    if (beginRef.current) {
      observer.observe(beginRef.current)
    }
    if (endRef.current) {
      observer.observe(endRef.current)
    }
    return () => observer.disconnect()
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    containerRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    // 官网原始逻辑：竖向滚轮转为横向滚动，单次最多 60px
    if (event.deltaX === 0 && event.deltaY !== 0) {
      const delta = Math.min(event.deltaY, 60)
      event.currentTarget.scrollBy({ left: delta, behavior: 'instant' as ScrollBehavior })
    }
  }

  return (
    <div ref={containerRef} className={clsx(styles.container, wrapperClassName)} onWheel={onWheel}>
      {!beginVisible ? (
        <div className={clsx(styles.arrowWrap, styles.arrowWrapLeft)}>
          <div className={styles.mask}>
            <IconButton
              size="m"
              tone="tertiary"
              icon={<IconChevronRightOutline14 />}
              onClick={() => scroll('left')}
            />
          </div>
        </div>
      ) : null}
      <div ref={beginRef} className={styles.sentinelStart} />
      <div className={className}>{children}</div>
      <div ref={endRef} className={styles.sentinelEnd} />
      {!endVisible ? (
        <div className={clsx(styles.arrowWrap, styles.arrowWrapRight)}>
          <div className={styles.mask}>
            <IconButton
              size="m"
              tone="tertiary"
              icon={<IconChevronRightOutline14 />}
              onClick={() => scroll('right')}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
