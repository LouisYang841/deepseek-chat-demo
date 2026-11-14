import { getDB } from './db.js'
import type { Message } from './types.js'

/** 一条搜索命中：定位到具体会话与消息 */
export type SearchHit = {
  sessionId: string
  /** 会话标题 */
  sessionTitle: string
  /** 命中的消息 id */
  messageId: string
  /** 消息角色 */
  role: Message['role']
  /** 命中片段：围绕关键词的上下文 */
  snippet: string
  /** 消息时间戳 */
  updatedAt: number
  /** 当前分支序号（从 1 开始） */
  branchIndex: number
  /** 同一父节点下的分支总数 */
  totalBranches: number
}

/** 从消息的内容块里取纯文本 */
const messageText = (message: Message): string => {
  if (message.role === 'user') {
    return message.content
  }
  return message.blocks
    .map((block) => (block.type === 'text' ? block.text : block.type === 'thinking' ? block.thinking : ''))
    .join('\n')
}

/** 截取命中位置前后的上下文 */
const buildSnippet = (text: string, keyword: string): string => {
  const index = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (index < 0) {
    return text.slice(0, 80)
  }
  const start = Math.max(0, index - 24)
  const end = Math.min(text.length, index + keyword.length + 56)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

/**
 * 本地全文搜索：扫描本机保存的全部会话消息。
 *
 * 与官网一致的是交互（左侧放大镜 → 搜索面板 → 命中片段 → 点击跳转），
 * 但实现完全在本机完成，不经过任何在线服务。
 */
export const searchSessions = async (keyword: string): Promise<SearchHit[]> => {
  const query = keyword.trim().toLowerCase()
  if (!query) {
    return []
  }
  const db = await getDB()
  const hits: SearchHit[] = []
  for (const session of await db.getAll('sessions')) {
    // 同一父节点下的兄弟消息即分支；旧数据没有 parentId 时按线性列表处理
    const groups = new Map<string, string[]>()
    for (const [index, message] of session.messages.entries()) {
      const parentId =
        session.rootMessageId === undefined
          ? (session.messages[index - 1]?.id ?? '')
          : (message.parentId ?? '')
      const siblings = groups.get(parentId)
      if (siblings) {
        siblings.push(message.id)
      } else {
        groups.set(parentId, [message.id])
      }
    }
    for (const message of session.messages) {
      const text = messageText(message)
      if (!text || !text.toLowerCase().includes(query)) {
        continue
      }
      const parentId =
        session.rootMessageId === undefined
          ? (session.messages[session.messages.indexOf(message) - 1]?.id ?? '')
          : (message.parentId ?? '')
      const siblings = groups.get(parentId) ?? [message.id]
      hits.push({
        sessionId: session.id,
        sessionTitle: session.title,
        messageId: message.id,
        role: message.role,
        snippet: buildSnippet(text, query),
        updatedAt: session.updatedAt,
        branchIndex: siblings.indexOf(message.id) + 1,
        totalBranches: siblings.length,
      })
    }
  }
  // 最近的会话优先
  return hits.sort((a, b) => b.updatedAt - a.updatedAt)
}
