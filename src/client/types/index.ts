// Client-side types for Asset Library

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  cover_asset_id?: string | null
  cover_image?: string | null // Cached data URL for display
  asset_count: number
  total_size: number
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  project_id: string
  name: string
  type: string
  size: number
  data: string
  folder_id: string | null
  upload_date: string
  created_at: string
}

export interface Folder {
  id: string
  name: string
  project_id: string
  parent_id: string | null
  created_at: string
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
