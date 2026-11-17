import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { searchSessions, type SearchHit } from '../../services/chat/search.js'
import { selectSession } from '../../services/chat/store.js'
import { IconCloseOutline16, IconSearchOutline16 } from '../base/icons.js'
import { Modal } from '../base/Modal.js'
import { VirtualList } from '../base/VirtualList.js'
import { isMac } from '../../utils/platform.js'
import styles from './SessionSearch.module.css'

/** 官方 xb：搜索结果的会话图标（20×20） */
const ConversationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path
      d="M10 2C5.58162 2 2.00003 5.58162 2 10C2 11.2255 2.27557 12.3887 2.76953 13.4287L3.07422 14.0674L4.35059 13.4609L4.04785 12.8223L3.90332 12.4971C3.58796 11.7279 3.41406 10.8848 3.41406 10C3.41409 6.36278 6.36277 3.41407 10 3.41406C13.6372 3.41406 16.5859 6.36278 16.5859 10C16.5859 13.6372 13.6372 16.5859 10 16.5859C9.25515 16.5859 8.70984 16.5329 8.22656 16.3994C7.75059 16.2679 7.29925 16.0478 6.75879 15.6709C5.96644 15.1182 4.82978 14.9233 3.89355 15.5146L3.86426 15.5342L3.24121 15.9727L3.70996 17.3721L4.65918 16.7041C5.00017 16.4952 5.50572 16.5226 5.94824 16.8311C6.58879 17.2779 7.18624 17.5792 7.85059 17.7627C8.50781 17.9442 9.19541 18 10 18C14.4184 18 18 14.4184 18 10C18 5.58162 14.4184 2 10 2ZM6.25 10.5566V11.9707H10.1367V10.5566H6.25ZM6.25 9.23438H13.7852V7.82031H6.25V9.23438Z"
      fill="currentColor"
    />
  </svg>
)

/** 官方 i9.gD：用户消息右下角的默认头像（10×10） */
const UserAvatarIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M11.0307 5.46369C11.0305 3.78995 9.6734 2.43357 7.99961 2.43357C6.32601 2.43379 4.96972 3.79009 4.96949 5.46369C4.96949 7.13748 6.32587 8.49455 7.99961 8.49477C9.67354 8.49477 11.0307 7.13762 11.0307 5.46369ZM12.3163 5.46369C12.3163 7.84777 10.3837 9.78042 7.99961 9.78042C5.61572 9.7802 3.68288 7.84763 3.68288 5.46369C3.6831 3.07993 5.61586 1.14718 7.99961 1.14695C10.3836 1.14695 12.3161 3.0798 12.3163 5.46369Z"
      fill="currentColor"
    />
    <path
      d="M8.00002 10.3316C11.7343 10.3316 14.1864 11.8997 15.0387 14.4445L14.4292 14.6483L13.8197 14.8531C13.1955 12.9893 11.3673 11.6182 8.00002 11.6182C4.63277 11.6182 2.80455 12.9893 2.18031 14.8531L1.5708 14.6483L0.961304 14.4445C1.81368 11.8997 4.26579 10.3316 8.00002 10.3316Z"
      fill="currentColor"
    />
  </svg>
)

/** 官方 xD：分支徽标图标（10×10，色值 var(--dsw-alias-label-caption)） */
const BranchIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.17261 0.857422C8.80289 0.857551 9.31384 1.36911 9.31396 1.99939C9.31388 2.6297 8.80291 3.14062 8.17261 3.14075C7.68546 3.14075 7.27034 2.83545 7.10632 2.40588H2.72217C2.99623 2.66524 3.22413 2.97763 3.38562 3.33423L4.44153 5.66699C4.92829 6.74205 5.9694 7.45163 7.13684 7.52307C7.31783 7.13171 7.7132 6.85965 8.17261 6.85962C8.8027 6.85978 9.31393 7.37085 9.31396 8.00098C9.31394 8.63111 8.80271 9.14217 8.17261 9.14233C7.65835 9.1423 7.22335 8.80188 7.08069 8.33423C5.61675 8.24232 4.31238 7.35064 3.70178 6.00208L2.64526 3.66931C2.29689 2.90008 1.53049 2.40588 0.686035 2.40588V1.5929C0.691659 1.5929 0.697506 1.59347 0.703125 1.59351L7.10632 1.5929C7.27039 1.16332 7.68554 0.857422 8.17261 0.857422ZM8.17261 7.67261C7.99114 7.67264 7.84428 7.8195 7.84424 8.00098C7.84426 8.18246 7.99113 8.32992 8.17261 8.32996C8.35398 8.32979 8.50157 8.18238 8.50159 8.00098C8.50155 7.81958 8.35397 7.67277 8.17261 7.67261ZM8.17261 1.67041C7.99095 1.67041 7.84375 1.81776 7.84363 1.99939C7.84372 2.18105 7.99093 2.32837 8.17261 2.32837C8.35418 2.32824 8.5015 2.18097 8.50159 1.99939C8.50146 1.81784 8.35416 1.67054 8.17261 1.67041Z"
      fill="var(--dsw-alias-label-caption)"
    />
  </svg>
)

const pad = (value: number) => String(value).padStart(2, '0')

/** 与官网一致的搜索结果时间：今天显示 HH:mm，昨天显示「昨天」，同年显示 M月D日 */
const formatHitTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 会话搜索弹窗。
 *
 * 结构与官网一致：顶部居中、660px 宽、20px 圆角的面板，
 * 内含 36px 搜索图标、16px 输入框、竖分隔线与圆形关闭按钮。
 * 结果列表使用官方 ds-virtual-list，每项是 67px 的搜索结果卡片：
 * 左侧 40px 会话图标，用户消息额外带 20px 默认头像；右侧是会话标题、时间与命中片段。
 * 检索在本机 IndexedDB 上完成，不经过任何在线服务。
 */
export const SessionSearch = ({ onClose }: { onClose: () => void }) => {
  const t = useTranslate()
  const [keyword, setKeyword] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  // 官网状态机（known-issues-re.md 项 8）映射到本地检索：
  // - 10s 超时 → showStreamingTimeoutHint「时间可能有些久，请耐心等待...」
  // - 查询出错 → 「搜索失败，请检查网络或 重新加载」，点按钮整查重跑（retryLoadMoreFailed 的整查分支）
  const [slow, setSlow] = useState(false)
  const [failed, setFailed] = useState(false)
  const [runId, setRunId] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)
  const closeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 关键词变化后延迟检索，避免逐字符触发全库扫描
  useEffect(() => {
    const query = keyword.trim()
    if (!query) {
      setHits([])
      setSearching(false)
      setSlow(false)
      setFailed(false)
      return
    }
    setSearching(true)
    setSlow(false)
    setFailed(false)
    // 官网阈值 1e4ms：到点仍未出结果 → 慢查提示
    const slowTimer = setTimeout(() => setSlow(true), 10_000)
    const timer = setTimeout(() => {
      const id = ++requestRef.current
      void searchSessions(query)
        .then((result) => {
          if (requestRef.current === id) {
            setHits(result)
            setSearching(false)
            setSlow(false)
          }
        })
        .catch(() => {
          if (requestRef.current === id) {
            setHits([])
            setSearching(false)
            setSlow(false)
            setFailed(true)
          }
        })
    }, 200)
    return () => {
      clearTimeout(timer)
      clearTimeout(slowTimer)
    }
  }, [keyword, runId])

  const rows = useMemo(
    () => hits.map((hit) => ({ key: `hit-${hit.messageId}`, hit })),
    [hits]
  )

  return (
    <Modal
      className={clsx(styles.panel, keyword.trim() && styles.panelExpanded)}
      mainClassName={styles.main}
      wrapperClassName={styles.wrapper}
      closeRef={closeRef}
      onClose={onClose}
    >
      <div className={styles.body} role="dialog" aria-label={t('historySearchListAriaLabel')}>
        <div className={styles.bar}>
          <span className={styles.icon} aria-hidden>
            <IconSearchOutline16 />
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            value={keyword}
            placeholder={t('sessionSearchPlaceholder')}
            aria-label={t('historySearchListAriaLabel')}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <span className={styles.divider} aria-hidden />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.close}
              aria-label={t('batchSelectCloseButtonAriaLabel')}
              onClick={() => closeRef.current?.()}
            >
              <IconCloseOutline16 />
            </button>
          </div>
        </div>
        {keyword.trim() ? (
          <div className={styles.results} role="listbox" aria-label={t('historySearchListAriaLabel')}>
            {failed ? (
              <div className={styles.hint}>
                {t('historySearchFailed')}{' '}
                <button
                  type="button"
                  className={styles.retryButton}
                  onClick={() => setRunId((id) => id + 1)}
                >
                  {t('historySearchFailedRetryButton')}
                </button>
              </div>
            ) : searching ? (
              <div className={styles.hintStack}>
                <div>{t('sessionSearching')}</div>
                {/* 官网 10s 超时提示（historySearchLoadMoreTimeout） */}
                {slow ? <div className={styles.slowHint}>{t('historySearchLoadMoreTimeout')}</div> : null}
              </div>
            ) : hits.length === 0 ? (
              <div className={styles.hint}>{t('historySearchNoResultTip')}</div>
            ) : (
              <VirtualList
                className={styles.virtualList}
                items={rows}
                itemMinSize={67}
                itemEstimatedSize={67}
                itemResizable={false}
                paddingTop={8}
                paddingBottom={8}
                getKey={(row) => row.key}
              >
                {({ item }) => {
                  const hit = item.hit
                  return (
                    <button
                      type="button"
                      role="option"
                      className={styles.result}
                      onClick={() => {
                        selectSession(hit.sessionId)
                        closeRef.current?.()
                      }}
                    >
                      <span className={styles.resultIcon} aria-hidden>
                        <span className={styles.conversationIcon}>
                          <ConversationIcon />
                        </span>
                        {hit.role === 'user' ? (
                          <span className={styles.userAvatar}>
                            <UserAvatarIcon />
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.resultBody}>
                        <span className={styles.resultHeader}>
                          <span className={styles.resultTitle}>
                            {hit.sessionTitle || t('untitledChat')}
                          </span>
                          <span className={styles.resultTime}>{formatHitTime(hit.updatedAt)}</span>
                        </span>
                        <span className={styles.resultSnippetRow}>
                          {hit.totalBranches > 1 ? (
                            <span className={styles.branchBadge}>
                              <BranchIcon />
                              <span>
                                {hit.branchIndex}/{hit.totalBranches}
                              </span>
                            </span>
                          ) : null}
                          <span className={styles.resultSnippet}>{hit.snippet}</span>
                        </span>
                      </span>
                    </button>
                  )
                }}
              </VirtualList>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

/** 供快捷键提示使用：Mac 显示 ⌘ K */
export const searchShortcutLabel = () => (isMac() ? '⌘ K' : 'Ctrl K')
