import clsx from 'clsx'
import { memo, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { IconEditOutline16, IconEllipsisOutline16, IconTrashOutline16 } from '../base/icons.js'
import { renameSession, selectSession, setSessionsPinned, useChatStore, PINNED_SESSION_LIMIT } from '../../services/chat/store.js'
import { enterBatchMode, toggleBatchSelection, useBatchStore } from '../../services/chat/batch.js'
import { PinIcon } from './BatchToolbar.js'
import type { SessionSummary } from '../../services/chat/types.js'
import { useDelayedValue } from '../../utils/useDelayedValue.js'
import { IconButton } from '../base/IconButton.js'
import { Checkbox } from '../base/Checkbox.js'
import { Menu } from '../base/Menu.js'
import { showToast } from '../base/toastState.js'
import { closeMobileSider } from './mobileSiderState.js'
import styles from './SessionItem.module.css'

export const SessionItem = memo(function SessionItem({
  session,
  active,
  onDelete,
}: {
  session: SessionSummary
  active: boolean
  onDelete: () => void
}) {
  const t = useTranslate()
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const batchActive = useBatchStore((state) => state.active)
  const selected = useBatchStore((state) => state.selected.includes(session.id))
  const displayTitle = session.title || t('untitledChat')
  // 官网 useIsNewEmptySession：空会话（无消息）的菜单不渲染重命名与置顶/取消置顶
  const isEmpty = useChatStore((state) => state.sessionCache[session.id]?.messages.length === 0)
  const pinnedCount = useChatStore((state) => state.sessions.reduce((count, item) => count + (item.pinned ? 1 : 0), 0))

  // 与官网一致：退出多选时保留 200ms 播放复选框收起动画
  const batchVisible = useDelayedValue({
    value: batchActive,
    shouldDelay: (value) => !value,
    delay: 200,
    defaultValue: batchActive,
  })
  const batchExiting = batchVisible && !batchActive
  const batchEnterDelayed = useDelayedValue({
    value: batchActive,
    shouldDelay: (value) => value,
    delay: 200,
    defaultValue: batchActive,
  })
  const batchEntering = batchActive && !batchEnterDelayed

  if (editing) {
    const finish = (title: string) => {
      setEditing(false)
      if (title.trim() && title.trim() !== displayTitle) {
        renameSession(session.id, title.trim())
      }
    }
    return (
      <input
        className={styles.renameInput}
        defaultValue={displayTitle}
        autoFocus
        onFocus={(event) => event.target.select()}
        onBlur={(event) => finish(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            finish(event.currentTarget.value)
          } else if (event.key === 'Escape') {
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <a
      className={clsx(
        styles.item,
        active && styles.active,
        menuOpen && styles.menuOpen,
        batchVisible && styles.batchMode,
        batchEntering && styles.batchEnter,
        batchExiting && styles.batchExit
      )}
      href="#"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault()
        if (batchExiting) {
          return
        }
        if (batchActive) {
          // 批量模式下点击即切换勾选，不切换会话
          toggleBatchSelection(session.id)
          return
        }
        selectSession(session.id)
        closeMobileSider()
      }}
    >
      {batchVisible ? (
        <span className={styles.checkboxSlot}>
          <Checkbox checked={selected} readOnly />
        </span>
      ) : null}
      <div className={styles.title}>{displayTitle}</div>
      {!batchVisible ? (
        <div className={clsx(styles.action, menuOpen && styles.actionOpen)}>
          <Menu
            onOpenChange={setMenuOpen}
            options={[
              // 官网：空会话的菜单只有 多选 / 删除（不渲染重命名与置顶，见 bundle @758998）
              ...(!isEmpty
                ? [
                    {
                      key: 'rename',
                      label: t('sessionItemMenuRenameOption'),
                      icon: <IconEditOutline16 />,
                      onSelect: () => setEditing(true),
                    },
                    {
                      key: session.pinned ? 'unpin' : 'pin',
                      label: session.pinned ? t('unpinSession') : t('pinSession'),
                      icon: <PinIcon />,
                      onSelect: () => {
                        // 官网单项置顶入口：已达上限先提示（bundle @759674，feature pinned_session_limit 默认 99）
                        if (!session.pinned && pinnedCount >= PINNED_SESSION_LIMIT) {
                          showToast({ key: 'sessionBatchPinLimitToast' })
                          return
                        }
                        void setSessionsPinned([session.id], !session.pinned)
                      },
                    },
                  ]
                : []),
              {
                key: 'multiSelect',
                label: t('batchManage'),
                icon: <MultiSelectIcon />,
                onSelect: () => enterBatchMode([session.id]),
              },
              {
                key: 'delete',
                label: t('delete'),
                icon: <IconTrashOutline16 />,
                danger: true,
                onSelect: onDelete,
              },
            ]}
          >
            {({ toggle }) => (
              <IconButton
                size="xs"
                icon={<IconEllipsisOutline16 />}
                aria-label={t('more')}
                onClick={toggle}
              />
            )}
          </Menu>
        </div>
      ) : null}
    </a>
  )
})

/** 官网「多选」图标（与侧栏批量入口同一个 checklist） */
const MultiSelectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <g transform="translate(0.9 1.4)">
      <path d="M14.2004 9.73944V11.0402H7.40356V9.73944H14.2004Z" fill="currentColor" />
      <path d="M14.2004 2.15491V3.45569H7.40356V2.15491H14.2004Z" fill="currentColor" />
      <path d="M4.31055 10.3903C4.31055 9.61068 3.71825 8.9692 2.95898 8.89221L2.80566 8.8844C1.9742 8.8844 1.2998 9.5588 1.2998 10.3903L1.30762 10.5436C1.37947 11.2522 1.94276 11.8153 2.65137 11.8873L2.80566 11.8951C3.58507 11.895 4.22575 11.3027 4.30273 10.5436L4.31055 10.3903ZM5.61035 10.3903C5.61016 11.9394 4.35481 13.1947 2.80566 13.1949C1.25635 13.1949 0.000196493 11.9395 0 10.3903C0 8.84083 1.25623 7.58459 2.80566 7.58459C4.35493 7.58479 5.61035 8.84095 5.61035 10.3903Z" fill="currentColor" />
      <path d="M4.31091 2.80566C4.31091 2.02619 3.7185 1.38466 2.95935 1.30762L2.80603 1.2998C1.97463 1.2998 1.30017 1.97426 1.30017 2.80566L1.30798 2.95898C1.37989 3.66756 1.94316 4.23082 2.65173 4.30273L2.80603 4.31055C3.58529 4.3103 4.22608 3.71798 4.3031 2.95898L4.31091 2.80566ZM5.61072 2.80566C5.61046 4.35465 4.35502 5.61009 2.80603 5.61035C1.25682 5.61035 0.000624607 4.35481 0.000366211 2.80566C0.000366211 1.25629 1.25666 0 2.80603 0C4.35518 0.000258397 5.61072 1.25645 5.61072 2.80566Z" fill="currentColor" />
    </g>
  </svg>
)
