import { useRef, type ReactNode, type RefObject } from 'react'
import { CSSTransition, SwitchTransition } from 'react-transition-group'

/**
 * 官方 `Transition`（模块 31837）的移植：`react-transition-group` 的 CSSTransition，
 * timeout 固定 100ms，动画类名就是官方 ds-fade-in-zoom-in-*。
 *
 * 使用 render-prop 把 nodeRef 交给实际节点（与官方 children(nodeRef) 同构）。
 */
export const FadeInZoomIn = ({
  in: inProp,
  appear = false,
  animated = true,
  slideUp = false,
  onExited,
  children,
}: {
  in: boolean
  appear?: boolean
  animated?: boolean
  /** 本项目自定：自下而上（移动端 bottom sheet），替代官方 zoom-in */
  slideUp?: boolean
  onExited?: () => void
  children: (nodeRef: RefObject<HTMLDivElement>) => ReactNode
}) => {
  const nodeRef = useRef<HTMLDivElement>(null)

  if (!animated) {
    return inProp ? children(nodeRef) : null
  }

  return (
    <CSSTransition
      nodeRef={nodeRef}
      appear={appear}
      in={inProp}
      timeout={100}
      classNames={
        slideUp
          ? {
              appear: 'ds-slide-up-enter',
              appearActive: 'ds-slide-up-active',
              enter: 'ds-slide-up-enter',
              enterActive: 'ds-slide-up-active',
              exit: 'ds-slide-up-exit',
              exitActive: 'ds-slide-up-exit-active',
            }
          : {
              appear: 'ds-fade-in-zoom-in-enter',
              appearActive: 'ds-fade-in-zoom-in-active',
              enter: 'ds-fade-in-zoom-in-enter',
              enterActive: 'ds-fade-in-zoom-in-active',
              exit: 'ds-fade-in-zoom-in-exit',
              exitActive: 'ds-fade-in-zoom-in-exit-active',
            }
      }
      onExited={onExited}
      unmountOnExit
    >
      {children(nodeRef)}
    </CSSTransition>
  )
}

/**
 * 官方 `CrossFade`（模块 cx）：SwitchTransition + CSSTransition，
 * 旧图标绝对定位后 0.1s 缩小淡出，新图标放大淡入（官网复制按钮就是它）。
 */
export const CrossFade = ({ nodeKey, children }: { nodeKey: string | number; children: ReactNode }) => {
  const nodeRef = useRef<HTMLSpanElement>(null)
  return (
    <span className="ds-cross-fade">
      <SwitchTransition mode="out-in">
        <CSSTransition
          key={nodeKey}
          nodeRef={nodeRef}
          addEndListener={(done: () => void) => {
            const node = nodeRef.current
            if (!node) {
              done()
              return
            }
            const handler = () => done()
            node.addEventListener('transitionend', handler, false)
            return () => node.removeEventListener('transitionend', handler, false)
          }}
          classNames="ds-cross-fade"
        >
          <span ref={nodeRef} className="ds-cross-fade__item">
            {children}
          </span>
        </CSSTransition>
      </SwitchTransition>
    </span>
  )
}

/** 官方 `Fade`（模块 43377 内的 d）：遮罩层淡入淡出，100ms。 */
export const Fade = ({
  in: inProp,
  appear = false,
  onExited,
  children,
}: {
  in: boolean
  appear?: boolean
  onExited?: () => void
  children: (nodeRef: RefObject<HTMLDivElement>) => ReactNode
}) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <CSSTransition
      nodeRef={nodeRef}
      appear={appear}
      in={inProp}
      timeout={100}
      classNames={{
        appear: 'ds-fade-in-enter',
        appearActive: 'ds-fade-in-active',
        enter: 'ds-fade-in-enter',
        enterActive: 'ds-fade-in-active',
        exit: 'ds-fade-in-exit',
        exitActive: 'ds-fade-in-exit-active',
      }}
      onExited={onExited}
      unmountOnExit
    >
      {children(nodeRef)}
    </CSSTransition>
  )
}
