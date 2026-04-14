import { useState, useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/hooks/use-toast'
import { getConfig, uploadFiles, getHistory, type AppConfig, type UploadHistoryItem } from '@/lib/api-client'
import { validateFiles } from '@/lib/file-validator'
import { Upload, FileText, Clock, CheckCircle2, XCircle, Loader2, Trash2, FolderOpen } from 'lucide-react'
import './App.css'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

interface UploadState {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  category?: string
  error?: string
  chunkInfo?: { current: number; total: number }
}

function AppContent() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadStates, setUploadStates] = useState<UploadState[]>([])
  const [history, setHistory] = useState<UploadHistoryItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const appConfig = await getConfig()
        setConfig(appConfig)
      } catch (error) {
        toast({
          title: 'Configuration Error',
          description: 'Failed to load configuration',
          variant: 'destructive',
        })
      }
    }
    loadConfig()
  }, [])

  // Load history
  const loadHistory = async () => {
    try {
      const response = await getHistory(undefined, 50)
      setHistory(response.uploads)
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFilesSelected(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFilesSelected(files)
    }
  }

  const handleFilesSelected = (files: File[]) => {
    if (!config) return

    const { validFiles, errors } = validateFiles(files, {
      maxFileSize: config.maxFileSize,
      acceptedExtensions: config.acceptedExtensions,
    })

    errors.forEach(({ file, error }) => {
      toast({
        title: `Invalid: ${file.name}`,
        description: error,
        variant: 'destructive',
      })
    })

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
      toast({
        title: 'Files Added',
        description: `${validFiles.length} file(s) ready to upload`,
      })
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadStates(selectedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading',
    })))

    try {
      const response = await uploadFiles(selectedFiles, {
        sessionId,
        deviceInfo: navigator.userAgent,
        onProgress: (progress) => {
          setUploadStates(prev => prev.map(state => ({
            ...state,
            progress,
          })))
        },
      })

      setUploadStates(prev => prev.map((state, index) => {
        const result = response.results[index]
        return {
          ...state,
          status: result.success ? 'success' : 'error',
          progress: 100,
          category: result.category,
          error: result.error,
        }
      }))

      if (response.successCount > 0) {
        toast({
          title: 'Upload Complete!',
          description: `${response.successCount} file(s) uploaded successfully`,
        })
        setSelectedFiles([])
        loadHistory() // Reload history
      }

      if (response.failureCount > 0) {
        toast({
          title: 'Some uploads failed',
          description: `${response.failureCount} file(s) failed`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadStates([]), 5000)
    }
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">File Uploader</h1>
              <p className="text-sm text-muted-foreground">Upload files from anywhere</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload */}
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-105'
                  : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Drop files here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max {formatFileSize(config.maxFileSize)} per file
              </p>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-sm text-muted-foreground hover:text-foreground"
                    disabled={isUploading}
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                        disabled={isUploading}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full mt-4 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Upload {selectedFiles.length} File(s)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Upload Progress */}
            {uploadStates.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Upload Progress</h3>
                <div className="space-y-3">
                  {uploadStates.map((state, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1 mr-2">{state.file.name}</span>
                        <span className="text-muted-foreground">{state.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            state.status === 'success'
                              ? 'bg-green-500'
                              : state.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${state.progress}%` }}
                        />
                      </div>
                      {state.status === 'success' && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Uploaded to {state.category}
                        </p>
                      )}
                      {state.status === 'error' && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {state.error || 'Upload failed'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - History */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Uploads
                </h3>
                <button
                  onClick={loadHistory}
                  className="text-sm text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No uploads yet</p>
                  <p className="text-sm">Upload some files to see them here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.originalName}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatFileSize(item.fileSize)}</span>
                            <span>•</span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                              {item.category}
                            </span>
                            <span>•</span>
                            <span>{formatDate(item.uploadedAt)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {item.storedPath}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-primary/10 to-indigo-50 rounded-xl p-6 border border-primary/20">
              <h4 className="font-semibold mb-2">💡 Tips</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Files are automatically organized by type</li>
                <li>• Large files (&gt;50MB) use chunked upload</li>
                <li>• Max file size: {formatFileSize(config.maxFileSize)}</li>
                <li>• Files saved to: D:\uploads\</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
