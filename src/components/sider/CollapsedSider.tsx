import { useState } from 'react'
import { IconPanelLeftOutline16, IconSearchOutline16, NewChatIcon } from '../base/icons.js'
import { DeepSeekWhale } from '../base/brand.js'
import { useTranslate } from '../../i18n/index.js'
import { setSiderCollapsed } from '../../services/settings.js'
import { newChat } from '../../services/chat/store.js'
import { shortcutLabel } from '../../utils/platform.js'
import { IconButton } from '../base/IconButton.js'
import { SessionSearch } from './SessionSearch.js'
import styles from './Sider.module.css'

/** 收起后左上角：鲸鱼 logo（点击回新对话页）+ 胶囊按钮组（官网 30722，整条 157×40） */
export const CollapsedSider = () => {
  const t = useTranslate()
  const [searching, setSearching] = useState(false)
  return (
    <div className={styles.collapsed}>
      <div
        className={styles.collapsedLogo}
        role="button"
        tabIndex={0}
        aria-label={t('appName')}
        onClick={newChat}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            newChat()
          }
        }}
      >
        <DeepSeekWhale />
      </div>
      <div className={styles.collapsedGroup}>
        <IconButton
          size="m"
          tone="primary"
          icon={<IconPanelLeftOutline16 />}
          tooltip={t('expandSiderbarButton')}
          onClick={() => setSiderCollapsed(false)}
        />
        <IconButton
          size="m"
          tone="primary"
          icon={<IconSearchOutline16 />}
          tooltip={`${t('historySearchTriggerButton')} ${shortcutLabel('K')}`}
          onClick={() => setSearching(true)}
        />
        <IconButton
          size="m"
          tone="primary"
          icon={<NewChatIcon />}
          tooltip={t('newChat')}
          onClick={newChat}
        />
      </div>
      {searching ? <SessionSearch onClose={() => setSearching(false)} /> : null}
    </div>
  )
}
