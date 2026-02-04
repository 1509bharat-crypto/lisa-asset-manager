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
    data: Partial<Pick<Project, 'name' | 'description' | 'color'>>
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

  // Assets
  async getAssets(
    projectId: string,
    folder?: string
  ): Promise<ApiResponse<Asset[]>> {
    const params = new URLSearchParams()
    if (folder) params.set('folder', folder)
    const query = params.toString()
    return request<Asset[]>(
      `/projects/${projectId}/assets${query ? `?${query}` : ''}`
    )
  },

  async uploadAsset(
    projectId: string,
    file: File,
    folders: string[] = [],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Asset>> {
    return new Promise((resolve) => {
      const formData = new FormData()
      formData.append('file', file)
      if (folders.length > 0) {
        formData.append('folders', JSON.stringify(folders))
      }

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ data })
          } else {
            resolve({ error: data.error || 'Upload failed' })
          }
        } catch {
          resolve({ error: 'Invalid response' })
        }
      })

      xhr.addEventListener('error', () => {
        resolve({ error: 'Network error' })
      })

      xhr.open('POST', `${API_BASE}/projects/${projectId}/assets`)
      xhr.send(formData)
    })
  },

  async deleteAsset(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/assets/${id}`, {
      method: 'DELETE'
    })
  },

  async deleteAssets(ids: string[]): Promise<ApiResponse<void>> {
    return request<void>('/assets', {
      method: 'DELETE',
      body: JSON.stringify({ ids })
    })
  },

  async updateAssetFolders(
    id: string,
    folders: string[]
  ): Promise<ApiResponse<Asset>> {
    return request<Asset>(`/assets/${id}/folders`, {
      method: 'PATCH',
      body: JSON.stringify({ folders })
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

  // Folders
  async getFolders(projectId: string): Promise<ApiResponse<Folder[]>> {
    return request<Folder[]>(`/projects/${projectId}/folders`)
  },

  async createFolder(
    projectId: string,
    name: string
  ): Promise<ApiResponse<Folder>> {
    return request<Folder>(`/projects/${projectId}/folders`, {
      method: 'POST',
      body: JSON.stringify({ name })
    })
  },

  async deleteFolder(
    projectId: string,
    name: string
  ): Promise<ApiResponse<void>> {
    return request<void>(
      `/projects/${projectId}/folders/${encodeURIComponent(name)}`,
      {
        method: 'DELETE'
      }
    )
  }
}
