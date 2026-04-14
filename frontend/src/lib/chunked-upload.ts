/**
 * Chunked Upload Utility
 * 
 * Handles large file uploads by splitting into chunks
 * - Splits file into manageable chunks (10MB default)
 * - Uploads chunks sequentially with retry logic
 * - Tracks progress per chunk
 * - Handles errors and retries
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB per chunk
const MAX_RETRIES = 3

export interface ChunkedUploadOptions {
  sessionId?: string
  deviceInfo?: string
  onProgress?: (progress: number, chunkIndex: number, totalChunks: number) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  onError?: (error: Error, chunkIndex: number) => void
}

export interface ChunkedUploadResult {
  success: boolean
  fileName: string
  originalName: string
  category: string
  storedPath: string
  fileSize: number
  checksum: string
  error?: string
}

/**
 * Generate unique upload ID for tracking chunks
 */
function generateUploadId(file: File): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${file.name}-${file.size}-${timestamp}-${random}`
}

/**
 * Split file into chunks
 */
function* splitFileIntoChunks(file: File, chunkSize: number = CHUNK_SIZE) {
  let offset = 0
  let chunkIndex = 0
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    yield { chunk, index: chunkIndex, offset }
    offset += chunkSize
    chunkIndex++
  }
}

/**
 * Upload single chunk with retry logic
 */
async function uploadChunk(
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number,
  uploadId: string,
  file: File,
  options: ChunkedUploadOptions,
  retryCount: number = 0
): Promise<any> {
  try {
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('uploadId', uploadId)
    formData.append('fileName', file.name)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', totalChunks.toString())
    formData.append('fileSize', file.size.toString())
    formData.append('mimeType', file.type)
    
    if (options.sessionId) {
      formData.append('sessionId', options.sessionId)
    }
    
    if (options.deviceInfo) {
      formData.append('deviceInfo', options.deviceInfo)
    }

    const response = await axios.post(`${API_BASE_URL}/api/upload/chunk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes per chunk
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          // Calculate overall progress
          const chunkProgress = (progressEvent.loaded / progressEvent.total) * 100
          const overallProgress = ((chunkIndex + (chunkProgress / 100)) / totalChunks) * 100
          options.onProgress(Math.round(overallProgress), chunkIndex, totalChunks)
        }
      },
    })

    return response.data
  } catch (error) {
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying chunk ${chunkIndex}, attempt ${retryCount + 1}/${MAX_RETRIES}`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
      return uploadChunk(chunk, chunkIndex, totalChunks, uploadId, file, options, retryCount + 1)
    }
    
    throw error
  }
}

/**
 * Upload file using chunked upload
 */
export async function uploadFileChunked(
  file: File,
  options: ChunkedUploadOptions = {}
): Promise<ChunkedUploadResult> {
  try {
    // Generate upload ID
    const uploadId = generateUploadId(file)
    
    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    
    console.log(`Starting chunked upload: ${file.name} (${file.size} bytes, ${totalChunks} chunks)`)
    
    // Upload chunks sequentially
    let lastResponse: any = null
    
    for (const { chunk, index } of splitFileIntoChunks(file, CHUNK_SIZE)) {
      try {
        const response = await uploadChunk(
          chunk,
          index,
          totalChunks,
          uploadId,
          file,
          options
        )
        
        lastResponse = response
        
        // Notify chunk complete
        if (options.onChunkComplete) {
          options.onChunkComplete(index, totalChunks)
        }
        
        console.log(`Chunk ${index + 1}/${totalChunks} uploaded successfully`)
        
        // If this was the last chunk and upload is complete
        if (response.chunkResult?.isComplete) {
          console.log('All chunks uploaded and assembled successfully')
          
          // Return final upload result
          if (response.uploadResult) {
            return {
              success: response.uploadResult.success,
              fileName: response.uploadResult.fileName,
              originalName: response.uploadResult.originalName,
              category: response.uploadResult.category,
              storedPath: response.uploadResult.storedPath,
              fileSize: response.uploadResult.fileSize,
              checksum: response.uploadResult.checksum,
            }
          }
        }
      } catch (error) {
        console.error(`Failed to upload chunk ${index}:`, error)
        if (options.onError) {
          options.onError(error as Error, index)
        }
        throw new Error(`Failed to upload chunk ${index + 1}/${totalChunks}: ${error}`)
      }
    }
    
    // This shouldn't happen, but handle it
    if (!lastResponse?.uploadResult) {
      throw new Error('Upload completed but no result received')
    }
    
    return {
      success: true,
      fileName: lastResponse.uploadResult.fileName,
      originalName: lastResponse.uploadResult.originalName,
      category: lastResponse.uploadResult.category,
      storedPath: lastResponse.uploadResult.storedPath,
      fileSize: lastResponse.uploadResult.fileSize,
      checksum: lastResponse.uploadResult.checksum,
    }
  } catch (error) {
    console.error('Chunked upload failed:', error)
    return {
      success: false,
      fileName: '',
      originalName: file.name,
      category: '',
      storedPath: '',
      fileSize: file.size,
      checksum: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Determine if file should use chunked upload
 * Files > 50MB should use chunked upload to avoid timeout
 */
export function shouldUseChunkedUpload(file: File): boolean {
  const CHUNKED_UPLOAD_THRESHOLD = 50 * 1024 * 1024 // 50MB
  return file.size > CHUNKED_UPLOAD_THRESHOLD
}
