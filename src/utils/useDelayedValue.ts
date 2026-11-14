import { useEffect, useReducer, useRef } from 'react'

/**
 * 官方 `useDelayedValue`（模块 12171 的 Qj）。
 *
 * - `shouldDelay(value)` 为 true 时，返回值会在 `delay` 毫秒后才跟上 `value`；
 * - 用于「先播放退出动画（200ms）再卸载」的场景。
 */
export const useDelayedValue = <T>({
  value,
  shouldDelay = () => true,
  delay,
  defaultValue,
}: {
  value: T
  shouldDelay?: (value: T) => boolean
  delay: number
  defaultValue: T
}): T => {
  const delayed = shouldDelay(value)
  const ref = useRef(defaultValue)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    if (!delayed) {
      ref.current = value
      return
    }
    const timer = setTimeout(() => {
      ref.current = value
      forceUpdate()
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay, delayed])

  return delayed ? ref.current : value
}
