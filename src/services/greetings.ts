import type { Locale } from './settings.js'

/**
 * 官网问候语配置（从官网客户端设置数据搬来的静态副本）。
 *
 * 结构完全照搬官网：
 *   - messages：全部候选文案，按 id 索引
 *   - timeConfig：时间段（单位：分钟，自 0 点起）与对应可用文案 id
 *   - fallback：不在任何时间段时使用的 id
 *
 * 官网逻辑：取当前时间所在区间的 use 列表，随机挑一条；
 * 不在任何区间时用 fallback。这里只是把数据内置，不请求任何在线接口。
 */
type GreetingConfig = {
  messages: string[]
  timeConfig: { start: number; end: number; use: number[] }[]
  fallback: number[]
}

const ZH: GreetingConfig = {
  messages: [
    '你好，我能帮什么忙吗？',
    '你好，有什么我能帮你的吗？',
    '你好，让我们开始聊天吧',
    '嗨！今天想聊些什么？',
    '欢迎回来，随时开始吧',
    '欢迎回来，想从哪里开始？',
    '早上好，今天有什么计划？',
    '早上好，今天想做点什么？',
    '早上好，开始聊天吧',
    '早上好，今天想聊些什么？',
    '下午好，我能帮什么忙吗？',
    '晚上好，有什么我能帮你的吗？',
  ],
  timeConfig: [
    { start: 360, end: 660, use: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { start: 780, end: 1050, use: [0, 1, 2, 3, 4, 5, 10] },
    { start: 1050, end: 1320, use: [0, 1, 2, 3, 4, 5, 11] },
  ],
  fallback: [0, 1, 2, 3, 4, 5],
}

const EN: GreetingConfig = {
  messages: [
    'Hi. How can I help?',
    'Hi. What can I do for you?',
    "Hello, let's start chatting",
    "Hi! What's on your mind today?",
    "Whenever you're ready",
    'Where would you like to begin?',
    'What’s the plan for today?',
    'What would you like to do today?',
    'Good morning. Let’s chat.',
    'What would you like to talk about?',
    'Good afternoon. How can I help?',
    'Good evening. How can I help?',
  ],
  timeConfig: [
    { start: 360, end: 660, use: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { start: 780, end: 1050, use: [0, 1, 2, 3, 4, 5, 10] },
    { start: 1050, end: 1320, use: [0, 1, 2, 3, 4, 5, 11] },
  ],
  fallback: [0, 1, 2, 3, 4, 5],
}

/** 按官网规则挑一条问候语 */
export const pickGreeting = (locale: Locale, now = new Date()): string => {
  const config = locale === 'zh-CN' ? ZH : EN
  const minutes = now.getHours() * 60 + now.getMinutes()
  const slot = config.timeConfig.find((item) => minutes >= item.start && minutes < item.end)
  const pool = slot ? slot.use : config.fallback
  const id = pool[Math.floor(Math.random() * pool.length)]
  return config.messages[id] ?? config.messages[0]
}
