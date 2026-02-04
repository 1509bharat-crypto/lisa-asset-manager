import { ref, readonly } from 'vue'
import { api } from '../services/api'
import { useToast } from './useToast'
import type { Project } from '../types'

const projects = ref<Project[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useProjects() {
  const toast = useToast()

  const fetchProjects = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await api.getProjects()
      if (response.error) {
        throw new Error(response.error)
      }
      projects.value = response.data || []
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
    data: Partial<Pick<Project, 'name' | 'description' | 'color'>>
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
        toast.success('Project updated')
      }
      return response.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update project'
      error.value = message
      toast.error(message)
      return null
    }
  }

  const deleteProject = async (id: string) => {
    error.value = null

    try {
      const response = await api.deleteProject(id)
      if (response.error) {
        throw new Error(response.error)
      }
      projects.value = projects.value.filter((p) => p.id !== id)
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
    projects: readonly(projects),
    loading: readonly(loading),
    error: readonly(error),
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectById
  }
}
