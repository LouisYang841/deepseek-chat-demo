import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 跨平台构建入口。
 * 上游脚本使用 `rm -rf dist && NODE_ENV=production rspack build`，
 * 在 Windows 的 cmd / PowerShell 下无法执行；这里用 Node 直接调用本地 CLI，
 * dist 的清理交给 rspack 配置中的 output.clean。
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = path.join(root, 'node_modules', '@rspack', 'cli', 'bin', 'rspack.js')

if (!existsSync(cli)) {
  console.error('[build] 找不到 @rspack/cli，请先执行 pnpm install / npm install')
  process.exit(1)
}

const result = spawnSync(process.execPath, [cli, 'build', '-c', 'rspack.config.ts'], {
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
