import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { setProvider, setThinkingEffort, useSettings, type ThinkingEffort } from '../../services/settings.js'
import { enabledProviders, useProviders, type CustomProvider } from '../../services/providers.js'
import {
  ensureVendorLogo,
  loadModelsDev,
  logoUrl,
  lookupModel,
  useModelsDev,
  vendorLogoReady,
  type ModelsDevProvider,
} from '../../services/modelsDev.js'
import { Popover } from '../base/Popover.js'
import {
  IconChevronDownOutline14,
  IconChevronRightOutline14,
  IconCloseFill14,
  IconSearchOutline16,
} from '../base/icons.js'
import styles from './ModelPicker.module.css'

/** 内置 DeepSeek 提供商的模型（请求走官方 Anthropic 兼容接口） */
const BUILTIN_MODELS = [
  { id: 'deepseek-flash', name: 'DeepSeek Flash' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
]

const EFFORTS: ThinkingEffort[] = ['standard', 'deep', 'max']

export const BUILTIN_PROVIDER_ID = 'deepseek'

/**
 * 搜索归一化：空格、连字符、下划线、斜杠、反斜杠一律忽略，
 * 于是「DeepSeek V4」「DeepSeek-V4」「DeepSeek/V4」都能互相命中。
 */
export const normalizeModelQuery = (value: string) => value.toLowerCase().replace(/[\s\-_/\\]+/g, '')

export const matchesModelQuery = (model: { id: string; name: string }, query: string) => {
  const keyword = normalizeModelQuery(query)
  return keyword === '' || normalizeModelQuery(`${model.name} ${model.id}`).includes(keyword)
}

type Pane = 'root' | 'model' | 'effort'

export type ModelEntry = {
  providerId: string
  providerName: string
  id: string
  name: string
  /** 该模型属于哪家厂商（models.dev 的 logo id），用于显示原厂 logo */
  vendor: string | null
}

/** 组装可选模型：内置 DeepSeek + 每个启用的自定义提供商 */
export const buildEntries = (
  providers: CustomProvider[],
  catalog: Record<string, ModelsDevProvider>
): ModelEntry[] => {
  const entries: ModelEntry[] = BUILTIN_MODELS.map((model) => {
    // 名字与原厂 logo 都来自目录里**完全相同 id** 的那一条
    const found = lookupModel(model.id, catalog)
    return {
      providerId: BUILTIN_PROVIDER_ID,
      providerName: 'DeepSeek',
      id: model.id,
      name: found?.model.name ?? model.name,
      vendor: found?.provider.id ?? null,
    }
  })
  for (const provider of enabledProviders(providers)) {
    for (const id of provider.models) {
      const found = lookupModel(id, catalog)
      entries.push({
        providerId: provider.id,
        providerName: provider.name || provider.id,
        id,
        name: found?.model.name ?? id,
        vendor: found?.provider.id ?? null,
      })
    }
  }
  return entries
}

/**
 * 输入框右侧（发送键左侧）的模型与推理等级选择。
 * 结构参照 DSH 的 ModelSelect：根菜单是「模型 / 推理等级」两行，分别钻取；
 * 没有推理等级可选时（关闭深度思考）直接进入模型列表。
 */
export const ModelPicker = () => {
  const t = useTranslate()
  const providerId = useSettings((state) => state.providerId)
  const model = useSettings((state) => state.model)
  const thinking = useSettings((state) => state.thinking)
  const effort = useSettings((state) => state.thinkingEffort)
  const providers = useProviders((state) => state.providers)
  // 目录加载完成 / logo 探测完成后重算一次
  const catalog = useModelsDev((state) => state.providers)
  const [logoRevision, setLogoRevision] = useState(0)
  const [pane, setPane] = useState<Pane>('root')
  const [query, setQuery] = useState('')
  // Popover 每次渲染都会回调 onIsOpenChange，必须只在实际打开的那一次重置面板
  const wasOpenRef = useRef(false)

  // 进页面就拉目录：按钮上的模型名要立刻是 models.dev 里的真名，而不是等点了才变
  useEffect(() => {
    void loadModelsDev()
  }, [])

  const entries = useMemo(() => buildEntries(providers, catalog), [providers, catalog])

  // 探测当前可见模型所属厂商的 logo（同一厂商只请求一次）
  useEffect(() => {
    const vendors = new Set(entries.map((entry) => entry.vendor).filter(Boolean) as string[])
    for (const vendor of vendors) {
      if (vendorLogoReady(vendor) === undefined) {
        void ensureVendorLogo(vendor, () => setLogoRevision((value) => value + 1))
      }
    }
  }, [entries])

  const hasLogo = useCallback(
    (entry: ModelEntry) => {
      // logoRevision 代表探测结果的版本，读到它才能让谓词随结果更新而重算
      void logoRevision
      return entry.vendor !== null && vendorLogoReady(entry.vendor) === true
    },
    [logoRevision]
  )

  const current = entries.find((entry) => entry.providerId === providerId && entry.id === model) ?? entries[0]
  const filtered = entries.filter((entry) => matchesModelQuery(entry, query))

  /** 分组，并让有 logo 的模型排在前面 */
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; models: ModelEntry[] }>()
    for (const entry of filtered) {
      const bucket = map.get(entry.providerId) ?? { name: entry.providerName, models: [] }
      bucket.models.push(entry)
      map.set(entry.providerId, bucket)
    }
    return [...map.entries()].map(([id, value]) => ({
      id,
      name: value.name,
      models: [...value.models].sort((a, b) => Number(hasLogo(b)) - Number(hasLogo(a))),
    }))
  }, [filtered, hasLogo])

  const effortLabel: Record<ThinkingEffort, string> = {
    standard: t('thinkingEffortStandard'),
    deep: t('thinkingEffortDeep'),
    max: t('thinkingEffortMax'),
  }

  // 关闭深度思考后推理等级不再参与请求，回到默认档位
  useEffect(() => {
    if (!thinking && effort !== 'standard') {
      setThinkingEffort('standard')
    }
  }, [thinking, effort])

  const currentLabel = current?.name ?? model

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !wasOpenRef.current) {
        // 只有「模型 / 推理等级」两行时才需要根菜单；否则直接进模型列表
        setPane(thinking ? 'root' : 'model')
        setQuery('')
        // 目录有 6MB，放到第一次打开时再拉，不拖慢首屏
        void loadModelsDev()
      }
      wasOpenRef.current = open
    },
    [thinking]
  )

  return (
    <Popover
      trigger="click"
      placement="top-end"
      offsetOptions={{ mainAxis: 6, crossAxis: 0 }}
      onIsOpenChange={handleOpenChange}
      renderTrigger={({ domRef, domProps, isOpen }) => (
        <button
          ref={domRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className={styles.button}
          aria-label={t('modelSelectorLabel')}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          title={thinking ? `${currentLabel} · ${effortLabel[effort]}` : currentLabel}
          {...domProps}
        >
          <span className={styles.buttonText}>{currentLabel}</span>
          {thinking ? <span className={styles.effort}>{effortLabel[effort]}</span> : null}
          <IconChevronDownOutline14 />
        </button>
      )}
      renderFloating={({ nodeRef, onMouseDown }) => (
        <div
          ref={nodeRef as React.RefObject<HTMLDivElement>}
          role="menu"
          className={clsx('ds-dropdown-menu', 'ds-elevated', styles.panel)}
          onMouseDown={onMouseDown}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && thinking && pane !== 'root') {
              event.stopPropagation()
              setPane('root')
            }
          }}
        >
          {pane === 'root' ? (
            <>
              <div
                role="menuitem"
                className={clsx('ds-dropdown-menu-option', styles.cell)}
                onClick={() => setPane('model')}
              >
                <span className={styles.cellLabel}>{t('modelSelectorModel')}</span>
                <span className={styles.cellValue}>{currentLabel}</span>
                <IconChevronRightOutline14 />
              </div>
              {thinking ? (
                <div
                  role="menuitem"
                  className={clsx('ds-dropdown-menu-option', styles.cell)}
                  onClick={() => setPane('effort')}
                >
                  <span className={styles.cellLabel}>{t('reasoningLevel')}</span>
                  <span className={styles.cellValue}>{effortLabel[effort]}</span>
                  <IconChevronRightOutline14 />
                </div>
              ) : null}
            </>
          ) : null}

          {pane === 'model' ? (
            <>
              <div className={styles.search}>
                <IconSearchOutline16 />
                <input
                  className={styles.searchInput}
                  value={query}
                  placeholder={t('modelSearchPlaceholder')}
                  autoFocus
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query !== '' ? (
                  <button
                    type="button"
                    className={styles.searchClear}
                    aria-label={t('modelSearchClear')}
                    onClick={() => setQuery('')}
                  >
                    <IconCloseFill14 />
                  </button>
                ) : null}
              </div>
              <div className={styles.list}>
                {grouped.length === 0 ? (
                  <div className={styles.empty}>{t('modelSearchEmpty')}</div>
                ) : (
                  grouped.map((group) => (
                    <div key={group.id}>
                      <div className={styles.groupTitle}>{group.name}</div>
                      {group.models.map((entry) => {
                        const selected = entry.providerId === providerId && entry.id === model
                        return (
                          <div
                            key={`${entry.providerId}:${entry.id}`}
                            role="menuitemradio"
                            aria-checked={selected}
                            className={clsx(
                              'ds-dropdown-menu-option',
                              styles.option,
                              selected && 'ds-dropdown-menu-option--selected'
                            )}
                            onClick={() => setProvider(entry.providerId, entry.id)}
                          >
                            {/* 原厂 logo：按模型 id 判断归属，判断不出就不渲染、不占位 */}
                            {entry.vendor !== null && vendorLogoReady(entry.vendor) === true ? (
                              <img
                                className={styles.logo}
                                src={logoUrl(entry.vendor)}
                                alt=""
                                aria-hidden
                                loading="lazy"
                              />
                            ) : null}
                            <span className={styles.optionLabel}>{entry.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}

          {pane === 'effort' ? (
            <div className={styles.list}>
              {EFFORTS.map((level) => (
                <div
                  key={level}
                  role="menuitemradio"
                  aria-checked={level === effort}
                  className={clsx(
                    'ds-dropdown-menu-option',
                    styles.option,
                    level === effort && 'ds-dropdown-menu-option--selected'
                  )}
                  onClick={() => setThinkingEffort(level)}
                >
                  <span className={styles.optionLabel}>{effortLabel[level]}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    />
  )
}
