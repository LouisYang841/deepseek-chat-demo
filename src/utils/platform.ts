/**
 * 平台判断，与官网保持一致的判定方式。
 *
 * 官网的判定：navigator.platform 以 mac 开头，
 * 或 iPad/iPhone/iPod / MacIntel+触摸屏（iPadOS 伪装成 Mac）。
 */

/** 是否是 Mac（含 iPadOS） */
export const isMac = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false
  }
  const isTouchMac =
    /iPad|iPhone|iPod/.test(navigator.platform) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return navigator.platform.toLowerCase().startsWith('mac') || isTouchMac
}

/** 快捷键提示文案：Mac 用 ⌘，其他用 Ctrl */
export const shortcutLabel = (key: string): string => (isMac() ? `⌘ ${key}` : `Ctrl ${key}`)
