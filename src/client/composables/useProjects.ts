import { ref, readonly, computed } from 'vue'
import { api } from '../services/api'
import { useToast } from './useToast'
import type { Project } from '../types'

const projects = ref<Project[]>([])
const assetCounts = ref<Record<string, number>>({})
const totalStorage = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

export function useProjects() {
  const toast = useToast()

  // Computed projects with asset counts merged in
  const projectsWithCounts = computed(() => {
    return projects.value.map(p => ({
      ...p,
      asset_count: assetCounts.value[p.id] || 0
    }))
  })

  const totalAssets = computed(() => {
    return Object.values(assetCounts.value).reduce((sum, count) => sum + count, 0)
  })

  const fetchProjects = async (force = false) => {
    // Skip fetch if we already have data and not forcing refresh
    if (!force && projects.value.length > 0) {
      return
    }

    loading.value = true
    error.value = null

    try {
      // Fetch all data in parallel
      const [projectsRes, countsRes, storageRes] = await Promise.all([
        api.getProjects(),
        api.getAssetCounts(),
        api.getStorageInfo()
      ])

      if (projectsRes.error) throw new Error(projectsRes.error)
      if (countsRes.error) throw new Error(countsRes.error)
      if (storageRes.error) throw new Error(storageRes.error)

      projects.value = projectsRes.data || []
      assetCounts.value = countsRes.data || {}
      totalStorage.value = storageRes.data?.total_size || 0
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch projects'
      error.value = message
      toast.error(message)
    } finally {
      loading.value = false
    }
  }

  const createProject = async (data: {
    name: string
    description?: string
    color: string
  }) => {
    loading.value = true
    error.value = null

    try {
      const response = await api.createProject(data)
      if (response.error) {
        throw new Error(response.error)
      }
      if (response.data) {
        projects.value.unshift(response.data)
        assetCounts.value[response.data.id] = 0
        toast.success(`Project "${data.name}" created`)
      }
      return response.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create project'
      error.value = message
      toast.error(message)
      return null
    } finally {
      loading.value = false
    }
  }

  const updateProject = async (
    id: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'color' | 'cover_asset_id' | 'cover_image'>>,
    silent = false
  ) => {
    error.value = null

    try {
      const response = await api.updateProject(id, data)
      if (response.error) {
        throw new Error(response.error)
      }
      if (response.data) {
        const index = projects.value.findIndex((p) => p.id === id)
        if (index > -1) {
          projects.value[index] = response.data
        }
        if (!silent) {
          toast.success('Project updated')
        }
      }
      return response.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update project'
      error.value = message
      toast.error(message)
      return null
    }
  }

  const setProjectCover = async (projectId: string, assetId: string, coverImage: string) => {
    const result = await updateProject(projectId, {
      cover_asset_id: assetId,
      cover_image: coverImage
    }, true)
    if (result) {
      toast.success('Cover image updated')
    }
    return result
  }

  const deleteProject = async (id: string) => {
    error.value = null

    try {
      const response = await api.deleteProject(id)
      if (response.error) {
        throw new Error(response.error)
      }
      projects.value = projects.value.filter((p) => p.id !== id)
      delete assetCounts.value[id]
      toast.success('Project deleted')
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete project'
      error.value = message
      toast.error(message)
      return false
    }
  }

  const getProjectById = (id: string) => {
    return projects.value.find((p) => p.id === id)
  }

  return {
    projects: projectsWithCounts,
    totalAssets,
    totalStorage: readonly(totalStorage),
    loading: readonly(loading),
    error: readonly(error),
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    setProjectCover,
    getProjectById
  }
}
