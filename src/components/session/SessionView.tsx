import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../../app/viewport.js'
import { useTranslate } from '../../i18n/index.js'
import { isEmptySession, renameSession } from '../../services/chat/store.js'
import type { AssistantMessage, Session } from '../../services/chat/types.js'
import { ChatInput } from '../chatInput/ChatInput.js'
import { MessageList } from '../messages/MessageList.js'
import { ContentCaveat } from '../base/ContentCaveat.js'
import { Tooltip } from '../base/Tooltip.js'
import { VendorLogo } from '../base/VendorLogo.js'
import { useModelEntry } from '../chatInput/ModelPicker.js'
import { MobileHeader } from './MobileHeader.js'
import styles from './SessionView.module.css'

/** 官网 45107 _B：标题右侧模型名标签，Tooltip 提示「如需切换模式，请开启新对话」 */
const ModelTag = ({ model }: { model: string }) => {
  const t = useTranslate()
  const entry = useModelEntry(model)
  if (!entry) {
    return null
  }
  return (
    <Tooltip content={t('sessionModelNameTagTooltip')} placement="bottom">
      <span className={styles.modelTag}>
        {entry.vendor ? (
          <VendorLogo vendor={entry.vendor} size={12} className={styles.modelTagIcon} />
        ) : null}
        <span className={styles.modelTagName}>{entry.name}</span>
      </span>
    </Tooltip>
  )
}

/** 会话页：标题栏（移动端为顶栏）+ 消息列表，输入框吸底 */
export const SessionView = ({
  session,
  streaming,
  siderCollapsed,
}: {
  session: Session
  streaming: boolean
  siderCollapsed: boolean
}) => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  const title = session.title || t('untitledChat')
  // 官网 89052 _V：点击标题进入重命名（Enter/blur 提交，maxLength 1024），空会话不可编辑
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const canRename = !isEmptySession(session.id)
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])
  const startEditing = () => {
    if (canRename) {
      setEditing(true)
    }
  }
  const commit = () => {
    const value = inputRef.current?.value.trim() ?? ''
    setEditing(false)
    if (value && value !== title) {
      renameSession(session.id, value)
    }
  }
  // 官网 _F 读 session.modelType；我们模型记录在助手消息上
  const isAssistant = (m: Session['messages'][number]): m is AssistantMessage => m.role === 'assistant'
  const model = [...session.messages].reverse().find(isAssistant)?.model ?? null
  return (
    <div className={styles.view}>
      {isMobile ? (
        <MobileHeader title={title} />
      ) : (
        <div className={styles.header}>
          <div className={clsx(styles.titleWrap, siderCollapsed && styles.withCollapsedSider)}>
            {editing ? (
              <input
                ref={inputRef}
                className={clsx(styles.renameInput)}
                maxLength={1024}
                defaultValue={title}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    commit()
                  }
                }}
              />
            ) : (
              <div
                role="button"
                tabIndex={canRename ? 0 : undefined}
                className={clsx(styles.title, canRename && styles.titleClickable)}
                style={{ outline: 'none' }}
                onClick={startEditing}
                onFocus={startEditing}
              >
                {title}
              </div>
            )}
            {model ? <ModelTag model={model} /> : null}
          </div>
        </div>
      )}
      <MessageList
        session={session}
        streaming={streaming}
        footer={
          <div className={styles.inputContainer}>
            <ChatInput sessionId={session.id} />
            <ContentCaveat className={styles.caveat} />
          </div>
        }
      />
    </div>
  )
}
