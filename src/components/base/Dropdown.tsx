import clsx from 'clsx'
import { useCallback,useEffect, useRef, useState, type ReactNode } from 'react'
import { Popover, type PopoverHandle } from './Popover.js'

export type DropdownOption = {
  key: string
  label: ReactNode
  icon?: ReactNode
  danger?: boolean
  type?: 'divider'
  className?: string
}

/**
 * 官方 DropdownMenu（模块 cv）+ Dropdown（模块 cC）的合并移植。
 *
 * 官方菜单：.ds-dropdown-menu.ds-elevated，role=menu；
 * 键盘：Esc 关闭、↑/↓ 切换 pending、Enter 选中；
 * 打开/关闭动画由 Popover 的 ds-fade-in-zoom-in 提供。
 */
export const Dropdown = ({
  options,
  onSelect,
  trigger = 'click',
  placement = 'bottom-start',
  offsetOptions,
  disabled,
  children,
  menuClassName,
  minWidth,
  onOpenChange,
}: {
  options: DropdownOption[]
  onSelect: (key: string, option: DropdownOption) => void
  trigger?: 'click' | 'hover'
  placement?: Parameters<typeof Popover>[0]['placement']
  offsetOptions?: { mainAxis?: number; crossAxis?: number }
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
  children: (args: {
    domRef: React.RefObject<HTMLElement | null>
    domProps: Record<string, unknown>
    isOpen: boolean
  }) => ReactNode
  menuClassName?: string
  minWidth?: number
}) => {
  const popoverRef = useRef<PopoverHandle | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const close = useCallback(() => {
    popoverRef.current?.setIsOpen(false)
    setPending(null)
  }, [])

  const handleKeyboardEvent = useCallback(
    (event: React.KeyboardEvent) => {
      const items = optionsRef.current.filter((option) => option.type !== 'divider')
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (items.length === 0) {
          return
        }
        setPending((current) => {
          const index = items.findIndex((item) => item.key === current)
          const next =
            event.key === 'ArrowDown'
              ? items[(index + 1) % items.length]
              : items[(index - 1 + items.length) % items.length]
          return next.key
        })
        return
      }
      if (event.key === 'Enter') {
        const item = items.find((option) => option.key === pending)
        if (item) {
          event.preventDefault()
          onSelect(item.key, item)
          close()
        }
      }
    },
    [close, onSelect, pending]
  )

  useEffect(() => {
    if (!isOpen) {
      setPending(null)
    }
  }, [isOpen])

  return (
    <Popover
      trigger={trigger}
      disabled={disabled}
      placement={placement}
      offsetOptions={offsetOptions}
      onIsOpenChange={(open) => {
        setIsOpen(open)
        onOpenChange?.(open)
      }}
      onExit={() => {
        // 与官网一致：菜单退场后把焦点还给触发器再失焦，
        // 否则 :focus-within 会让「…」在菜单关闭后仍然常显
        const reference = popoverRef.current?.referenceDomRef.current
        const active = document.activeElement
        if (reference && active instanceof HTMLElement && reference.contains(active)) {
          active.blur()
        }
      }}
      componentRef={popoverRef}
      renderTrigger={({ domRef, domProps }) =>
        children({
          domRef,
          isOpen,
          domProps: {
            ...domProps,
            onClick: (event: React.MouseEvent) => {
              ;(domProps.onClick as ((e: React.MouseEvent) => void) | undefined)?.(event)
            },
            onKeyDown: (event: React.KeyboardEvent) => {
              if (isOpen) {
                handleKeyboardEvent(event)
                return
              }
              if (event.key === 'ArrowDown' || event.key === 'Enter') {
                event.preventDefault()
                popoverRef.current?.setIsOpen(true)
              }
            },
          },
        })
      }
      renderFloating={({ nodeRef, onMouseDown }) => (
        <div
          ref={nodeRef}
          role="menu"
          className={clsx('ds-dropdown-menu', 'ds-elevated', menuClassName)}
          style={minWidth ? { minWidth } : undefined}
          onMouseDown={onMouseDown}
        >
          {options.map((option, index) => {
            if (option.type === 'divider') {
              return (
                <div
                  key={`divider-${index}`}
                  className="ds-dropdown-menu-option ds-dropdown-menu-option-divider"
                />
              )
            }
            return (
              <div
                key={option.key}
                role="menuitem"
                className={clsx(
                  'ds-dropdown-menu-option',
                  option.danger && 'ds-dropdown-menu-option--error',
                  pending === option.key && 'ds-dropdown-menu-option--pending',
                  option.className
                )}
                onMouseEnter={() => setPending(option.key)}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(option.key, option)
                  close()
                }}
              >
                {option.icon ? <div className="ds-dropdown-menu-option__icon">{option.icon}</div> : null}
                <div className="ds-dropdown-menu-option__label">{option.label}</div>
              </div>
            )
          })}
        </div>
      )}
    />
  )
}
