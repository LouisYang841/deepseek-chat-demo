import type { MouseEvent } from 'react'
import type { Source } from '../../services/chat/view.js'
import { HoverCard, type HoverCardTrigger } from './HoverCard.js'
import { SourceCard } from './SourceCard.js'

/**
 * 正文里 [citation:N] 的数字角标：悬停预览来源，点击新标签打开。
 * 角标使用带 link 角色的 span，可嵌入链接文字。样式由 .ds-markdown-cite 提供。
 */
export const CitationLink = ({ source }: { source: Source }) => {
  const open = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    window.open(source.url, '_blank', 'noopener,noreferrer')
  }
  const renderTrigger: HoverCardTrigger = ({ domRef, domProps }) => (
    <span
      ref={domRef}
      className="ds-markdown-cite"
      // 官方 od：两位数引用最小宽度 20，单位数 14
      style={{ minWidth: String(source.index).length > 1 ? 20 : 14 }}
      {...domProps}
      role="link"
      onClick={open}
    >
      {source.index}
    </span>
  )
  return (
    <HoverCard renderTrigger={renderTrigger}>
      <SourceCard source={source} />
    </HoverCard>
  )
}
