import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import {
  IconChevronDownOutline14,
  IconPanelLeftOutline16,
  IconSearchOutline16,
  NewChatIcon,
} from '../base/icons.js'
import { DeepSeekWordmark } from '../base/brand.js'
import { setSiderCollapsed } from '../../services/settings.js'
import { groupSessions } from '../../services/chat/sessionGroups.js'
import { initChat, newChat, removeSession, useChatStore } from '../../services/chat/store.js'
import { enterBatchMode, exitBatchMode, useBatchStore } from '../../services/chat/batch.js'
import { isMac, shortcutLabel } from '../../utils/platform.js'
import { useDelayedValue } from '../../utils/useDelayedValue.js'
import type { SessionSummary } from '../../services/chat/types.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { Modal } from '../base/Modal.js'
import { Tooltip } from '../base/Tooltip.js'
import { ScrollGutters } from '../base/ScrollGutters.js'
import { showToast } from '../base/toastState.js'
import { closeMobileSider, useMobileSider } from './mobileSiderState.js'
import { AccountMenu } from './AccountMenu.js'
import { BatchBottomBar, BatchTopBar } from './BatchToolbar.js'
import { SessionItem } from './SessionItem.js'
import { SessionSearch } from './SessionSearch.js'
import styles from './Sider.module.css'

/**
 * 展开的侧边栏：顶部品牌标识与搜索入口、开启新对话、按时间分组的会话列表、底部账户区；
 * 移动端放在抽屉里，收起按钮关闭抽屉。
 */
export const Sider = ({ mobile = false }: { mobile?: boolean }) => {
  const t = useTranslate()
  const listRef = useRef<HTMLDivElement>(null)
  const sessions = useChatStore((state) => state.sessions)
  const activeId = useChatStore((state) => state.activeId)
  const ready = useChatStore((state) => state.ready)
  const initError = useChatStore((state) => state.initError)
  const [now, setNow] = useState(Date.now)
  const groups = useMemo(() => groupSessions(sessions, now, t), [sessions, now, t])
  // 置顶分组单独渲染（可折叠），其余分组走通用列表
  const pinnedGroup = groups[0]?.key === 'pinned' ? groups[0] : null
  const restGroups = pinnedGroup ? groups.slice(1) : groups
  const [deleting, setDeleting] = useState<SessionSummary | null>(null)
  // 删除确认弹窗的关闭函数：先播退出动画再卸载（避免一闪消失）
  const deleteModalCloseRef = useRef<(() => void) | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [searching, setSearching] = useState(false)
  const batchActive = useBatchStore((state) => state.active)

  // 官方行为：批量模式退出时先保留 200ms（fade-out），再卸载；进入时立即显示。
  const batchVisible = useDelayedValue({
    value: batchActive,
    shouldDelay: (value) => !value,
    delay: 200,
    defaultValue: batchActive,
  })
  const newChatVisible = useDelayedValue({
    value: !batchActive,
    shouldDelay: (value) => !value,
    delay: 200,
    defaultValue: !batchActive,
  })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const midnight = new Date(time).setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, midnight - time)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    refresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // 搜索面板与多选模式互斥，避免两套操作区叠加
  useEffect(() => {
    if (batchActive) {
      setSearching(false)
    }
  }, [batchActive])

  // 快捷键：与官网一致 —— Mac 用 ⌘，其他用 Ctrl；Ctrl/⌘+J 新建对话，Ctrl/⌘+K 打开会话搜索；
  // 多选模式下两个快捷键都不响应，Esc 退出多选。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && useBatchStore.getState().active) {
        event.preventDefault()
        exitBatchMode()
        return
      }
      const mac = isMac()
      const matched = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
      if (!matched || typeof event.key !== 'string') {
        return
      }
      const key = event.key.toLowerCase()
      if (key !== 'j' && key !== 'k') {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      if (useBatchStore.getState().active) {
        return
      }
      if (key === 'j') {
        newChat()
      } else {
        setSearching(true)
      }
    }
    document.addEventListener('keydown', onKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [])

  return (
    <div className={clsx(styles.sider, mobile && styles.mobile)}>
      <div className={styles.top}>
        <button
          type="button"
          className={styles.brand}
          aria-label={t('expandSiderbarButton')}
          onClick={() => (mobile ? closeMobileSider() : setSiderCollapsed(false))}
        >
          <DeepSeekWordmark />
        </button>
        <div className={styles.topActions}>
          {/* 多选模式下官网只保留折叠按钮 */}
          {!batchActive ? (
            <IconButton
              size="m"
              className={styles.topIcon}
              icon={<IconSearchOutline16 />}
              tooltip={`${t('historySearchTriggerButton')} ${shortcutLabel('K')}`}
              tooltipPlacement="bottom"
              onClick={() => setSearching(true)}
            />
          ) : null}
          <IconButton
            size="m"
            className={styles.topIcon}
            icon={<IconPanelLeftOutline16 />}
            tooltip={t('collapseSiderbarButton')}
            tooltipPlacement="bottom"
            onClick={() => (mobile ? closeMobileSider() : setSiderCollapsed(true))}
          />
        </div>
      </div>
      <div className={styles.slot}>
        {newChatVisible ? (
          <div className={clsx(styles.slotLayer, batchActive ? styles.slotOut : styles.slotIn)}>
            <button
              type="button"
              className={clsx(styles.newChat, !isMac() && styles.newChatCtrl)}
              onClick={() => {
                newChat()
                closeMobileSider()
              }}
            >
              <span className={styles.newChatIcon}>
                <NewChatIcon />
              </span>
              {t('newChat')}
            </button>
          </div>
        ) : null}
        {batchVisible ? (
          <div className={clsx(styles.slotLayer, batchActive ? styles.slotIn : styles.slotOut)}>
            <BatchTopBar />
          </div>
        ) : null}
      </div>
      <div className={clsx(styles.listWrap, 'ds-scroll-host')}>
        {!batchActive && groups.length > 0 ? (
          <Tooltip content={t('batchManage')} placement="bottom">
          <button
            type="button"
            className={styles.batchEntry}
            aria-label={t('batchManage')}
            onClick={() => enterBatchMode()}
          >
            <span className={styles.batchIcon} aria-hidden>
              {/* 官网「多选」图标：左侧两个圆形复选 + 右侧两条横线 */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <g transform="translate(0.9 1.4)">
                  <path
                    d="M14.2004 9.73944V11.0402H7.40356V9.73944H14.2004Z"
                    fill="currentColor"
                  />
                  <path
                    d="M14.2004 2.15491V3.45569H7.40356V2.15491H14.2004Z"
                    fill="currentColor"
                  />
                  <path
                    d="M4.31055 10.3903C4.31055 9.61068 3.71825 8.9692 2.95898 8.89221L2.80566 8.8844C1.9742 8.8844 1.2998 9.5588 1.2998 10.3903L1.30762 10.5436C1.37947 11.2522 1.94276 11.8153 2.65137 11.8873L2.80566 11.8951C3.58507 11.895 4.22575 11.3027 4.30273 10.5436L4.31055 10.3903ZM5.61035 10.3903C5.61016 11.9394 4.35481 13.1947 2.80566 13.1949C1.25635 13.1949 0.000196493 11.9395 0 10.3903C0 8.84083 1.25623 7.58459 2.80566 7.58459C4.35493 7.58479 5.61035 8.84095 5.61035 10.3903Z"
                    fill="currentColor"
                  />
                  <path
                    d="M4.31091 2.80566C4.31091 2.02619 3.7185 1.38466 2.95935 1.30762L2.80603 1.2998C1.97463 1.2998 1.30017 1.97426 1.30017 2.80566L1.30798 2.95898C1.37989 3.66756 1.94316 4.23082 2.65173 4.30273L2.80603 4.31055C3.58529 4.3103 4.22608 3.71798 4.3031 2.95898L4.31091 2.80566ZM5.61072 2.80566C5.61046 4.35465 4.35502 5.61009 2.80603 5.61035C1.25682 5.61035 0.000624607 4.35481 0.000366211 2.80566C0.000366211 1.25629 1.25666 0 2.80603 0C4.35518 0.000258397 5.61072 1.25645 5.61072 2.80566Z"
                    fill="currentColor"
                  />
                </g>
              </svg>
            </span>
          </button>
          </Tooltip>
        ) : null}
        <div className={styles.list} ref={listRef} data-ds-scroll-area>
          {/* 官网初始加载失败分支（known-issues-re.md 项 9）：「加载失败，你可以 重试加载」；
              追加失败分支（sessionLoadMoreOnError）对应官网分页加载，我们一次性载入本地库，
              不存在追加场景，故只实现初始失败分支 */}
          {initError ? (
            <div className={styles.loadFailed}>
              <div className={styles.loadFailedText}>
                {t('historyLoadFailed')}{' '}
                <button
                  type="button"
                  className={styles.loadFailedRetry}
                  onClick={() => void initChat()}
                >
                  {t('historyLoadFailedButton')}
                </button>
              </div>
            </div>
          ) : null}
          {ready && !initError && groups.length === 0 ? (
            <div className={styles.emptyHistory}>{t('historyIsEmpty')}</div>
          ) : null}
          {pinnedGroup ? (
            <PinnedGroup
              group={pinnedGroup}
              activeId={activeId}
              onDelete={(session) => setDeleting(session)}
            />
          ) : null}
          {restGroups.map((group) => (
            <div key={group.key} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>{group.label}</span>
              </div>
              {group.sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  active={session.id === activeId}
                  onDelete={() => setDeleting(session)}
                />
              ))}
            </div>
          ))}
        </div>
        {/* 列表底部渐隐，与官网一致 */}
        <div className={styles.listFade} aria-hidden />
        <ScrollGutters targetRef={listRef} />
      </div>
      <div className={styles.bottomSlot}>
        {newChatVisible ? (
          <div className={clsx(styles.slotLayer, batchActive ? styles.slotOut : styles.slotIn)}>
            <div className={styles.bottom}>
              <AccountMenu />
            </div>
          </div>
        ) : null}
        {batchVisible ? (
          <div className={clsx(styles.slotLayer, batchActive ? styles.slotIn : styles.slotOut)}>
            <BatchBottomBar />
          </div>
        ) : null}
      </div>
      {deleting ? (
        <Modal
          title={t('deleteSessionModalContentTitle')}
          closeRef={deleteModalCloseRef}
          onClose={() => {
            if (!deletePending) {
              setDeleting(null)
            }
          }}
          footer={
            <>
              <Button variant="outlined" disabled={deletePending} onClick={() => deleteModalCloseRef.current?.()}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={deletePending}
                onClick={async () => {
                  setDeletePending(true)
                  try {
                    if (await removeSession(deleting.id)) {
                      // 先播退出动画，onExited 后 onClose 再卸载
                      deleteModalCloseRef.current?.()
                    } else {
                      showToast({ key: 'sessionDeleteFailed', type: 'error' })
                    }
                  } finally {
                    setDeletePending(false)
                  }
                }}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          {t('deleteSessionWithFilesDescription')}
        </Modal>
      ) : null}
      {searching ? <SessionSearch onClose={() => setSearching(false)} /> : null}
    </div>
  )
}

/**
 * 置顶分组（官网模块 52630/28418，known-issues-re.md 项 2）：
 * - 仅置顶数 >10 才出现可点击折叠标题（≤10 是纯 span，且折叠态会自动弹回展开）；
 * - 折叠态文案「置顶 N 个对话」（pinNCountChats）+ chevron 方向切换 + tooltip 收起/展开；
 * - 折叠状态持久化（官网按用户存 pinnedSessionsFolded，我们单用户存 localStorage）；
 * - 动画 = grid-template-rows 1fr↔0fr 的 .2s 过渡：折叠 = folded 类（0fr+opacity 0），
 *   展开 = 清类 + 从 0fr 起步的 keyframes（1fr↔0fr 同 track 结构可平滑插值；
 *   官网的 inline px FLIP 在 Chromium 下 px↔px 不插值会跳变，故不用）。
 */
const PINNED_FOLD_THRESHOLD = 10
const PINNED_FOLDED_KEY = 'chat-demo:pinned-sessions-folded'

const readPinnedFolded = () => window.localStorage.getItem(PINNED_FOLDED_KEY) === 'true'

type SessionGroup = { key: string; label: string; sessions: SessionSummary[] }

const PinnedGroup = ({
  group,
  activeId,
  onDelete,
}: {
  group: SessionGroup
  activeId: string | null
  onDelete: (session: SessionSummary) => void
}) => {
  const t = useTranslate()
  const count = group.sessions.length
  const [folded, setFolded] = useState(readPinnedFolded)
  const [expanding, setExpanding] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 官网 effect：折叠态但数量 ≤ 阈值时自动展开回去
  useEffect(() => {
    if (folded && count > 0 && count <= PINNED_FOLD_THRESHOLD) {
      window.localStorage.setItem(PINNED_FOLDED_KEY, 'false')
      setFolded(false)
    }
  }, [folded, count])

  const toggleFold = () => {
    // 官网用「inline 高度 → reflow → 0px」的 FLIP 过渡，但 Chromium 对 grid-template-rows 的
    // px↔px 过渡不插值（实测直接跳变）；fr↔fr（1fr→0fr，同 track 结构）可平滑插值，
    // 视觉效果与官网一致且更稳，故折叠/展开都走类切换：
    // 折叠 = folded 类（0fr + opacity 0）过渡；展开 = 清类 + 从 0fr 起步的 keyframes 动画。
    window.localStorage.setItem(PINNED_FOLDED_KEY, String(!folded))
    setFolded(!folded)
    if (folded) {
      setExpanding(true)
    }
  }

  const header =
    count > PINNED_FOLD_THRESHOLD ? (
      <Tooltip
        content={t(
          folded ? 'sessionPinnedSectionExpandTooltip' : 'sessionPinnedSectionCollapseTooltip'
        )}
        placement="bottom"
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!folded}
          className={styles.pinnedFoldButton}
          onClick={toggleFold}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleFold()
            }
          }}
        >
          <span className={styles.pinnedFoldLabel}>
            <span>{folded ? t('pinNCountChats', { count }) : t('pinnedSectionTitle')}</span>
            <span className={clsx(styles.pinnedChevron, !folded && styles.pinnedChevronUp)} aria-hidden>
              <IconChevronDownOutline14 />
            </span>
          </span>
        </div>
      </Tooltip>
    ) : (
      <span>{t('pinnedSectionTitle')}</span>
    )

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>{header}</div>
      <div
        ref={contentRef}
        className={clsx(
          styles.pinnedContent,
          folded && styles.pinnedContentFolded,
          expanding && styles.pinnedContentExpand
        )}
        onAnimationEnd={() => setExpanding(false)}
      >
        <div className={styles.pinnedInner}>
          {group.sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              active={session.id === activeId}
              onDelete={() => onDelete(session)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 移动端抽屉：官网原始实现是「常驻 DOM + translateX 滑入滑出 + 遮罩 opacity 淡入淡出」，
 * 关键 class：抽屉 .dc04ec1d / 关闭态 .a02af2e6，遮罩 ._4cbcd96。
 * 这里不再 `if(!open) return null`（那样没有动画），而是始终渲染，用 open class 切换，
 * 让 CSS transition 生效；关闭动画结束后用 inert 阻止交互。
 */
export const MobileSider = () => {
  const open = useMobileSider((state) => state.open)
  return (
    <>
      <div
        className={clsx(styles.drawerMask, !open && styles.drawerMaskHidden)}
        onClick={closeMobileSider}
        aria-hidden={!open}
      />
      <div className={clsx(styles.drawer, !open && styles.drawerClosed)} aria-hidden={!open}>
        <Sider mobile />
      </div>
    </>
  )
}
