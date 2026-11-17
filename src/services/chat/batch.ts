import { create } from 'zustand'
import { showToast } from '../../components/base/toastState.js'

/**
 * 会话多选（批量管理）状态。
 *
 * 与官网一致：侧边栏进入多选模式后，会话项显示勾选框，
 * 顶部出现批量操作条，可批量删除 / 批量置顶。
 */
type BatchState = {
  /** 是否处于多选模式 */
  active: boolean
  /** 已勾选的会话 id */
  selected: string[]
}

export const useBatchStore = create<BatchState>(() => ({
  active: false,
  selected: [],
}))

/** 进入多选模式，可同时勾选指定会话 */
export const enterBatchMode = (sessionIds: string[] = []) => {
  useBatchStore.setState({ active: true, selected: sessionIds })
}

/** 退出多选模式并清空勾选 */
export const exitBatchMode = () => {
  useBatchStore.setState({ active: false, selected: [] })
}

/** 官网多选上限 */
const MAX_SELECT = 99

/** 勾选 / 取消勾选单个会话（超过上限时提示，与官网一致） */
export const toggleBatchSelection = (sessionId: string) => {
  const { selected } = useBatchStore.getState()
  if (selected.includes(sessionId)) {
    useBatchStore.setState({ selected: selected.filter((id) => id !== sessionId) })
    return
  }
  if (selected.length >= MAX_SELECT) {
    showToast({ key: 'sessionBatchMaxSelectToast' })
    return
  }
  useBatchStore.setState({ selected: [...selected, sessionId] })
}

/** 全选 / 取消全选（截断到上限并提示） */
export const setBatchSelection = (sessionIds: string[]) => {
  if (sessionIds.length > MAX_SELECT) {
    showToast({ key: 'sessionBatchMaxSelectToast' })
  }
  useBatchStore.setState({ selected: sessionIds.slice(0, MAX_SELECT) })
}
