import clsx from 'clsx'
import { useMemo, useRef } from 'react'
import { isMobileDevice } from '../../app/viewport.js'
import { useTranslate } from '../../i18n/index.js'
import { setApiKey, useSettings } from '../../services/settings.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { showToast } from '../base/toastState.js'
import { Dropdown, type DropdownOption } from '../base/Dropdown.js'
import { Popover } from '../base/Popover.js'
import { createDotQrSvg } from './qrDots.js'
import {
  IconGithubMark16,
  IconHelpCircle16,
  IconLogout16,
  IconSettingsGear16,
} from './AccountIcons.js'
import styles from './AccountMenu.module.css'

/**
 * 侧边栏底部的账户区。
 *
 * 结构与官网一致（模块 bS）：
 *   div.row（tabIndex=0，点击展开）> 头像 / 名称 / 三点图标
 * 菜单使用官方 Dropdown：placement top-start、offset {mainAxis:4,crossAxis:-10}，
 * 打开时 ds-fade-in-zoom-in 缩放淡入（0.1s），点击外部或 Esc 收起。
 *
 * 菜单项按用户定制对齐官网四项结构（known-issues-re.md 项 6）：
 *   项目仓库（hover 弹二维码浮层，点击打开仓库）/ 系统设置 / 帮助与反馈 / 退出登录。
 * 「项目仓库」的浮层借官网「下载手机应用」的 hover 二维码机制（浮层在菜单项右侧）。
 */
export const AccountMenu = () => {
  const t = useTranslate()
  const apiKey = useSettings((state) => state.apiKey)

  /** 只保留首尾各 3 位，中间用 * 代替 */
  const masked = apiKey ? `${apiKey.slice(0, 3)}******${apiKey.slice(-2)}` : null

  // 仓库二维码：圆点风格，运行时按 __REPO_URL__ 生成（换仓库改 rspack.config.ts 的 repoUrl）
  const repoQrSvg = useMemo(() => createDotQrSvg(__REPO_URL__), [])

  // 官网 bh：浮层锚定到菜单元素（positionDomRef），而不是触发文字
  const repoRowAnchorRef = useRef<HTMLElement | null>(null)

  const options: DropdownOption[] = [
    {
      key: 'repo',
      // 官网 bh：hover 浮层，placement 移动端 left-start / 桌面 right-start，flip 兜底 top-start；
      // 菜单项 overflow:auto 会裁剪 absolute 浮层，须 portal
      label: (
        <Popover
          trigger="hover"
          placement={isMobileDevice ? 'left-start' : 'right-start'}
          flipOptions={{ fallbackPlacements: ['top-start'] }}
          offsetOptions={{ mainAxis: 8 }}
          anchorRef={repoRowAnchorRef}
          renderTrigger={({ domRef, domProps }) => (
            <span
              ref={(el) => {
                ;(domRef as { current: HTMLElement | null }).current = el
                repoRowAnchorRef.current =
                  (el?.closest('[role="menu"]') as HTMLElement | null) ?? null
              }}
              {...domProps}
              className={styles.repoLabel}
            >
              {t('projectRepo')}
            </span>
          )}
          renderFloating={({ nodeRef }) => (
            <div ref={nodeRef} className={styles.repoQrFloat}>
              <span
                className={styles.repoQrImage}
                // qrcode-generator 生成的可信 SVG（内容只由 __REPO_URL__ 构成）
                dangerouslySetInnerHTML={{ __html: repoQrSvg }}
              />
              <span className={styles.repoQrText}>{t('scanProjectRepoQr')}</span>
            </div>
          )}
        />
      ),
      icon: <IconGithubMark16 />,
    },
    {
      key: 'settings',
      label: t('accountSystemSettings'),
      icon: <IconSettingsGear16 />,
    },
    {
      key: 'helpFeedback',
      label: t('helpFeedback'),
      icon: <IconHelpCircle16 />,
    },
    {
      key: 'logout',
      label: t('logout'),
      icon: <IconLogout16 />,
    },
  ]

  return (
    <div className={styles.wrap}>
      <Dropdown
        options={options}
        trigger="click"
        placement="top-start"
        offsetOptions={{ mainAxis: 4, crossAxis: 0 }}
        onSelect={(key) => {
          if (key === 'repo') {
            window.open(__REPO_URL__, '_blank', 'noopener')
          } else if (key === 'settings') {
            openSettings('general')
          } else if (key === 'helpFeedback') {
            window.open(`${__REPO_URL__}/issues`, '_blank', 'noopener')
          } else if (key === 'logout') {
            // 本项目语境的「退出登录」= 清除 API Key（官网为服务端登出，无确认弹窗）
            setApiKey(null)
            showToast({ key: 'accountSignedOut' })
          }
        }}
      >
        {({ domRef, domProps, isOpen }) => (
          <div
            ref={domRef as React.RefObject<HTMLDivElement>}
            className={styles.row}
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            {...domProps}
          >
            <span className={styles.avatar} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.0307 5.46369C11.0305 3.78995 9.6734 2.43357 7.99961 2.43357C6.32601 2.43379 4.96972 3.79009 4.96949 5.46369C4.96949 7.13748 6.32587 8.49455 7.99961 8.49477C9.67354 8.49477 11.0307 7.13762 11.0307 5.46369ZM12.3163 5.46369C12.3163 7.84777 10.3837 9.78042 7.99961 9.78042C5.61572 9.7802 3.68288 7.84763 3.68288 5.46369C3.6831 3.07993 5.61586 1.14718 7.99961 1.14695C10.3836 1.14695 12.3161 3.0798 12.3163 5.46369Z"
                  fill="currentColor"
                />
                <path
                  d="M8.00002 10.3316C11.7343 10.3316 14.1864 11.8997 15.0387 14.4445L14.4292 14.6483L13.8197 14.8531C13.1955 12.9893 11.3673 11.6182 8.00002 11.6182C4.63277 11.6182 2.80455 12.9893 2.18031 14.8531L1.5708 14.6483L0.961304 14.4445C1.81368 11.8997 4.26579 10.3316 8.00002 10.3316Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className={clsx(styles.label, !masked && styles.labelMuted)}>
              {masked ?? t('accountNotSignedIn')}
            </span>
            <span className={styles.dots} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4.55146 8.00001C4.55146 8.63513 4.03659 9.15001 3.40146 9.15001C2.76634 9.15001 2.25146 8.63513 2.25146 8.00001C2.25146 7.36488 2.76634 6.85001 3.40146 6.85001C4.03659 6.85001 4.55146 7.36488 4.55146 8.00001Z"
                  fill="currentColor"
                />
                <path
                  d="M9.1476 8.00001C9.1476 8.63513 8.63273 9.15001 7.9976 9.15001C7.36248 9.15001 6.8476 8.63513 6.8476 8.00001C6.8476 7.36488 7.36248 6.85001 7.9976 6.85001C8.63273 6.85001 9.1476 7.36488 9.1476 8.00001Z"
                  fill="currentColor"
                />
                <path
                  d="M13.7486 8.00001C13.7486 8.63513 13.2338 9.15001 12.5986 9.15001C11.9635 9.15001 11.4486 8.63513 11.4486 8.00001C11.4486 7.36488 11.9635 6.85001 12.5986 6.85001C13.2338 6.85001 13.7486 7.36488 13.7486 8.00001Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        )}
      </Dropdown>
    </div>
  )
}
