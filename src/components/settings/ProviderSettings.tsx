import { useTranslate } from '../../i18n/index.js'
import clsx from 'clsx'
import {
  addProvider,
  parseModelIds,
  removeProvider,
  updateProvider,
  useProviders,
} from '../../services/providers.js'
import { IconButton } from '../base/IconButton.js'
import { Checkbox } from '../base/Checkbox.js'
import { IconTrashOutline16 } from '../base/icons.js'
import styles from './Settings.module.css'

/** 单张提供商卡片：名称 / 地址 / 协议 / Key / 模型 / 启用开关 */
const ProviderCard = ({ id }: { id: string }) => {
  const t = useTranslate()
  const provider = useProviders((state) => state.providers.find((item) => item.id === id))
  if (!provider) {
    return null
  }
  return (
    <div className={styles.providerCard}>
      <div className={styles.providerHead}>
        <input
          className={clsx(styles.providerInput, styles.providerName)}
          value={provider.name}
          placeholder={t('providerNamePlaceholder')}
          onChange={(event) => updateProvider(id, { name: event.target.value })}
        />
        {/* 只有启用的提供商会出现在模型选择器里；开关用统一的圆形复选框，紧挨删除按钮 */}
        <Checkbox
          checked={provider.enabled}
          ariaLabel={t('providerEnabled')}
          onChange={(enabled) => updateProvider(id, { enabled })}
        />
        <IconButton
          icon={<IconTrashOutline16 />}
          tooltip={t('providerRemove')}
          onClick={() => removeProvider(id)}
        />
      </div>
      <input
        className={styles.providerInput}
        value={provider.baseUrl}
        placeholder={t('providerBaseUrlPlaceholder')}
        onChange={(event) => updateProvider(id, { baseUrl: event.target.value })}
      />
      <input
        className={styles.providerInput}
        type="password"
        value={provider.apiKey}
        placeholder="API Key"
        autoComplete="off"
        onChange={(event) => updateProvider(id, { apiKey: event.target.value })}
      />
      <input
        className={styles.providerInput}
        value={provider.models.join(', ')}
        placeholder={t('providerModelsPlaceholder')}
        onChange={(event) => updateProvider(id, { models: parseModelIds(event.target.value) })}
      />
    </div>
  )
}

/** 账号管理页里的「模型提供商」区块 */
export const ProviderSettings = () => {
  const t = useTranslate()
  const providers = useProviders((state) => state.providers)
  return (
    <div className={styles.providerList}>
      {providers.map((provider) => (
        <ProviderCard key={provider.id} id={provider.id} />
      ))}
      <button type="button" className={styles.providerAdd} onClick={() => addProvider()}>
        {t('providerAdd')}
      </button>
    </div>
  )
}
