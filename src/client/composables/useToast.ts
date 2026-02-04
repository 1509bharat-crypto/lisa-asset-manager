import { ref, readonly } from 'vue'
import type { Toast } from '../types'

const toasts = ref<Toast[]>([])

let toastId = 0

export function useToast() {
  const show = (
    message: string,
    type: Toast['type'] = 'info',
    duration = 5000
  ): string => {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, type, message, duration }

    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  const success = (message: string, duration?: number) =>
    show(message, 'success', duration)

  const error = (message: string, duration?: number) =>
    show(message, 'error', duration)

  const warning = (message: string, duration?: number) =>
    show(message, 'warning', duration)

  const info = (message: string, duration?: number) =>
    show(message, 'info', duration)

  const remove = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clear = () => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear
  }
}
