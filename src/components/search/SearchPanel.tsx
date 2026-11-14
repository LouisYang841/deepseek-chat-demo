import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { IconCloseOutline16 } from '../base/icons.js'
import { IconButton } from '../base/IconButton.js'
import { closeSearchPanel, useSearchPanel } from './searchPanelState.js'
import { SourceCard } from './SourceCard.js'
import styles from './SearchPanel.module.css'

/** 面板宽度动画时长，与官方 `_519be07` 的 flex-basis 过渡一致 */
const DURATION = 200

/**
 * 右侧「搜索结果」面板。
 *
 * 动画照官方 `_519be07` 实现：面板常驻、宽度为 0，
 * 用 `flex-basis` 在 0 ↔ var(--search-panel-width) 之间过渡（0.2s ease-out）。
 * 内部内容固定成展开后的宽度，所以展开/收起时条目不会被挤压变形，
 * 而是随面板变宽一条条露出来。
 */
export const SearchPanel = () => {
  const t = useTranslate()
  const entry = useSearchPanel((state) => state.entry)
  const sources = useSearchPanel((state) => state.sources)
  const open = entry !== null
  // 打开过一次之后内容不再卸载，收起动画期间也能看到条目一起收窄
  const [everOpened, setEverOpened] = useState(open)
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setEverOpened(true)
      setMounted(true)
      return
    }
    // 收起动画结束后再标记为收起，避免内容在动画中途消失
    const timer = setTimeout(() => setMounted(false), DURATION)
    return () => clearTimeout(timer)
  }, [open])

  return (
    <aside className={clsx(styles.panel, open && styles.open)} aria-hidden={!open}>
      {everOpened ? (
        <div className={styles.inner} data-visible={mounted ? 'true' : 'false'}>
          <div className={styles.header}>
            <div role="heading" className={styles.title}>
              {t('searchResult')}
            </div>
            <IconButton
              icon={<IconCloseOutline16 />}
              aria-label={t('close')}
              onClick={closeSearchPanel}
            />
          </div>
          <div className={styles.content}>
            {sources.map((source) => (
              <SourceCard key={source.url} source={source} className={styles.item} />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
