import { useTranslate } from '../../i18n/index.js'
import styles from './ContentCaveat.module.css'

/**
 * 底部免责声明：两行，第一行声明本项目不是 DeepSeek 官方产品，第二行提示 AI 生成内容。
 * 两行各自成 div，padding 只由外层承担，避免重复内边距。
 */
export const ContentCaveat = ({ className }: { className?: string }) => {
  const t = useTranslate()
  return (
    <div className={className}>
      <div className={styles.line}>
        {t('contentCaveatLine1Prefix')}
        <a
          className={styles.link}
          href="https://chat.deepseek.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('contentCaveatOfficialLink')}
        </a>
        {t('contentCaveatLine1Middle')}
        <a
          className={styles.link}
          href="https://github.com/deepseek-ai/chat-demo/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('contentCaveatDemoLink')}
        </a>
        {t('contentCaveatLine1Suffix')}
      </div>
      <div className={styles.line}>{t('contentCaveat')}</div>
    </div>
  )
}
