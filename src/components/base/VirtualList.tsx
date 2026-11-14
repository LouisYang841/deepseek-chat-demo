import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react'
import clsx from 'clsx'

export type VirtualListHandle = {
  listElRef: RefObject<HTMLDivElement | null>
  scrollTo: (options: {
    top?: number
    index?: number
    position?: 'top' | 'bottom'
    debounce?: boolean
    scrollMarginTop?: number
    scrollMarginBottom?: number
  }) => void
  getOffsetTopOfKey: (key: string) => number | undefined
}

export type VirtualListItemRenderArgs<T> = {
  item: T
  index: number
  key: string
  domRef: undefined
  style: CSSProperties
}

export type VirtualListProps<T> = {
  items: T[]
  /** 未测量前的估计行高（官方 itemMinSize / itemEstimatedSize） */
  itemMinSize: number
  itemEstimatedSize?: number
  itemResizable?: boolean
  paddingTop?: number
  paddingBottom?: number
  className?: string
  itemsClassName?: string
  itemsStyle?: CSSProperties
  showScrollbar?: boolean
  catchWheel?: boolean
  style?: CSSProperties
  getKey: (item: T) => string | number
  children: (args: VirtualListItemRenderArgs<T>) => ReactNode
  header?: ReactNode
  footer?: ReactNode
  empty?: ReactNode | ((args: { domRef: RefObject<HTMLDivElement | null> }) => ReactNode)
  emptyAlign?: 'start' | 'center'
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  focusable?: boolean
  componentRef?: MutableRefObject<VirtualListHandle | null>
}

const OVERSCAN = 320

const findStartIndex = (offsets: number[], top: number) => {
  let low = 0
  let high = offsets.length - 1
  let result = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    if (offsets[mid] <= top) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}

/**
 * 官方 `ds-virtual-list` 的移植（简化版核心行为）。
 *
 * 结构与官网一致：
 *   .ds-virtual-list
 *     .ds-virtual-list-items          ← 总高度撑开滚动条
 *       .ds-virtual-list-visible-items ← 只渲染可视区 + overscan 的条目
 * 支持固定/动态行高（ResizeObserver 实测）、paddingTop/Bottom、header/footer、
 * 空状态，以及 `scrollTo({ index | top | position })` / `getOffsetTopOfKey`。
 */
export const VirtualList = <T,>({
  items,
  itemMinSize,
  itemEstimatedSize,
  paddingTop = 0,
  paddingBottom = 0,
  className,
  itemsClassName,
  itemsStyle,
  showScrollbar = false,
  catchWheel = false,
  style,
  getKey,
  children,
  header,
  footer,
  empty,
  emptyAlign = 'center',
  onScroll,
  focusable = false,
  componentRef,
}: VirtualListProps<T>) => {
  const listRef = useRef<HTMLDivElement>(null)
  const heights = useRef(new Map<string, number>())
  const observers = useRef(new Map<string, ResizeObserver>())
  const [scrollTop, setScrollTop] = useReducer((_: number, next: number) => next, 0)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const viewportHeight = useRef(0)

  const estimate = itemEstimatedSize ?? itemMinSize

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) {
      return
    }
    const update = () => {
      viewportHeight.current = el.clientHeight
      forceUpdate()
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 每帧根据已测量高度计算每条 item 的 offset
  const offsets: number[] = []
  let totalHeight = paddingTop
  for (const item of items) {
    offsets.push(totalHeight)
    totalHeight += heights.current.get(String(getKey(item))) ?? estimate
  }
  totalHeight += paddingBottom

  const start = Math.max(0, findStartIndex(offsets, scrollTop - OVERSCAN))
  let end = start
  const visibleBottom = scrollTop + viewportHeight.current + OVERSCAN
  while (end < items.length && offsets[end] < visibleBottom) {
    end++
  }
  end = Math.min(items.length, Math.max(end, start + 1))

  const observeItem = useCallback((key: string, element: HTMLElement | null) => {
    const existing = observers.current.get(key)
    if (!element) {
      // 条目滚出可视区被卸载：断开观察，但保留已测高度，避免把高度写成 0
      existing?.disconnect()
      observers.current.delete(key)
      return
    }
    if (existing) {
      return
    }
    const observer = new ResizeObserver(() => {
      if (!element.isConnected) {
        return
      }
      const next = element.offsetHeight
      if (next <= 0) {
        return
      }
      const prev = heights.current.get(key)
      if (prev === undefined || Math.abs(prev - next) > 0.5) {
        heights.current.set(key, next)
        forceUpdate()
      }
    })
    observer.observe(element)
    observers.current.set(key, observer)
  }, [])

  useImperativeHandle(
    componentRef,
    () => {
      const getOffsets = () => {
        const result: number[] = []
        let acc = paddingTop
        for (const item of items) {
          result.push(acc)
          acc += heights.current.get(String(getKey(item))) ?? estimate
        }
        return result
      }
      return {
        listElRef: listRef,
        scrollTo: ({ top, index, position, scrollMarginTop = 0, scrollMarginBottom = 0 }) => {
          const el = listRef.current
          if (!el) {
            return
          }
          let nextTop = top ?? 0
          if (index !== undefined) {
            nextTop = Math.max(0, (getOffsets()[index] ?? 0) - scrollMarginTop)
          }
          if (position === 'bottom') {
            nextTop = el.scrollHeight
          }
          el.scrollTop = nextTop
          setScrollTop(el.scrollTop)
          void scrollMarginBottom
        },
        getOffsetTopOfKey: (key: string) => {
          const index = items.findIndex((item) => String(getKey(item)) === key)
          return index >= 0 ? getOffsets()[index] : undefined
        },
      }
    },
    [items, getKey, paddingTop, estimate]
  )

  return (
    <div
      ref={listRef}
      className={clsx(
        'ds-virtual-list',
        showScrollbar && 'ds-virtual-list--show-scrollbar',
        emptyAlign === 'center' && items.length === 0 && 'ds-virtual-list--empty-centered',
        className
      )}
      style={style}
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop)
        onScroll?.(event)
      }}
      onWheel={(event) => {
        if (catchWheel) {
          event.stopPropagation()
        }
      }}
      tabIndex={focusable ? 0 : -1}
    >
      {header}
      {items.length > 0 ? (
        <div
          className={clsx('ds-virtual-list-items', itemsClassName)}
          style={{ position: 'relative', height: totalHeight, ...itemsStyle }}
        >
          <div className="ds-virtual-list-visible-items">
            {items.slice(start, end).map((item, indexInSlice) => {
              const index = start + indexInSlice
              const key = String(getKey(item))
              const itemStyle: CSSProperties = {
                position: 'absolute',
                top: offsets[index],
                left: 0,
                right: 0,
              }
              return (
                <div
                  key={key}
                  data-virtual-list-item-key={key}
                  ref={(element) => observeItem(key, element)}
                  style={itemStyle}
                >
                  {children({ item, index, key, domRef: undefined, style: {} })}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          className={clsx(
            'ds-virtual-list-empty',
            emptyAlign === 'center' && 'ds-virtual-list-empty--center'
          )}
        >
          {typeof empty === 'function' ? empty({ domRef: listRef }) : empty}
        </div>
      )}
      {footer}
    </div>
  )
}
