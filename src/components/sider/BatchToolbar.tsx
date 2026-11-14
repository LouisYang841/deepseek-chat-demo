import { useState } from 'react'
import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { removeSession, setSessionsPinned, useChatStore } from '../../services/chat/store.js'
import { exitBatchMode, useBatchStore } from '../../services/chat/batch.js'
import { showToast } from '../base/toastState.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import styles from './BatchToolbar.module.css'

/** 官网「置顶」图标 */
export const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8.65991 0.963799L14.9886 7.29249L13.2306 7.64409L9.71469 11.16L9.20318 14.2291C9.12295 14.7105 8.53216 14.8998 8.18708 14.5547L1.39767 7.76533C1.05258 7.42024 1.24191 6.82946 1.72329 6.74923L4.79237 6.23771L8.30831 2.72177L8.65991 0.963799Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M4.41056 12.8146C3.98733 12.3893 3.56409 11.964 3.14085 11.5388C3.0912 11.6014 3.04156 11.664 2.99192 11.7266C2.09834 12.854 1.20476 13.9814 0.311181 15.1087C0.261538 15.1713 0.211895 15.234 0.162251 15.2966C0.320966 15.4561 0.479681 15.6156 0.638396 15.775C0.701265 15.7257 0.764135 15.6764 0.827004 15.627C1.95865 14.7389 3.09031 13.8508 4.22196 12.9626C4.28483 12.9133 4.3477 12.864 4.41056 12.8146Z"
      fill="currentColor"
    />
  </svg>
)

/** 官网「删除」图标 */
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z"
      fill="currentColor"
    />
  </svg>
)

/**
 * 多选模式下的顶部条，与官网一致：
 * 左侧「选择对话 / 已选择 N 个对话」，右侧 28px 白色圆形关闭按钮。
 */
export const BatchTopBar = () => {
  const t = useTranslate()
  const selected = useBatchStore((state) => state.selected)
  return (
    <div className={styles.topBar}>
      <span className={styles.title}>
        {selected.length > 0
          ? t('batchSelectedCount', { count: selected.length })
          : t('batchSelectChatTitle')}
      </span>
      <button
        type="button"
        className={styles.close}
        aria-label={t('batchSelectCloseButtonAriaLabel')}
        aria-keyshortcuts="Escape"
        onClick={exitBatchMode}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M3 3L9 9M9 3L3 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

/**
 * 多选模式下的底部操作条，与官网一致：
 * 置顶 / 删除两个按钮，中间竖分隔线；在多选期间替代底部账户行。
 */
export const BatchBottomBar = () => {
  const t = useTranslate()
  const sessions = useChatStore((state) => state.sessions)
  const selected = useBatchStore((state) => state.selected)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  const allPinned = selected.length > 0 && selected.every((id) => sessions.find((s) => s.id === id)?.pinned)

  const togglePin = async () => {
    if (selected.length === 0 || pending) {
      return
    }
    setPending(true)
    try {
      await setSessionsPinned(selected, !allPinned)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className={styles.bottomBar}>
        <button
          type="button"
          className={styles.action}
          disabled={selected.length === 0 || pending}
          onClick={() => void togglePin()}
        >
          <PinIcon />
          {allPinned ? t('batchUnpin') : t('batchPin')}
        </button>
        <span className={styles.divider} aria-hidden />
        <button
          type="button"
          className={clsx(styles.action, styles.actionDanger)}
          disabled={selected.length === 0 || pending}
          onClick={() => setConfirming(true)}
        >
          <TrashIcon />
          {t('batchDelete')}
        </button>
      </div>
      {confirming ? (
        <Modal
          title={t('batchDeleteConfirmTitle', { count: selected.length })}
          onClose={() => {
            if (!pending) {
              setConfirming(false)
            }
          }}
          footer={
            <>
              <Button variant="outlined" disabled={pending} onClick={() => setConfirming(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={async () => {
                  setPending(true)
                  try {
                    let failed = 0
                    for (const id of selected) {
                      const ok = await removeSession(id)
                      if (!ok) {
                        failed++
                      }
                    }
                    if (failed > 0) {
                      showToast({ key: 'sessionDeleteFailed', type: 'error' })
                    }
                    setConfirming(false)
                    exitBatchMode()
                  } finally {
                    setPending(false)
                  }
                }}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          {t('batchDeleteConfirmDescription')}
        </Modal>
      ) : null}
    </>
  )
}

/** 会话项左侧的勾选框（官网 20px 圆形复选框） */
export const BatchCheckbox = ({ sessionId }: { sessionId: string }) => {
  const selected = useBatchStore((state) => state.selected.includes(sessionId))
  return (
    <span className={styles.checkbox} aria-hidden>
      {selected ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="var(--dsw-alias-brand-primary)" />
          <path
            d="M5.6 10.3L8.3 12.9L13.9 7.3"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="var(--dsw-alias-border-l2)" strokeWidth="1.2" />
        </svg>
      )}
    </span>
  )
}
