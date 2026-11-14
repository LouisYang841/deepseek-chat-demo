import { useEffect, useState, type RefObject } from 'react'

/**
 * 官方滚动条（`.ds-scroll-area__gutters`）的复刻：隐藏原生滚动条后，
 * 用一层覆盖在滚动容器上的自绘条来显示位置与进度。
 *
 * 行为与官网一致：
 *   - 条宽 6px、圆角 100px、距右 2px、上下各留 2px/16px；
 *   - 容器 hover 时淡入，离开后延迟 1s 淡出（CSS 负责）；
 *   - 悬停整条加宽 2px 并加深颜色（CSS 负责）。
 */
export const ScrollGutters = ({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) => {
  const [bar, setBar] = useState<{ height: number; top: number } | null>(null)

  useEffect(() => {
    const el = targetRef.current
    if (!el) {
      return
    }
    let frame = 0
    const measure = () => {
      frame = 0
      const { scrollTop, scrollHeight, clientHeight } = el
      if (scrollHeight <= clientHeight + 1) {
        setBar(null)
        return
      }
      const ratio = clientHeight / scrollHeight
      const height = Math.max(Math.round(ratio * clientHeight), 24)
      const maxTop = clientHeight - height
      const progress = scrollTop / (scrollHeight - clientHeight)
      setBar({ height, top: Math.round(Math.min(progress, 1) * maxTop) })
    }
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(measure)
      }
    }
    measure()
    el.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(el)
    // 内容高度变化（虚拟列表、流式输出）同样要重算
    const content = el.firstElementChild
    if (content) {
      observer.observe(content)
    }
    const mutation = new MutationObserver(schedule)
    mutation.observe(el, { childList: true, subtree: true })
    return () => {
      if (frame) {
        cancelAnimationFrame(frame)
      }
      el.removeEventListener('scroll', schedule)
      observer.disconnect()
      mutation.disconnect()
    }
  }, [targetRef])

  return (
    <div className="ds-scroll-area__gutters" aria-hidden>
      <div className="ds-scroll-area__vertical-gutter" style={{ top: 16, bottom: 2, right: 2, width: 6 }}>
        <div
          className="ds-scroll-area__vertical-bar"
          style={bar ? { height: bar.height, top: bar.top, display: 'block' } : { display: 'none' }}
        />
      </div>
    </div>
  )
}
