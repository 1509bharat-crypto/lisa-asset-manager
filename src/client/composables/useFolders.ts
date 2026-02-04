import { ref, readonly } from 'vue'
import { api } from '../services/api'
import { useToast } from './useToast'
import type { Folder } from '../types'

const folders = ref<Folder[]>([])
const selectedFolders = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useFolders() {
  const toast = useToast()

  const fetchFolders = async (projectId: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.getFolders(projectId)
      if (response.error) {
        throw new Error(response.error)
      }
      folders.value = response.data || []
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch folders'
      error.value = message
      toast.error(message)
    } finally {
      loading.value = false
    }
  }

  const createFolder = async (projectId: string, name: string) => {
    error.value = null

    try {
      const response = await api.createFolder(projectId, name)
      if (response.error) {
        throw new Error(response.error)
      }
      if (response.data) {
        folders.value.push(response.data)
        toast.success(`Folder "${name}" created`)
      }
      return response.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create folder'
      error.value = message
      toast.error(message)
      return null
    }
  }

  const deleteFolder = async (projectId: string, name: string) => {
    error.value = null

    try {
      const response = await api.deleteFolder(projectId, name)
      if (response.error) {
        throw new Error(response.error)
      }
      folders.value = folders.value.filter((f) => f.name !== name)
      selectedFolders.value = selectedFolders.value.filter((f) => f !== name)
      toast.success(`Folder "${name}" deleted`)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete folder'
      error.value = message
      toast.error(message)
      return false
    }
  }

  const selectFolder = (name: string) => {
    if (!selectedFolders.value.includes(name)) {
      selectedFolders.value.push(name)
    }
  }

  const deselectFolder = (name: string) => {
    selectedFolders.value = selectedFolders.value.filter((f) => f !== name)
  }

  const toggleFolder = (name: string) => {
    if (selectedFolders.value.includes(name)) {
      deselectFolder(name)
    } else {
      selectFolder(name)
    }
  }

  const clearSelection = () => {
    selectedFolders.value = []
  }

  const clearFolders = () => {
    folders.value = []
    selectedFolders.value = []
  }

  return {
    folders: readonly(folders),
    selectedFolders: readonly(selectedFolders),
    loading: readonly(loading),
    error: readonly(error),
    fetchFolders,
    createFolder,
    deleteFolder,
    selectFolder,
    deselectFolder,
    toggleFolder,
    clearSelection,
    clearFolders
  }
}
