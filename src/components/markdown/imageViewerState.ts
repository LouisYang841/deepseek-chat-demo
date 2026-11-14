import { create } from 'zustand'

/** 图片大图预览：同一次点击打开，Esc / 点击背景 / 关闭按钮收起 */
type ImageViewerState = {
  src: string | null
  alt: string
}

export const useImageViewer = create<ImageViewerState>(() => ({ src: null, alt: '' }))

export const openImageViewer = (src: string, alt = '') => useImageViewer.setState({ src, alt })

export const closeImageViewer = () => useImageViewer.setState({ src: null, alt: '' })
