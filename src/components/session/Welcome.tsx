import { useMemo } from 'react'
import { useIsMobile } from '../../app/viewport.js'
import { useSettings } from '../../services/settings.js'
import { pickGreeting } from '../../services/greetings.js'
import { DeepSeekWhale } from '../base/brand.js'
import { ContentCaveat } from '../base/ContentCaveat.js'
import { ChatInput } from '../chatInput/ChatInput.js'
import { MobileHeader } from './MobileHeader.js'
import styles from './Welcome.module.css'

/** 新对话：问候语 + 输入框。桌面端居中；移动端输入框吸底 */
export const Welcome = () => {
  const isMobile = useIsMobile()
  const locale = useSettings((state) => state.locale)
  // 每次进入新对话页，按官网的时段配置随机取一条问候语
  const greeting = useMemo(() => pickGreeting(locale), [locale])
  return (
    <div className={styles.container}>
      {isMobile ? <MobileHeader /> : null}
      <div className={styles.welcome}>
        <div className={styles.greeting}>
          <span className={styles.greetingLogo}>
            <DeepSeekWhale size={26} />
          </span>
          <span className={styles.greetingText}>{greeting}</span>
        </div>
        <ChatInput sessionId={null} />
        {/* 用户要求：欢迎页与对话页都要保留这两行说明（本项目自加的免责声明） */}
        <ContentCaveat className={styles.caveat} />
      </div>
    </div>
  )
}
