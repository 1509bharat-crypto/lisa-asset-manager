// Client-side types for Asset Library

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  asset_count: number
  total_size: number
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  project_id: string
  filename: string
  url: string
  file_size: number
  mime_type: string
  width: number
  height: number
  folders: string[]
  created_at: string
  updated_at: string
}

export interface Folder {
  name: string
  count: number
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
