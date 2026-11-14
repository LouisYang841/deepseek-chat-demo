import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useIsMobile } from '../../app/viewport.js'
import {
  buildMessageVersions,
  getVisibleMessages,
  type MessageVersions,
} from '../../services/chat/branches.js'
import { selectMessageVersion } from '../../services/chat/store.js'
import type { Session } from '../../services/chat/types.js'
import { closeSearchPanel } from '../search/searchPanelState.js'
import { ScrollGutters } from '../base/ScrollGutters.js'
import { AssistantMessage } from './AssistantMessage.js'
import { ScrollNav, type ScrollNavItem } from './ScrollNav.js'
import { ScrollToBottomContext } from './scrollContext.js'
import { UserMessage } from './UserMessage.js'
import type { Message } from '../../services/chat/types.js'

/**
 * 会话共用可重试的附件上传失败入口，覆盖当前提问与历史消息中的附件。
 * 点击后按失败的回答重新补传附件并请求。
 */
const getUploadRetryId = (messages: Message[], streaming: boolean) => {
  const last = messages.at(-1)
  return !streaming &&
    last?.role === 'assistant' &&
    last.status === 'error' &&
    last.error?.kind === 'upload' &&
    last.error.retryable
    ? last.id
    : null
}
import styles from './MessageList.module.css'

/** 距底部小于该值时视为在底部，流式内容增长时跟随 */
const STICKY_THRESHOLD = 40
const EMPTY_VERSIONS: MessageVersions = { ids: [], index: -1 }

export const MessageList = ({
  session,
  streaming,
  footer,
}: {
  session: Session
  streaming: boolean
  footer: React.ReactNode
}) => {
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef(true)
  const scrollTopRef = useRef(0)
  const restoreScrollRef = useRef<{ messageId: string; top: number } | null>(null)
  const messages = getVisibleMessages(session)
  const [activeNavId, setActiveNavId] = useState<string | null>(null)
  const [previousVersions, setPreviousVersions] = useState(() =>
    buildMessageVersions(session, new Map())
  )
  const versions = useMemo(
    () => buildMessageVersions(session, previousVersions),
    [session, previousVersions]
  )
  if (versions !== previousVersions) {
    setPreviousVersions(versions)
  }
  const lastMessageId = messages.at(-1)?.id
  const navItems = useMemo<ScrollNavItem[]>(
    () =>
      messages
        .filter((message) => message.role === 'user')
        .map((message) => {
          const version = versions.get(message.id)
          return {
            id: message.id,
            title: message.content.split('\n')[0].trim() || '…',
            branchAt: version ? version.index + 1 : 1,
            branches: version ? version.ids.length : 1,
          }
        }),
    [messages, versions]
  )

  // 右侧导航高亮：以视口上方 80px 为基准，找最后一条越过的用户消息
  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll || navItems.length < 2) {
      return
    }
    const update = () => {
      let current = navItems[0]?.id ?? null
      const base = scroll.getBoundingClientRect().top
      for (const item of navItems) {
        const node = scroll.querySelector<HTMLElement>(
          `[data-message-id="${CSS.escape(item.id)}"]`
        )
        if (node && node.getBoundingClientRect().top - base <= 80) {
          current = item.id
        }
      }
      setActiveNavId(current)
    }
    update()
    scroll.addEventListener('scroll', update, { passive: true })
    return () => scroll.removeEventListener('scroll', update)
  }, [navItems, isMobile, session.id])

  const scrollToMessage = useCallback((messageId: string) => {
    const scroll = scrollRef.current
    if (!scroll) {
      return
    }
    const target = scroll.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(messageId)}"]`
    )
    if (!target) {
      return
    }
    stickyRef.current = false
    const delta = target.getBoundingClientRect().top - scroll.getBoundingClientRect().top
    scroll.scrollTo({ top: scroll.scrollTop + delta - 12, behavior: 'smooth' })
    setActiveNavId(messageId)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el && stickyRef.current) {
      el.scrollTop = el.scrollHeight
      scrollTopRef.current = el.scrollTop
    }
  }, [])

  // 内容、键盘和输入框高度变化时，继续遵循当前跟随状态。
  useLayoutEffect(() => {
    const content = contentRef.current
    const scroll = scrollRef.current
    if (!content || !scroll) {
      return
    }
    const observer = new ResizeObserver(scrollToBottom)
    observer.observe(content)
    observer.observe(scroll)
    return () => observer.disconnect()
  }, [isMobile, scrollToBottom])

  // 切换版本后将选择器留在原位置，避免回答长短变化导致操作区跳出视口。
  useLayoutEffect(() => {
    const anchor = restoreScrollRef.current
    const scroll = scrollRef.current
    if (anchor && scroll) {
      const switcher = scroll.querySelector<HTMLElement>(
        `[data-message-version="${CSS.escape(anchor.messageId)}"]`
      )
      if (switcher) {
        scroll.scrollTop += switcher.getBoundingClientRect().top - anchor.top
      }
      restoreScrollRef.current = null
      return
    }
    stickyRef.current = true
    scrollToBottom()
  }, [session.id, lastMessageId, scrollToBottom])

  useEffect(closeSearchPanel, [session.id, lastMessageId])

  const selectVersion = useCallback(
    (messageId: string, anchorTop: number) => {
      if (streaming) {
        return
      }
      restoreScrollRef.current = { messageId, top: anchorTop }
      stickyRef.current = false
      closeSearchPanel()
      selectMessageVersion(session.id, messageId)
    },
    [session.id, streaming]
  )

  // 跨移动端断点时切换滚动层，并保持输入框及当前阅读位置。
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    if (stickyRef.current) {
      scrollToBottom()
    } else {
      el.scrollTop = scrollTopRef.current
    }
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD
      // 仅在用户向上滚动时停止跟随底部，布局或内容增高时保持跟随状态。
      if (nearBottom) {
        stickyRef.current = true
      } else if (el.scrollTop < scrollTopRef.current) {
        stickyRef.current = false
      }
      scrollTopRef.current = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [isMobile, scrollToBottom])

  // 宽表格（≥4 列）要突破正文列宽：把滚动区宽度写进 CSS 变量，供 .column 里的表格使用
  const [scrollWidth, setScrollWidth] = useState(0)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const update = () => setScrollWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [isMobile])

  const lastIndex = messages.length - 1
  const uploadRetryId = getUploadRetryId(messages, streaming)
  return (
    <ScrollToBottomContext.Provider value={scrollToBottom}>
      <div className="ds-scroll-host">
        <div
          ref={isMobile ? undefined : scrollRef}
          className={styles.container}
          data-ds-scroll-area
          style={
            scrollWidth
              ? ({ '--message-list-scroll-width': `${scrollWidth}px` } as React.CSSProperties)
              : undefined
          }
        >
        <div ref={isMobile ? scrollRef : undefined} className={styles.scroll}>
          <div ref={contentRef} className={styles.column}>
            {messages.map((message, index) =>
              message.role === 'user' ? (
                <UserMessage
                  key={message.id}
                  sessionId={session.id}
                  message={message}
                  retryUploadId={uploadRetryId}
                  isFirst={index === 0}
                  isLast={index === lastIndex || index === lastIndex - 1}
                  busy={streaming}
                  versions={versions.get(message.id) ?? EMPTY_VERSIONS}
                  onSelectVersion={selectVersion}
                />
              ) : (
                <AssistantMessage
                  key={message.id}
                  sessionId={session.id}
                  message={message}
                  isLast={index === lastIndex}
                  streaming={streaming && index === lastIndex}
                  busy={streaming}
                  versions={versions.get(message.id) ?? EMPTY_VERSIONS}
                  onSelectVersion={selectVersion}
                />
              )
            )}
          </div>
        </div>
        {footer}
        </div>
        {isMobile ? null : <ScrollGutters targetRef={scrollRef} />}
      </div>
      <ScrollNav items={navItems} activeId={activeNavId} onSelect={scrollToMessage} />
    </ScrollToBottomContext.Provider>
  )
}