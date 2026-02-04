import { ref, readonly, computed } from 'vue'
import { api } from '../services/api'
import { useToast } from './useToast'
import type { Folder, Asset } from '../types'

interface FolderWithCount extends Folder {
  assetCount?: number
}

const folders = ref<FolderWithCount[]>([])
const selectedFolderId = ref<string | null>(null)
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

  const deleteFolder = async (projectId: string, folderId: string) => {
    error.value = null

    try {
      const response = await api.deleteFolder(projectId, folderId)
      if (response.error) {
        throw new Error(response.error)
      }
      const folder = folders.value.find((f) => f.id === folderId)
      folders.value = folders.value.filter((f) => f.id !== folderId)
      if (selectedFolderId.value === folderId) {
        selectedFolderId.value = null
      }
      toast.success(`Folder "${folder?.name || 'Unknown'}" deleted`)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete folder'
      error.value = message
      toast.error(message)
      return false
    }
  }

  const renameFolder = async (folderId: string, name: string) => {
    error.value = null

    try {
      const response = await api.renameFolder(folderId, name)
      if (response.error) {
        throw new Error(response.error)
      }
      if (response.data) {
        const index = folders.value.findIndex((f) => f.id === folderId)
        if (index > -1) {
          folders.value[index] = { ...folders.value[index], ...response.data }
        }
        toast.success('Folder renamed')
      }
      return response.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to rename folder'
      error.value = message
      toast.error(message)
      return null
    }
  }

  const selectFolder = (id: string | null) => {
    selectedFolderId.value = id
  }

  const clearSelection = () => {
    selectedFolderId.value = null
  }

  const clearFolders = () => {
    folders.value = []
    selectedFolderId.value = null
  }

  // Calculate asset counts per folder from assets list
  const updateFolderCounts = (assets: Asset[]) => {
    const counts: Record<string, number> = {}

    for (const asset of assets) {
      if (asset.folder_id) {
        counts[asset.folder_id] = (counts[asset.folder_id] || 0) + 1
      }
    }

    folders.value = folders.value.map((folder) => ({
      ...folder,
      assetCount: counts[folder.id] || 0
    }))
  }

  // Get folder name by ID
  const getFolderName = (id: string): string | undefined => {
    return folders.value.find((f) => f.id === id)?.name
  }

  // Selected folder name for display
  const selectedFolderName = computed(() => {
    if (!selectedFolderId.value) return null
    return getFolderName(selectedFolderId.value)
  })

  return {
    folders: readonly(folders),
    selectedFolderId: readonly(selectedFolderId),
    selectedFolderName,
    loading: readonly(loading),
    error: readonly(error),
    fetchFolders,
    createFolder,
    deleteFolder,
    renameFolder,
    selectFolder,
    clearSelection,
    clearFolders,
    updateFolderCounts,
    getFolderName
  }
}
