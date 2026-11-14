import { create } from 'zustand'

/** 兼容协议：Anthropic 的 /messages 或 OpenAI 的 /chat/completions */
export type ProviderProtocol = 'anthropic' | 'openai'

/** 用户自行添加的模型提供商 */
export type CustomProvider = {
  /** 路由 id，唯一，用于选择与持久化 */
  id: string
  /** 展示名 */
  name: string
  /** 接口根地址，例如 https://api.example.com/anthropic/v1 */
  baseUrl: string
  protocol: ProviderProtocol
  apiKey: string
  /** 该提供商下可选用的模型 id */
  models: string[]
  /** 只有启用的提供商会出现在模型选择器里 */
  enabled: boolean
}

const KEY = 'chat-demo:providers'

const createId = () => `p_${Math.random().toString(36).slice(2, 10)}`

const read = (): CustomProvider[] => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is CustomProvider => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: typeof item.id === 'string' && item.id ? item.id : createId(),
        name: typeof item.name === 'string' ? item.name : '',
        baseUrl: typeof item.baseUrl === 'string' ? item.baseUrl : '',
        protocol: item.protocol === 'openai' ? 'openai' : 'anthropic',
        apiKey: typeof item.apiKey === 'string' ? item.apiKey : '',
        models: Array.isArray(item.models)
          ? item.models.filter((model): model is string => typeof model === 'string')
          : [],
        enabled: item.enabled !== false,
      }))
  } catch {
    return []
  }
}

const write = (providers: CustomProvider[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(providers))
  } catch {
    // 存储不可用时只保留内存状态
  }
}

type State = { providers: CustomProvider[] }

export const useProviders = create<State>(() => ({ providers: read() }))

const commit = (providers: CustomProvider[]) => {
  write(providers)
  useProviders.setState({ providers })
}

/** 新增一个空提供商，返回它的 id */
export const addProvider = (): string => {
  const provider: CustomProvider = {
    id: createId(),
    name: '',
    baseUrl: '',
    protocol: 'anthropic',
    apiKey: '',
    models: [],
    enabled: true,
  }
  commit([...useProviders.getState().providers, provider])
  return provider.id
}

export const updateProvider = (id: string, patch: Partial<Omit<CustomProvider, 'id'>>) => {
  commit(
    useProviders.getState().providers.map((provider) =>
      provider.id === id ? { ...provider, ...patch } : provider
    )
  )
}

export const removeProvider = (id: string) => {
  commit(useProviders.getState().providers.filter((provider) => provider.id !== id))
}

/** 只返回启用的提供商，模型选择器与请求路由都用它 */
export const enabledProviders = (providers: CustomProvider[]) =>
  providers.filter((provider) => provider.enabled)

/** 从模型列表文本（逗号 / 换行 / 空格分隔）解析模型 id */
export const parseModelIds = (text: string): string[] =>
  [...new Set(text.split(/[\s,，;；]+/).map((item) => item.trim()).filter(Boolean))]

/** 一张全空的提供商卡片（什么都没填）在设置关闭时自动丢弃 */
export const isBlankProvider = (provider: CustomProvider) =>
  !provider.name.trim() && !provider.baseUrl.trim() && !provider.apiKey.trim() && provider.models.length === 0

export const pruneBlankProviders = () => {
  const providers = useProviders.getState().providers
  const kept = providers.filter((provider) => !isBlankProvider(provider))
  if (kept.length !== providers.length) {
    commit(kept)
  }
}
