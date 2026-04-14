import { type FileCategory } from './api-client'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface FileValidationOptions {
  maxFileSize: number
  acceptedExtensions: FileCategory
}

export function validateFile(
  file: File,
  options: FileValidationOptions
): ValidationResult {
  // Validate file size
  if (file.size > options.maxFileSize) {
    const maxSizeMB = Math.round(options.maxFileSize / (1024 * 1024))
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit. Please select a smaller file.`,
    }
  }

  // Validate file type
  const fileName = file.name.toLowerCase()
  const extension = fileName.substring(fileName.lastIndexOf('.'))

  const allExtensions = Object.values(options.acceptedExtensions).flat()
  const isSupported = allExtensions.some((ext) => extension === ext.toLowerCase())

  if (!isSupported) {
    return {
      valid: false,
      error: `This file type is not supported. Supported formats: ${allExtensions.join(', ')}`,
    }
  }

  return { valid: true }
}

export function validateFiles(
  files: File[],
  options: FileValidationOptions
): { validFiles: File[]; errors: Array<{ file: File; error: string }> } {
  const validFiles: File[] = []
  const errors: Array<{ file: File; error: string }> = []

  files.forEach((file) => {
    const result = validateFile(file, options)
    if (result.valid) {
      validFiles.push(file)
    } else {
      errors.push({ file, error: result.error || 'Unknown error' })
    }
  })

  return { validFiles, errors }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot === -1 ? '' : fileName.substring(lastDot).toLowerCase()
}
