'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface ImageUploaderProps {
  /** Supabase storage bucket name */
  bucket: string
  /** Folder prefix inside the bucket (e.g. the user's ID) */
  folder: string
  /** Max number of images allowed */
  maxImages?: number
  /** Max file size in bytes (default 2MB) */
  maxSizeMB?: number
  /** Current image URLs */
  value: string[]
  /** Callback when images change */
  onChange: (urls: string[]) => void
}

export default function ImageUploader({
  bucket,
  folder,
  maxImages = 4,
  maxSizeMB = 2,
  value,
  onChange,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const remaining = maxImages - value.length
    if (remaining <= 0) {
      setError(`Maximum ${maxImages} images allowed.`)
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)

    // Validate all files first
    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPG, PNG, WebP) are allowed.')
        return
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Each image must be under ${maxSizeMB}MB.`)
        return
      }
    }

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const newUrls: string[] = []

      for (const file of toUpload) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }

      onChange([...value, ...newUrls])
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset the input so the same file can be selected again
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Photos <span className="text-gray-500 dark:text-gray-500 font-normal">({value.length}/{maxImages})</span>
      </label>

      <div className="flex flex-wrap gap-3">
        {/* Existing previews */}
        {value.map((url, i) => (
          <div key={url} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <Image src={url} alt={`Upload ${i + 1}`} fill className="object-cover" sizes="96px" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <span className="text-white text-lg font-bold">✕</span>
            </button>
          </div>
        ))}

        {/* Add button */}
        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-600 transition-colors flex flex-col items-center justify-center text-gray-500 dark:text-gray-500 disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-xs">Uploading...</span>
            ) : (
              <>
                <span className="text-2xl leading-none mb-1">+</span>
                <span className="text-[10px]">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={maxImages > 1}
        onChange={handleUpload}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">
        JPG, PNG or WebP. Max {maxSizeMB}MB per image.
      </p>
    </div>
  )
}
