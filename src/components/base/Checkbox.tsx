import clsx from 'clsx'
import styles from './Checkbox.module.css'

/**
 * 20px 圆形复选框（官网 `ds-checkbox --circle`）：侧栏多选与设置页共用同一套视觉。
 * `readOnly` 用于纯展示场景（包在可点击的会话项里时不能是 button）。
 */
export const Checkbox = ({
  checked,
  onChange,
  ariaLabel,
  readOnly = false,
}: {
  checked: boolean
  onChange?: (checked: boolean) => void
  ariaLabel?: string
  readOnly?: boolean
}) => {
  const className = clsx(styles.checkbox, checked && styles.checkboxActive)
  const mark = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5.6 10.3L8.3 12.9L13.9 7.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (readOnly) {
    return (
      <span className={className} role="checkbox" aria-checked={checked} aria-readonly="true">
        {mark}
      </span>
    )
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={className}
      onClick={() => onChange?.(!checked)}
    >
      {mark}
    </button>
  )
}
