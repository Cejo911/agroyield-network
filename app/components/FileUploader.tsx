'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf':        'PDF',
  'application/msword':     'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv':               'CSV',
}

const ACCEPT = Object.keys(ALLOWED_TYPES).join(',') +
  ',.pdf,.doc,.docx,.xls,.xlsx,.csv'

interface FileUploaderProps {
  /** Supabase storage bucket name */
  bucket: string
  /** Folder prefix inside the bucket (e.g. the user's ID) */
  folder: string
  /** Max file size in MB (default 10) */
  maxSizeMB?: number
  /** Current file URL */
  value: string | null
  /** Current file display name */
  fileName: string | null
  /** Callback when file changes */
  onChange: (url: string | null, name: string | null) => void
}

export default function FileUploader({
  bucket,
  folder,
  maxSizeMB = 10,
  value,
  fileName,
  onChange,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (name: string | null) => {
    if (!name) return '📎'
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📕'
    if (ext === 'doc' || ext === 'docx') return '📘'
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return '📗'
    return '📎'
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check type
    if (!ALLOWED_TYPES[file.type]) {
      setError('Only PDF, DOC, DOCX, XLS, XLSX and CSV files are allowed.')
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB.`)
      return
    }

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl, file.name)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeFile = () => {
    onChange(null, null)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Attachment <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
      </label>

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <span className="text-xl">{getFileIcon(fileName)}</span>
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
            {fileName || 'Uploaded file'}
          </span>
          <button
            type="button"
            onClick={removeFile}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-600 transition-colors text-center disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">Uploading...</span>
          ) : (
            <>
              <span className="block text-2xl mb-1">📎</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Click to attach a file
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={handleUpload}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
        PDF, DOC, DOCX, XLS, XLSX or CSV. Max {maxSizeMB}MB.
      </p>
    </div>
  )
}
