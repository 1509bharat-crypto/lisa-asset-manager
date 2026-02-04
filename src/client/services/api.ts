import type { Project, Asset, Folder, ApiResponse } from '../types'

const API_BASE = '/api'

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || `Request failed with status ${response.status}` }
    }

    return { data }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

export const api = {
  // Projects
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return request<Project[]>('/projects')
  },

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return request<Project>(`/projects/${id}`)
  },

  async createProject(data: {
    name: string
    description?: string
    color: string
  }): Promise<ApiResponse<Project>> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async updateProject(
    id: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'color' | 'cover_asset_id' | 'cover_image'>>
  ): Promise<ApiResponse<Project>> {
    return request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/projects/${id}`, {
      method: 'DELETE'
    })
  },

  // Asset counts and storage
  async getAssetCounts(): Promise<ApiResponse<Record<string, number>>> {
    return request<Record<string, number>>('/assets/counts')
  },

  async getStorageInfo(): Promise<ApiResponse<{ total_size: number }>> {
    return request<{ total_size: number }>('/assets/storage')
  },

  // Assets
  async getAssets(
    projectId: string,
    _folder?: string
  ): Promise<ApiResponse<Asset[]>> {
    const params = new URLSearchParams()
    params.set('project_id', projectId)
    return request<Asset[]>(`/assets?${params.toString()}`)
  },

  async uploadAsset(
    projectId: string,
    file: File,
    folderId: string | null = null,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Asset>> {
    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = async () => {
        try {
          // Keep the full data URL (data:image/png;base64,...)
          const dataUrl = reader.result as string

          const body = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: dataUrl,
            project_id: projectId,
            folder_id: folderId
          }

          const response = await fetch(`${API_BASE}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })

          const data = await response.json()

          if (response.ok) {
            if (onProgress) onProgress(100)
            resolve({ data })
          } else {
            resolve({ error: data.error || 'Upload failed' })
          }
        } catch {
          resolve({ error: 'Upload failed' })
        }
      }

      reader.onerror = () => {
        resolve({ error: 'Failed to read file' })
      }

      reader.readAsDataURL(file)
    })
  },

  async deleteAsset(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/assets/${id}`, {
      method: 'DELETE'
    })
  },

  async deleteAssets(ids: string[]): Promise<ApiResponse<void>> {
    return request<void>('/assets/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    })
  },

  async updateAssetFolder(
    id: string,
    folderId: string | null
  ): Promise<ApiResponse<Asset>> {
    return request<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId })
    })
  },

  async renameAsset(
    id: string,
    name: string
  ): Promise<ApiResponse<Asset>> {
    return request<Asset>(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    })
  },

  async searchAssets(
    projectId: string,
    query: string
  ): Promise<ApiResponse<Asset[]>> {
    const params = new URLSearchParams({ q: query })
    return request<Asset[]>(
      `/projects/${projectId}/assets/search?${params.toString()}`
    )
  },

  // Folders - fetches all folders, filters by project_id on client
  async getFolders(projectId: string): Promise<ApiResponse<Folder[]>> {
    const response = await request<Folder[]>('/folders')
    if (response.data) {
      // Filter folders by project_id on client side
      response.data = response.data.filter(f => f.project_id === projectId)
    }
    return response
  },

  async createFolder(
    projectId: string,
    name: string
  ): Promise<ApiResponse<Folder>> {
    return request<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, project_id: projectId })
    })
  },

  async deleteFolder(
    _projectId: string,
    folderId: string
  ): Promise<ApiResponse<void>> {
    return request<void>(`/folders/${folderId}`, {
      method: 'DELETE'
    })
  },

  async renameFolder(
    folderId: string,
    name: string
  ): Promise<ApiResponse<Folder>> {
    return request<Folder>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    })
  }
}
