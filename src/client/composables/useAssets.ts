import { ref, readonly, computed } from 'vue'
import { api } from '../services/api'
import { useToast } from './useToast'
import type { Asset, UploadProgress } from '../types'

const assets = ref<Asset[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploadQueue = ref<UploadProgress[]>([])

export function useAssets() {
  const toast = useToast()

  const isUploading = computed(() =>
    uploadQueue.value.some((u) => u.status === 'uploading')
  )

  const fetchAssets = async (projectId: string, folder?: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.getAssets(projectId, folder)
      if (response.error) {
        throw new Error(response.error)
      }
      assets.value = response.data || []
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch assets'
      error.value = message
      toast.error(message)
    } finally {
      loading.value = false
    }
  }

  const uploadAssets = async (
    projectId: string,
    files: File[],
    folders: string[] = []
  ) => {
    const newUploads: UploadProgress[] = files.map((file) => ({
      file,
      progress: 0,
      status: 'pending'
    }))

    uploadQueue.value.push(...newUploads)

    const results: Asset[] = []

    for (const upload of newUploads) {
      upload.status = 'uploading'

      try {
        const response = await api.uploadAsset(
          projectId,
          upload.file,
          folders,
          (progress) => {
            upload.progress = progress
          }
        )

        if (response.error) {
          throw new Error(response.error)
        }

        if (response.data) {
          upload.status = 'complete'
          upload.progress = 100
          results.push(response.data)
          assets.value.unshift(response.data)
        }
      } catch (e) {
        upload.status = 'error'
        upload.error = e instanceof Error ? e.message : 'Upload failed'
        toast.error(`Failed to upload ${upload.file.name}`)
      }
    }

    // Clear completed uploads after delay
    setTimeout(() => {
      uploadQueue.value = uploadQueue.value.filter(
        (u) => u.status !== 'complete'
      )
    }, 3000)

    if (results.length > 0) {
      toast.success(`${results.length} file(s) uploaded`)
    }

    return results
  }

  const deleteAsset = async (id: string) => {
    error.value = null

    try {
      const response = await api.deleteAsset(id)
      if (response.error) {
        throw new Error(response.error)
      }
      assets.value = assets.value.filter((a) => a.id !== id)
      toast.success('Asset deleted')
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete asset'
      error.value = message
      toast.error(message)
      return false
    }
  }

  const deleteAssets = async (ids: string[]) => {
    error.value = null

    try {
      const response = await api.deleteAssets(ids)
      if (response.error) {
        throw new Error(response.error)
      }
      assets.value = assets.value.filter((a) => !ids.includes(a.id))
      toast.success(`${ids.length} asset(s) deleted`)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete assets'
      error.value = message
      toast.error(message)
      return false
    }
  }

  const updateAssetFolders = async (id: string, folders: string[]) => {
    error.value = null

    try {
      const response = await api.updateAssetFolders(id, folders)
      if (response.error) {
        throw new Error(response.error)
      }
      if (response.data) {
        const index = assets.value.findIndex((a) => a.id === id)
        if (index > -1) {
          assets.value[index] = response.data
        }
      }
      return response.data
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to update asset folders'
      error.value = message
      toast.error(message)
      return null
    }
  }

  const searchAssets = async (projectId: string, query: string) => {
    if (!query.trim()) {
      return fetchAssets(projectId)
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.searchAssets(projectId, query)
      if (response.error) {
        throw new Error(response.error)
      }
      assets.value = response.data || []
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Search failed'
      error.value = message
      toast.error(message)
    } finally {
      loading.value = false
    }
  }

  const clearAssets = () => {
    assets.value = []
  }

  return {
    assets: readonly(assets),
    loading: readonly(loading),
    error: readonly(error),
    uploadQueue: readonly(uploadQueue),
    isUploading,
    fetchAssets,
    uploadAssets,
    deleteAsset,
    deleteAssets,
    updateAssetFolders,
    searchAssets,
    clearAssets
  }
}
