import type { ReactNode } from 'react'
import { Dropdown, type DropdownOption } from './Dropdown.js'
import styles from './Menu.module.css'

export type MenuOption = {
  key: string
  label: string
  icon: ReactNode
  danger?: boolean
  onSelect: () => void
}

/**
 * 会话项「更多」菜单：内部使用官方 Dropdown / DropdownMenu，
 * 因而自动获得官方 0.1s 缩放淡入、点击外部关闭、↑/↓/Enter/Esc 键盘操作。
 */
export const Menu = ({
  options,
  onOpenChange,
  children,
}: {
  options: MenuOption[]
  onOpenChange?: (open: boolean) => void
  children: (props: { open: boolean; toggle: () => void }) => ReactNode
}) => {
  const dropdownOptions: DropdownOption[] = options.map((option) => ({
    key: option.key,
    label: option.label,
    icon: option.icon,
    danger: option.danger,
  }))

  return (
    <Dropdown
      options={dropdownOptions}
      trigger="click"
      placement="bottom-start"
      offsetOptions={{ mainAxis: 4, crossAxis: -5 }}
      onOpenChange={onOpenChange}
      onSelect={(key) => {
        options.find((option) => option.key === key)?.onSelect()
      }}
    >
      {({ domRef, domProps, isOpen }) => (
        <span
          ref={domRef as React.RefObject<HTMLSpanElement>}
          className={styles.anchor}
          {...domProps}
          onClick={(event) => {
            // 会话项本身是 <a>，点「…」不能同时触发切换会话
            event.preventDefault()
            event.stopPropagation()
            ;(domProps.onClick as ((e: React.MouseEvent) => void) | undefined)?.(event)
          }}
        >
          {children({ open: isOpen, toggle: () => {} })}
        </span>
      )}
    </Dropdown>
  )
}
