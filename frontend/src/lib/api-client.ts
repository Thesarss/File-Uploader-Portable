import axios, { type AxiosError, type AxiosProgressEvent } from 'axios'
import { uploadFileChunked, shouldUseChunkedUpload, type ChunkedUploadOptions } from './chunked-upload'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const message = (error.response.data as any)?.error || error.message
      return Promise.reject(new Error(message))
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('Network error. Please check your connection.'))
    } else {
      // Something else happened
      return Promise.reject(error)
    }
  }
)

// Types
export interface FileCategory {
  Photo: string[]
  Video: string[]
  Document: string[]
  Audio: string[]
  Archive: string[]
  Other: string[]
}

export interface AppConfig {
  maxFileSize: number
  supportedCategories: string[]
  acceptedExtensions: FileCategory
}

export interface UploadResult {
  success: boolean
  fileName: string
  originalName: string
  category: string
  storedPath: string
  fileSize: number
  checksum: string
  error?: string
}

export interface UploadResponse {
  success: boolean
  totalFiles: number
  successCount: number
  failureCount: number
  results: UploadResult[]
}

export interface UploadHistoryItem {
  id: number
  fileName: string
  originalName: string
  fileSize: number
  category: string
  storedPath: string
  mimeType: string
  sessionId: string
  deviceInfo: string
  uploadedAt: string
  checksum: string
}

export interface HistoryResponse {
  success: boolean
  count: number
  uploads: UploadHistoryItem[]
}

export interface UploadOptions {
  sessionId?: string
  deviceInfo?: string
  onProgress?: (progress: number) => void
}

// API Functions
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResponse> {
  // Separate files into chunked and normal uploads
  const chunkedFiles: File[] = []
  const normalFiles: File[] = []
  
  files.forEach(file => {
    if (shouldUseChunkedUpload(file)) {
      chunkedFiles.push(file)
    } else {
      normalFiles.push(file)
    }
  })
  
  const allResults: UploadResult[] = []
  
  // Upload chunked files one by one
  for (const file of chunkedFiles) {
    console.log(`Using chunked upload for large file: ${file.name} (${file.size} bytes)`)
    
    const chunkedOptions: ChunkedUploadOptions = {
      sessionId: options.sessionId,
      deviceInfo: options.deviceInfo,
      onProgress: options.onProgress,
    }
    
    const result = await uploadFileChunked(file, chunkedOptions)
    allResults.push(result)
  }
  
  // Upload normal files together
  if (normalFiles.length > 0) {
    const formData = new FormData()
    
    normalFiles.forEach((file) => {
      formData.append('files', file)
    })
    
    if (options.sessionId) {
      formData.append('sessionId', options.sessionId)
    }
    
    if (options.deviceInfo) {
      formData.append('deviceInfo', options.deviceInfo)
    }

    const response = await apiClient.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          options.onProgress(progress)
        }
      },
    })
    
    allResults.push(...response.data.results)
  }
  
  // Combine results
  const successCount = allResults.filter(r => r.success).length
  const failureCount = allResults.length - successCount
  
  return {
    success: successCount > 0,
    totalFiles: allResults.length,
    successCount,
    failureCount,
    results: allResults,
  }
}

export async function getHistory(
  sessionId?: string,
  limit?: number
): Promise<HistoryResponse> {
  const params: Record<string, string | number> = {}
  
  if (sessionId) {
    params.sessionId = sessionId
  }
  
  if (limit) {
    params.limit = limit
  }

  const response = await apiClient.get<HistoryResponse>('/api/history', { params })
  return response.data
}

export async function getConfig(): Promise<AppConfig> {
  const response = await apiClient.get<{ success: boolean; config: AppConfig }>('/api/config')
  return response.data.config
}
