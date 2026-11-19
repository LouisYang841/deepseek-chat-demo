import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  IconCloseOutline16,
  IconDarkOutline16,
  IconDataOutline16,
  IconDownloadOutline16,
  IconFollowsystemOutline16,
  IconLightOutline16,
  IconTermsDocumentOutline16,
  IconSettingsOutline16,
  IconUploadOutline14,
  IconUserOutline16,
} from '../base/icons.js'
import {
  BackupError,
  clearHistory,
  exportHistory,
  importHistory,
} from '../../services/chat/backup.js'
import { useIsMobile } from '../../app/viewport.js'
import { useChatStore } from '../../services/chat/store.js'
import { regionCodes, getRegionName, provinces } from '../../services/location.js'
import {
  isChineseBrowser,
  setLocalePreference,
  setLocation,
  setSafetyCheck,
  setThemePreference,
  setTtsVoice,
  useSettings,
  type ThemePreference,
} from '../../services/settings.js'
import { useTranslate, type TranslationKey, type TranslationMessage } from '../../i18n/index.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { Modal } from '../base/Modal.js'
import { ScrollArrows } from '../base/ScrollArrows.js'
import { Select } from '../base/Select.js'
import { showToast } from '../base/toastState.js'
import { ApiKeyConfirm, ApiKeyField, useApiKeyEditor } from './ApiKeyField.js'
import { ProviderSettings } from './ProviderSettings.js'
import { pruneBlankProviders } from '../../services/providers.js'
import { closeSettings, useSettingsDialog, type SettingsSection } from './settingsDialogState.js'
import styles from './Settings.module.css'

/**
 * 设置弹窗：分「通用设置」（主题、语言、朗读音色、位置）与「数据管理」（API Key、导入、导出、删除）。
 * 桌面端为居中弹窗、左侧导航；移动端为底部弹层、导航横排在内容上方
 */
export const SettingsDialog = () => {
  const open = useSettingsDialog((state) => state.open)
  // 关闭设置时丢弃全空的提供商卡片（添加后什么都没填的那种）
  useEffect(() => {
    if (!open) {
      pruneBlankProviders()
    }
  }, [open])
  // 保持挂载直到 Modal 播完退出动画（onClose 在 onExited 后回调），否则收起时一闪消失
  const [rendered, setRendered] = useState(open)
  useEffect(() => {
    if (open) {
      setRendered(true)
    }
  }, [open])
  return rendered ? <SettingsContent onClosed={() => setRendered(false)} /> : null
}

const sections: { value: SettingsSection; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'general',
    label: 'settingDialogAsideGeneralOptionLabel',
    icon: <IconSettingsOutline16 />,
  },
  { value: 'account', label: 'settingDialogAsideAccountOptionLabel', icon: <IconUserOutline16 /> },
  { value: 'data', label: 'settingDialogAsideDataOptionLabel', icon: <IconDataOutline16 /> },
  { value: 'terms', label: 'settingDialogAsidePolicyOptionLabel', icon: <IconTermsDocumentOutline16 /> },
]

const SettingsContent = ({ onClosed }: { onClosed: () => void }) => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  // 分组放进全局状态，便于 URL hash 记住刷新后仍停留在同一子页面
  const section = useSettingsDialog((state) => state.section)
  const setSection = (value: SettingsSection) => useSettingsDialog.setState({ section: value })
  // 切换分组不丢失正在输入的 API Key 与导入状态
  const apiKeyEditor = useApiKeyEditor()
  const historyImport = useHistoryImport()
  const historyDelete = useHistoryDelete()
  const replacingHistory = useChatStore((state) => state.importingHistory)
  const historyBusy = historyImport.busy || historyDelete.busy || replacingHistory
  return (
    <>
      <Modal
        title={t('avatarMenuSettingsDialogTitle')}
        closable
        className={styles.dialog}
        mainClassName={styles.dialogMain}
        wrapperClassName={styles.dialogWrapper}
        slideUp={isMobile}
        onClose={() => {
          // 导入或删除进行中不允许关闭设置，避免进度与日志看不到。
          if (!historyDelete.busy && !historyImport.busy) {
            closeSettings()
            onClosed()
          }
        }}
      >
        {/* 官网 bi：横向滚动容器 ScrollArrows（f$）包住导航按钮，
            内容超出时两端出现渐变遮罩 + 箭头按钮，而非滚动条 */}
        <ScrollArrows wrapperClassName={styles.navigationWrap} className={styles.navigation}>
          {sections.map((item) => (
            <button
              key={item.value}
              type="button"
              className={clsx(styles.navItem, section === item.value && styles.navItemActive)}
              onClick={() => setSection(item.value)}
            >
              {item.icon}
              {t(item.label)}
            </button>
          ))}
        </ScrollArrows>
        <div role="tabpanel" className={styles.content}>
          {section === 'general' ? (
            <>
              <ThemeSetting />
              <LocaleSetting />
              <TtsVoiceSetting />
              <SafetyCheckSetting />
              <LocationSetting />
            </>
          ) : section === 'account' ? (
            <>
              <ApiKeyField editor={apiKeyEditor} />
              {isMobile ? <ApiKeyConfirm editor={apiKeyEditor} /> : null}
              {/* 其他模型提供商：可单独启用，供输入框的模型选择器使用 */}
              <div className={styles.sectionTitle}>{t('providerTitle')}</div>
              <ProviderSettings />
            </>
          ) : section === 'terms' ? (
            <TermsSection />
          ) : (
            <>
              <ImportHistory historyImport={historyImport} disabled={historyBusy} />
              <ExportHistory disabled={historyBusy} />
              <SettingCell
                label={t('deleteAllSessions')}
                status={null}
                action={
                  <Button
                    variant="dangerOutlined"
                    size="m"
                    className={styles.cellButton}
                    disabled={historyBusy}
                    onClick={historyDelete.open}
                  >
                    {t('delete')}
                  </Button>
                }
              />
            </>
          )}
        </div>
      </Modal>
      {historyImport.file ? <ImportConfirm historyImport={historyImport} /> : null}
      {historyImport.run ? (
        <ImportProgressDialog run={historyImport.run} onClose={historyImport.closeRun} />
      ) : null}
      {historyDelete.opened ? <DeleteAllConfirm historyDelete={historyDelete} /> : null}
    </>
  )
}

/** 删除确认保留在设置之上；失败可重试，成功只关闭确认弹窗。 */
const DeleteAllConfirm = ({
  historyDelete,
}: {
  historyDelete: ReturnType<typeof useHistoryDelete>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('deleteAllSessionsModalTitle')}
      className={styles.deleteConfirm}
      onClose={historyDelete.cancel}
      footer={
        <div className={styles.deleteActions} aria-busy={historyDelete.busy}>
          <Button
            variant="outlined"
            autoFocus
            disabled={historyDelete.busy}
            onClick={historyDelete.cancel}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={historyDelete.busy}
            onClick={() => void historyDelete.confirm()}
          >
            {t(historyDelete.busy ? 'historyDeleting' : 'deleteAllSessions')}
          </Button>
        </div>
      }
    >
      {t('deleteAllSessionsModalDescription')}
    </Modal>
  )
}

const useHistoryDelete = () => {
  const [opened, setOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const deleting = useRef(false)

  const confirm = async () => {
    if (deleting.current) {
      return
    }
    deleting.current = true
    setBusy(true)
    try {
      await clearHistory()
      setOpened(false)
      showToast({ key: 'historyDeleted' })
    } catch {
      showToast({ key: 'historyDeleteFailed', type: 'error' })
    } finally {
      deleting.current = false
      setBusy(false)
    }
  }

  return {
    opened,
    busy,
    open: () => setOpened(true),
    cancel: () => {
      if (!deleting.current) {
        setOpened(false)
      }
    },
    confirm,
  }
}

/** 服务协议：用户协议与隐私政策，均在新标签页打开官网页面 */
const TermsSection = () => {
  const t = useTranslate()
  const items = [
    { label: t('settingsTermsUserAgreement'), href: 'https://cdn.deepseek.com/policies/zh-CN/deepseek-terms-of-use.html' },
    { label: t('settingsTermsPrivacyPolicy'), href: 'https://cdn.deepseek.com/policies/zh-CN/deepseek-privacy-policy.html' },
  ]
  return (
    <>
      {items.map((item) => (
        <SettingCell
          key={item.href}
          label={item.label}
          status={null}
          action={
            <Button
              variant="outlined"
              size="m"
              className={styles.cellButton}
              onClick={() => window.open(item.href, '_blank', 'noopener,noreferrer')}
            >
              {t('settingsTermsView')}
            </Button>
          }
        />
      ))}
    </>
  )
}

const LocationSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const location = useSettings((state) => state.location)
  const province =
    location?.region === 'CN'
      ? provinces.find((item) => item.code === location.province)
      : undefined

  return (
    <SettingCell
      label={t('settingsLocation')}
      status={null}
      className={styles.locationCell}
      action={
        <div className={styles.locationSelectors}>
          {location ? (
            <IconButton
              className={styles.locationClear}
              icon={<IconCloseOutline16 />}
              tooltip={t('settingsLocationClear')}
              onClick={() => setLocation(null)}
            />
          ) : null}
          {isChineseBrowser() ? (
            <>
              <Select
                ariaLabel={t('settingsLocationProvince')}
                className={styles.provinceSelect}
                value={province?.code ?? ''}
                placeholder={t('settingsLocationProvince')}
                options={provinces.map((item) => ({ value: item.code, label: item.name }))}
                onChange={(value) => {
                  if (value !== province?.code) {
                    setLocation({ region: 'CN', province: value })
                  }
                }}
              />
              <Select
                ariaLabel={t('settingsLocationCity')}
                className={styles.citySelect}
                value={province ? (location?.city ?? '') : ''}
                disabled={!province?.cities.length}
                placeholder={t('settingsLocationCity')}
                options={
                  province?.cities.map((item) => ({ value: item.code, label: item.name })) ?? []
                }
                onChange={(value) => {
                  if (province) {
                    setLocation({ region: 'CN', province: province.code, city: value })
                  }
                }}
              />
            </>
          ) : (
            <Select
              ariaLabel={t('settingsLocationRegion')}
              className={styles.regionSelect}
              value={location?.region ?? ''}
              placeholder={t('settingsLocationRegion')}
              options={regionCodes
                .map((code) => ({ value: code, label: getRegionName(code, locale) }))
                .sort((a, b) => a.label.localeCompare(b.label, locale))}
              onChange={(value) => setLocation({ region: value })}
            />
          )}
        </div>
      }
    />
  )
}

const LocaleSetting = () => {
  const t = useTranslate()
  const localePreference = useSettings((state) => state.localePreference)
  return (
    <SettingCell
      label={t('settingsLocalePreference')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsLocalePreference')}
          value={localePreference}
          options={[
            { value: 'system', label: t('settingsLocaleSystem') },
            { value: 'zh-CN', label: t('settingsLocaleZhCN'), lang: 'zh-CN' },
            { value: 'en-US', label: t('settingsLocaleEnUS'), lang: 'en' },
          ]}
          onChange={setLocalePreference}
        />
      }
    />
  )
}

/** 朗读音色：stella（海星，女声）/ tide（暗潮，男声） */
const TtsVoiceSetting = () => {
  const t = useTranslate()
  const ttsVoice = useSettings((state) => state.ttsVoice)
  return (
    <SettingCell
      label={t('settingsTtsVoice')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsTtsVoice')}
          value={ttsVoice}
          options={[
            { value: 'stella', label: t('settingsTtsVoiceStella') },
            { value: 'tide', label: t('settingsTtsVoiceTide') },
          ]}
          onChange={setTtsVoice}
        />
      }
    />
  )
}

/** 服务端内容安全校验开关：关闭后请求不再携带 safety_check */
const SafetyCheckSetting = () => {
  const t = useTranslate()
  const safetyCheck = useSettings((state) => state.safetyCheck)
  return (
    <SettingCell
      label={t('settingsSafetyCheck')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsSafetyCheck')}
          value={safetyCheck ? 'on' : 'off'}
          options={[
            { value: 'on', label: t('settingsToggleOn') },
            { value: 'off', label: t('settingsToggleOff') },
          ]}
          onChange={(value) => setSafetyCheck(value === 'on')}
        />
      }
    />
  )
}

/** 覆盖导入的二次确认，叠在设置弹窗上 */
const ImportConfirm = ({
  historyImport,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('historyImportConfirmTitle')}
      className={styles.importConfirm}
      onClose={historyImport.cancel}
      footer={
        <>
          <Button variant="outlined" size="m" autoFocus onClick={historyImport.cancel}>
            {t('cancel')}
          </Button>
          <Button variant="dangerOutlined" size="m" onClick={() => void historyImport.confirm()}>
            {t('historyImportConfirm')}
          </Button>
        </>
      }
    >
      <div className={styles.importConfirmText}>{t('historyImportConfirmDescription')}</div>
    </Modal>
  )
}

/** 导入进度：进度条 + 实时日志；导入期间不可关闭，结束后可关闭。 */
const ImportProgressDialog = ({ run, onClose }: { run: ImportRun; onClose: () => void }) => {
  const t = useTranslate()
  const logRef = useRef<HTMLDivElement>(null)
  const percent = Math.round(Math.min(1, Math.max(0, run.percent)) * 100)
  const running = run.state === 'running'

  // 日志追加后滚到底部，始终显示最新一行。
  useEffect(() => {
    const element = logRef.current
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  }, [run.logs.length])

  return (
    <Modal
      title={t('historyImportProgressTitle')}
      width={520}
      className={styles.importProgress}
      onClose={() => {
        if (!running) {
          onClose()
        }
      }}
      footer={
        running ? undefined : (
          <Button variant="outlined" size="m" autoFocus onClick={onClose}>
            {t('close')}
          </Button>
        )
      }
    >
      <div
        className={styles.importProgressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={styles.importProgressFill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.importProgressPercent}>{percent}%</div>
      <div ref={logRef} className={styles.importLog}>
        {run.logs.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </Modal>
  )
}

const themeOptions: { value: ThemePreference; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'avatarMenuSettingsDialogThemeSelectLightOption',
    icon: <IconLightOutline16 />,
  },
  {
    value: 'dark',
    label: 'avatarMenuSettingsDialogThemeSelectDarkOption',
    icon: <IconDarkOutline16 />,
  },
  {
    value: 'system',
    label: 'avatarMenuSettingsDialogThemeSelectSystemOption',
    icon: <IconFollowsystemOutline16 />,
  },
]

/**
 * 主题项：标题下方浅色 / 深色 / 跟随系统三个选块。
 * 与下方语言选项连续排列。
 */
const ThemeSetting = () => {
  const t = useTranslate()
  const themePreference = useSettings((state) => state.themePreference)
  const label = t('avatarMenuSettingsDialogThemeItemLabel')
  return (
    <div className={styles.theme}>
      {label}
      <div role="radiogroup" aria-label={label} className={styles.themeOptions}>
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={themePreference === option.value}
            className={clsx(
              styles.themeOption,
              themePreference === option.value && styles.themeOptionSelected
            )}
            onClick={() => setThemePreference(option.value)}
          >
            {option.icon}
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** `reason` 为失败原因的文案 key，展示时按当前语言翻译后填入 `message` 参数。 */
type Status = (TranslationMessage & { error?: boolean; reason?: TranslationKey }) | null

/** 导出失败附带原因：预期的错误用对应文案作原因，其他错误用错误信息。 */
const errorStatus = (key: TranslationKey, error: unknown): Status => ({
  key,
  ...(error instanceof BackupError
    ? { reason: error.key }
    : { params: { message: error instanceof Error ? error.message : String(error) } }),
  error: true,
})

const SettingCell = ({
  label,
  description,
  status,
  action,
  className,
}: {
  label: string
  description?: string
  status: Status
  action: ReactNode
  className?: string
}) => {
  const t = useTranslate()
  return (
    <div className={clsx(styles.cell, styles.row, className)}>
      <div className={styles.text}>
        <div className={styles.label}>{label}</div>
        {status || description ? (
          <div className={clsx(styles.description, status?.error && styles.error)}>
            {status
              ? t(status.key, status.reason ? { message: t(status.reason) } : status.params)
              : description}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** 导入进度弹窗的状态：进度、实时日志与结束状态。 */
export type ImportRun = {
  percent: number
  logs: string[]
  state: 'running' | 'done' | 'error'
}

/** 选文件后先提示覆盖；确认后显示进度与日志，结束后保留结果直到用户关闭。 */
const useHistoryImport = () => {
  const t = useTranslate()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [run, setRun] = useState<ImportRun | null>(null)
  const importing = useRef(false)
  /** 进度按 1% 步进触发渲染，避免上千次事件把界面刷爆。 */
  const shownPercent = useRef(0)

  const appendLog = (line: string) => {
    setRun((prev) => (prev ? { ...prev, logs: [...prev.logs, line].slice(-400) } : prev))
  }

  const confirm = async () => {
    if (!file || importing.current) {
      return
    }
    importing.current = true
    const target = file
    setFile(null)
    setBusy(true)
    setStatus(null)
    shownPercent.current = 0
    setRun({ percent: 0, logs: [], state: 'running' })
    try {
      const count = await importHistory(target, (event) => {
        if (event.percent - shownPercent.current >= 0.01 || event.percent === 1) {
          shownPercent.current = event.percent
          setRun((prev) => (prev ? { ...prev, percent: event.percent } : prev))
        }
        if (event.log) {
          appendLog(t(event.log.key, event.log.params))
        }
      })
      setRun((prev) => (prev ? { ...prev, percent: 1, state: 'done' } : prev))
      setStatus({ key: count === 1 ? 'historyImportedOne' : 'historyImported', params: { count } })
    } catch {
      appendLog(t('importLogFailed'))
      setRun((prev) => (prev ? { ...prev, state: 'error' } : prev))
      setStatus({ key: 'historyImportFailed', error: true })
    } finally {
      importing.current = false
      setBusy(false)
    }
  }

  return {
    file,
    busy,
    status,
    run,
    closeRun: () => setRun(null),
    select: setFile,
    cancel: () => setFile(null),
    confirm,
  }
}

/** 导入 = 覆盖：用选中文件替换本地全部会话与附件。 */
const ImportHistory = ({
  historyImport,
  disabled,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
  disabled: boolean
}) => {
  const t = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <SettingCell
      label={t('historyImport')}
      description={t('historyImportDescription')}
      status={historyImport.status}
      action={
        <>
          <Button
            variant="outlined"
            size="m"
            className={clsx(styles.cellButton, styles.uploadButton)}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <IconUploadOutline14 />
            {t('upload')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                historyImport.select(file)
              }
            }}
          />
        </>
      }
    />
  )
}

/** 将全部会话及图片导出为 ZIP 文件并下载 */
const ExportHistory = ({ disabled }: { disabled: boolean }) => {
  const t = useTranslate()
  const empty = useChatStore((state) => state.sessions.length === 0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const onExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const { name, blob } = await exportHistory()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (error) {
      setStatus(errorStatus('historyExportFailed', error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingCell
      label={t('exportAllLabel')}
      description={t('historyExportDescription')}
      status={status}
      action={
        <Button
          variant="outlined"
          size="m"
          className={styles.cellButton}
          disabled={disabled || busy || empty}
          onClick={() => void onExport()}
        >
          <IconDownloadOutline16 />
          {t('exportAllDownload')}
        </Button>
      }
    />
  )
}
