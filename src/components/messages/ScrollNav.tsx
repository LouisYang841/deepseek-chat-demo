import clsx from 'clsx'
import { useState } from 'react'
import { VirtualList } from '../base/VirtualList.js'
import styles from './ScrollNav.module.css'

export type ScrollNavItem = {
  id: string
  title: string
  branchAt: number
  branches: number
}

/**
 * 对话右侧的微缩导航：按用户消息生成，可点击跳转到对应提问。
 * 结构与官网 ScrollNav 一致：固定右侧 34px 竖条，hover 展开为 240px 的虚拟列表。
 */
export const ScrollNav = ({
  items,
  activeId,
  onSelect,
}: {
  items: ScrollNavItem[]
  activeId: string | null
  onSelect: (id: string) => void
}) => {
  const [hovered, setHovered] = useState(false)

  if (items.length < 2) {
    return null
  }

  return (
    <div
      className={styles.scrollNav}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.bg} aria-hidden />
      <div className={clsx(styles.wrapper, hovered && styles.show)}>
        <VirtualList
          className={styles.list}
          items={items}
          itemMinSize={30}
          itemEstimatedSize={30}
          itemResizable={false}
          paddingTop={15}
          paddingBottom={15}
          getKey={(item) => item.id}
          showScrollbar={false}
          catchWheel
        >
          {({ item }) => (
            <div
              className={clsx(styles.item, item.id === activeId && styles.active)}
              title={item.title}
              onClick={() => onSelect(item.id)}
            >
              {item.branches > 1 ? (
                <span
                  className={clsx(
                    styles.branch,
                    hovered && styles.branchShow,
                    item.id === activeId && styles.branchActive
                  )}
                >
                  {item.branchAt}
                  <span className={styles.branchSep} aria-hidden />
                  {item.branches}
                </span>
              ) : null}
              <div className={styles.title}>{item.title}</div>
              <div className={styles.indicator} aria-hidden>
                <div className={styles.line} />
              </div>
            </div>
          )}
        </VirtualList>
      </div>
    </div>
  )
}
