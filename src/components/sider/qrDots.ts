import qrcode from 'qrcode-generator'

/** Simple Icons GitHub 标志（24×24，与 AccountIcons 的 IconGithubMark16 同一 path） */
const GITHUB_PATH =
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'

/** 标志颜色（用户指定：黑色） */
const LOGO_COLOR = '#000'

/**
 * 圆点风格二维码 SVG（对齐官网 qrcode.svg 的视觉，规格由用户指定）：
 * - 每个模块画一个直径 = dot 的圆点（相邻圆点自然相连）；
 * - 三个 7×7 大定位标替换为「大圆点 + 白色边框(1 圆点) + 黑色边框(1 圆点)」；
 *   最小的 5×5 对齐图案保持标准画法（5×5 边框圆点 + 1 个中心圆点）；
 * - 四周留白 quiet 个圆点（默认 2）；
 * - 链接为 github.com 时中央放 GitHub 标志（占 11×11 圆点白色底，标志约 6.5 圆点宽，
 *   官网鲸鱼标志同款品牌蓝），否则不画标志与白底；
 * - 一个圆点 = dot 像素（viewBox 单位，默认 32）。
 */
export const createDotQrSvg = (url: string, dot = 32, quiet = 2): string => {
  const qr = qrcode(0, 'Q')
  qr.addData(url)
  qr.make()
  const n = qr.getModuleCount()
  const total = (n + quiet * 2) * dot

  const inFinder = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7)

  const parts: string[] = [`<rect width="${total}" height="${total}" fill="#fff"/>`]

  // 数据圆点（三个 7×7 定位标区域跳过，由下方大定位标替代）
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.isDark(row, col) || inFinder(row, col)) {
        continue
      }
      const cx = (col + quiet + 0.5) * dot
      const cy = (row + quiet + 0.5) * dot
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${dot / 2}" fill="#000"/>`)
    }
  }

  // 三个大定位标：中心大圆点(直径 3 圆点) + 白色边框(1 圆点) + 黑色边框(1 圆点)，
  // 外缘正好覆盖 7×7 区域
  const finderCenters: [number, number][] = [
    [3 + quiet, 3 + quiet],
    [n - 4 + quiet, 3 + quiet],
    [3 + quiet, n - 4 + quiet],
  ]
  for (const [fx, fy] of finderCenters) {
    const cx = (fx + 0.5) * dot
    const cy = (fy + 0.5) * dot
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${3.5 * dot}" fill="#000"/>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${2.5 * dot}" fill="#fff"/>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${1.5 * dot}" fill="#000"/>`)
  }

  // GitHub 标志：仅当链接是 github.com 时画 11×11 圆点白色底 + 品牌蓝标志
  let host = ''
  try {
    host = new URL(url).host
  } catch {
    // 非法链接不画标志
  }
  if (host === 'github.com' || host === 'www.github.com') {
    const box = 11 * dot
    const x = (total - box) / 2
    const y = (total - box) / 2
    const mark = 6.5 * dot
    const scale = mark / 24
    const tx = (total - mark) / 2
    const ty = (total - mark) / 2
    parts.push(`<rect x="${x}" y="${y}" width="${box}" height="${box}" fill="#fff"/>`)
    parts.push(
      `<g transform="translate(${tx} ${ty}) scale(${scale})"><path d="${GITHUB_PATH}" fill="${LOGO_COLOR}"/></g>`
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}">${parts.join('')}</svg>`
}
