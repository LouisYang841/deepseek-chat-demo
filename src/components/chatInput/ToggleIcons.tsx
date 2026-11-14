import { memo, useLayoutEffect, useMemo } from 'react'
import { useLottie } from 'lottie-react'
import { globeAnimation } from './lottie/globe.js'
import { thinkAnimation } from './lottie/think.js'
import type { AnimationItem } from 'lottie-web'

type LottieData = {
  ip?: number
  op: number
  [key: string]: unknown
}

/**
 * 官方 ToggleLottieIcon（chat-main.js 模块 v7）的移植。
 *
 * 动画数据是官网内联的 Lottie JSON（think-ring-final / globe），
 * 播放逻辑与官网逐行一致：
 *   - 初始停在关闭态（ip）
 *   - 开启：playSegments([当前帧, 末帧], true) 正向播放
 *   - 关闭：playSegments([当前帧, 首帧], true) 反向播放
 * 使用 lottie-react 的 useLottie（官网同样是这个库的 useLottie）。
 */
const ToggleLottieIcon = memo(function ToggleLottieIcon({
  animationData,
  enabled,
  animateOff = true,
  size = 16,
}: {
  animationData: LottieData
  enabled: boolean
  animateOff?: boolean
  size?: number
}) {
  const ip = animationData.ip ?? 0
  const op = animationData.op - ip - 1
  const initialSegment = useMemo<[number, number]>(() => [enabled ? op : ip, enabled ? op : ip], []) // eslint-disable-line react-hooks/exhaustive-deps

  const { View, animationItem } = useLottie(
    {
      animationData,
      loop: false,
      autoplay: false,
      initialSegment,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    },
    { width: size, height: size }
  )

  useLayoutEffect(() => {
    if (!animationItem) {
      return
    }
    const item = animationItem as AnimationItem & {
      firstFrame: number
      currentRawFrame: number
      totalFrames: number
      timeCompleted: number
      segments: unknown[]
    }
    const target = enabled ? op : ip
    const current = item.firstFrame + item.currentRawFrame
    if (current === target) {
      return
    }

    if (!enabled && !animateOff) {
      item.segments.length = 0
      item.firstFrame = ip
      item.totalFrames = op + 1
      item.timeCompleted = item.totalFrames
      item.goToAndStop(target, true)
      return
    }
    item.playSegments([current, target], true)
  }, [animationItem, enabled, animateOff, op, ip])

  return (
    <div className="ds-lottie-toggle-icon" aria-hidden>
      {View}
    </div>
  )
})

/** 深度思考：think-ring-final */
export const ThinkToggleIcon = ({ enabled }: { enabled: boolean }) => (
  <ToggleLottieIcon animationData={thinkAnimation as unknown as LottieData} enabled={enabled} size={14} />
)

/** 联网搜索：globe */
export const GlobeToggleIcon = ({ enabled }: { enabled: boolean }) => (
  <ToggleLottieIcon animationData={globeAnimation as unknown as LottieData} enabled={enabled} size={14} />
)
