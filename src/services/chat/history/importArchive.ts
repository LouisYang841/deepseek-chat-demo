import type { TranslationKey, TranslationParams } from '../../../i18n/index.js'
import * as db from '../db.js'
import type { Session } from '../types.js'
import { BackupError, fail } from './errors.js'
import type { SessionIndexEntry } from './format.js'
import { INDEX_PATH, MANIFEST_PATH, USER_PATH, parseSessionPath, sessionFilesDir } from './paths.js'
import { checkManifest, readSessionFile, readSessionIndex } from './schema.js'
import { toLocalSession } from './toLocal.js'
import {
  ArchiveError,
  isZipFile,
  readArchive,
  readEntry,
  listArchivePaths,
  skipEntry,
  type ArchiveEntry,
} from './zipReader.js'

/** 会话批量写入的粒度：条数或字节数先到者为准。 */
const STAGING_BATCH_COUNT = 128
const STAGING_BATCH_BYTES = 8 * 1024 * 1024
/** 每写入多少个会话记一条日志。 */
const SESSION_LOG_EVERY = 100
/** 会话阶段占总进度的比例。 */
const SESSION_PORTION = 0.8
const SESSION_START = 0.02

/** 导入进度与日志事件；log 的文案由界面按当前语言翻译。 */
export type ImportEvent = {
  /** 0–1 的总体进度 */
  percent: number
  log?: { key: TranslationKey; params?: TranslationParams }
}

export type ReportImportEvent = (event: ImportEvent) => void

/** 从原件字节补充图片 MIME；无法识别时为空字符串，图片身份仍由归档的 is_image 决定。 */
const imageType = (bytes: Uint8Array): string => {
  const startsWith = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte)
  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 12))
  if (startsWith(0xff, 0xd8, 0xff)) {
    return 'image/jpeg'
  }
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return 'image/png'
  }
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) {
    return 'image/gif'
  }
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') {
    return 'image/webp'
  }
  if (startsWith(0x42, 0x4d)) {
    return 'image/bmp'
  }
  if (startsWith(0x49, 0x49, 0x2a, 0) || startsWith(0x4d, 0x4d, 0, 0x2a)) {
    return 'image/tiff'
  }
  if (header.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(header.slice(8, 12))) {
    return 'image/avif'
  }
  return ''
}

const readJson = async (entry: ArchiveEntry): Promise<unknown> => {
  const text = await (await readEntry(entry)).text()
  try {
    return JSON.parse(text)
  } catch {
    return fail('backupInvalidJson')
  }
}

/**
 * 检查 ZIP 格式、首个 manifest 条目及格式版本。
 * 校验失败时保留正在生成的回答和现有暂存数据。
 */
export const checkArchiveFormat = async (file: File): Promise<void> => {
  if (!(await isZipFile(file))) {
    fail('backupUnrecognized')
  }
  try {
    for await (const entry of readArchive(file)) {
      if (entry.path !== MANIFEST_PATH) {
        fail('backupUnrecognized')
      }
      checkManifest(await readJson(entry))
      return
    }
  } catch (error) {
    throw error instanceof ArchiveError ? new BackupError('backupIncomplete') : error
  }
  fail('backupUnrecognized')
}

/**
 * 流式导入：manifest → user（不导入）→ 全部会话 JSON → index → 全部图片。
 * 也支持会话与图片交错排列、index 位于末尾的条目顺序。
 * 会话读完立即暂存，只保留图片路径映射；图片全部读完后逐会话回填 MIME，不改变图片身份。
 * 写入导入暂存存储；调用方负责先清空暂存，成功后替换正式数据，失败时清理暂存。
 */
export const importArchive = async (file: File, report?: ReportImportEvent): Promise<void> => {
  if (!(await isZipFile(file))) {
    fail('backupUnrecognized')
  }
  let percent = 0
  const emit = (next: number, log?: ImportEvent['log']) => {
    percent = Math.max(percent, Math.min(1, next))
    report?.({ percent, log })
  }
  const log = (key: TranslationKey, params?: TranslationParams) =>
    report?.({ percent, log: { key, params } })
  emit(0, { key: 'importLogStart' })
  // 中央目录已经由 checkArchiveFormat 解析并缓存，这里只做统计，不重复读文件。
  const paths = await listArchivePaths(file)
  const totalSessions = paths.filter((path) => parseSessionPath(path) !== null).length
  log('importLogArchive', { sessions: totalSessions })
  const imported = new Set<string>()
  const images = new Map<string, string>()
  /** 已保存的原件：文件 ID → MIME。同一图片出现在多个会话目录时只保存一次。 */
  const stored = new Map<string, string>()
  let manifest = false
  let index: SessionIndexEntry[] | undefined
  let currentSessionId: string | undefined
  /** 待写入暂存的会话：攒满一批再走一个事务。 */
  let batch: Session[] = []
  let batchBytes = 0
  const flushSessions = async () => {
    if (batch.length === 0) {
      return
    }
    const pending = batch
    batch = []
    batchBytes = 0
    await db.addStagingSessions(pending)
  }

  const saveImage = async (entry: ArchiveEntry, id: string) => {
    if (stored.has(id)) {
      await skipEntry(entry)
      return
    }
    const data = await readEntry(entry)
    const type = imageType(new Uint8Array(await data.slice(0, 16).arrayBuffer()))
    await db.saveStagingFiles([{ id, blob: new Blob([data], { type }) }])
    stored.set(id, type)
  }

  try {
    for await (const entry of readArchive(file)) {
      const { path } = entry
      const sessionId = parseSessionPath(path)
      if (!manifest) {
        if (path !== MANIFEST_PATH) {
          fail('backupUnrecognized')
        }
        checkManifest(await readJson(entry))
        manifest = true
      } else if (path === USER_PATH && !index && imported.size === 0) {
        // 账号信息（已脱敏）不导入；文件可能缺失。
        await skipEntry(entry)
      } else if (sessionId !== null && !index) {
        const local = toLocalSession(readSessionFile(await readJson(entry)))
        if (local.session.id !== sessionId || imported.has(sessionId)) {
          fail('backupIncomplete')
        }
        imported.add(sessionId)
        currentSessionId = sessionId
        for (const [imagePath, id] of local.images) {
          images.set(imagePath, id)
        }
        batch.push(local.session)
        batchBytes += entry.size
        if (batch.length >= STAGING_BATCH_COUNT || batchBytes >= STAGING_BATCH_BYTES) {
          await flushSessions()
        }
        if (imported.size % SESSION_LOG_EVERY === 0 || imported.size === totalSessions) {
          log('importLogSessions', { done: imported.size, total: totalSessions })
        }
        emit(SESSION_START + SESSION_PORTION * (imported.size / Math.max(totalSessions, 1)))
      } else if (path === INDEX_PATH && !index) {
        index = readSessionIndex(await readJson(entry))
        log('importLogIndex', { count: index.length })
        emit(0.86)
      } else if (
        index
          ? imported.has(/^chat_sessions\/([^/]+)_files\//.exec(path)?.[1] ?? '')
          : currentSessionId && path.startsWith(sessionFilesDir(currentSessionId))
      ) {
        // 没有被引用的条目不保存，引用了但缺失的图片只展示文件名。
        const id = images.get(path)
        await (id === undefined ? skipEntry(entry) : saveImage(entry, id))
      } else {
        fail('backupIncomplete')
      }
    }
    await flushSessions()
  } catch (error) {
    throw error instanceof ArchiveError ? new BackupError('backupIncomplete') : error
  }
  if (!manifest) {
    fail('backupUnrecognized')
  }
  // index 只列出成功写出的会话，与会话文件一一对应。
  const listed = new Set(index?.map((entry) => entry.id))
  if (
    !index ||
    listed.size !== index.length ||
    listed.size !== imported.size ||
    [...imported].some((id) => !listed.has(id))
  ) {
    fail('backupIncomplete')
  }
  log('importLogImages', { count: stored.size })
  emit(0.88)
  await db.updateStagingFileTypes(stored)
  emit(0.9, { key: 'importLogStaged' })
}
