import { useEffect, useState } from 'react'

/**
 * 厂商 logo 内联渲染组件。
 *
 * models.dev 的 logo 是 `fill="currentColor"` 的单色 SVG。用 <img src> 加载时
 * currentColor 无法继承页面主题色（深色模式下会变成黑图标看不见）；把 SVG
 * 内容内联进 DOM 后，图标就像用户头像一样跟随 currentColor 自动适配深浅色。
 *
 * 拉取到的 SVG 会缓存到 localStorage（本地缓存），之后离线也能显示，
 * 同时避免每次打开模型菜单都重新联网。
 */

const CACHE_KEY = 'chat-demo:vendor-logos'
/** 真 logo 是 viewBox 0 0 40 40；未知厂商返回的是 24×24 通用占位图 */
const LOGO_MARKER = 'viewBox="0 0 40 40"'

/** 内存中已解析的结果：null 表示该厂商确实没有可用 logo */
const memory = new Map<string, string | null>()

type Cache = Record<string, string>

const readCache = (): Cache => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Cache
  } catch {
    return {}
  }
}

const writeCache = (cache: Cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 存储不可用只保留内存缓存
  }
}

/** 从完整 SVG 里提取可安全内联的内部标记，拒绝脚本等危险标签 */
const extractMarkup = (svg: string): string | null => {
  if (!svg.includes(LOGO_MARKER)) {
    return null
  }
  const match = /<svg[^>]*>([\s\S]*?)<\/svg>/i.exec(svg)
  if (!match) {
    return null
  }
  const inner = match[1].trim()
  // 只保留绘图类标签，杜绝 script / foreignObject / 事件属性
  if (/<\s*\/?\s*(script|foreignObject|iframe|object|embed)\b/i.test(inner) || /\bon\w+\s*=/i.test(inner)) {
    return null
  }
  return inner
}

/** 拉取并缓存某厂商的 logo 内部结构；结果只来自 models.dev 静态资源 */
export const loadVendorLogo = async (vendor: string): Promise<string | null> => {
  if (memory.has(vendor)) {
    return memory.get(vendor) ?? null
  }
  const cached = readCache()[vendor]
  if (cached) {
    memory.set(vendor, cached)
    return cached
  }
  try {
    const response = await fetch(`https://models.dev/logos/${encodeURIComponent(vendor)}.svg`)
    const markup = response.ok ? extractMarkup(await response.text()) : null
    memory.set(vendor, markup)
    if (markup) {
      writeCache({ ...readCache(), [vendor]: markup })
    }
    return markup
  } catch {
    memory.set(vendor, null)
    return null
  }
}

export const VendorLogo = ({
  vendor,
  size = 16,
  className,
}: {
  vendor: string
  size?: number
  className?: string
}) => {
  const [markup, setMarkup] = useState<string | null>(() => memory.get(vendor) ?? readCache()[vendor] ?? null)

  useEffect(() => {
    if (markup !== null || memory.has(vendor)) {
      return
    }
    let alive = true
    void loadVendorLogo(vendor).then((value) => {
      if (alive) {
        setMarkup(value)
      }
    })
    return () => {
      alive = false
    }
  }, [vendor, markup])

  if (!markup) {
    return null
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
