'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/app/components/AppNav'
import useProfileGate from '@/app/hooks/useProfileGate'
import ProfileGateBanner from '@/app/components/ProfileGateBanner'
import ImageUploader from '@/app/components/ImageUploader'
import FileUploader from '@/app/components/FileUploader'
import { createClient } from '@/lib/supabase/client'

const TYPES = ['finding', 'question', 'dataset', 'review', 'collaboration', 'guide', 'resource']
const TAGS = [
  'Crop Science', 'Livestock', 'Agritech', 'Soil Health', 'Irrigation',
  'Food Processing', 'Agricultural Finance', 'Climate & Sustainability',
  'Supply Chain', 'Research & Development',
]

export default function NewResearchPage() {
  const router = useRouter()
  const { ready: gateReady, allowed: profileComplete, missing: profileMissing } = useProfileGate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [coverImages, setCoverImages] = useState<string[]>([])
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [form, setForm] = useState({
    title:     '',
    type:      '',
    content:   '',
    tags:      [] as string[],
    is_locked: false,
  })

  // Get current user ID for upload folder
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cover_image_url: coverImages[0] || null,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')
      setMessage({ type: 'success', text: 'Posted successfully! Redirecting...' })
      setTimeout(() => router.push('/research'), 1500)
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Post Research</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Share findings, questions, datasets, guides or learning resources with the network.</p>
        </div>
        {gateReady && !profileComplete ? (
          <ProfileGateBanner missing={profileMissing} />
        ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Effect of soil pH on maize yield in northern Nigeria"
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type }))}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      form.type === type
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                placeholder="Share your research findings, methodology, questions, dataset details or learning resources..."
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Cover Image */}
            {userId && (
              <ImageUploader
                bucket="research-files"
                folder={`${userId}/images`}
                maxImages={1}
                maxSizeMB={2}
                value={coverImages}
                onChange={setCoverImages}
              />
            )}

            {/* File Attachment */}
            {userId && (
              <FileUploader
                bucket="research-files"
                folder={`${userId}/docs`}
                maxSizeMB={10}
                value={attachmentUrl}
                fileName={attachmentName}
                onChange={(url, name) => {
                  setAttachmentUrl(url)
                  setAttachmentName(name)
                }}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topics</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.tags.includes(tag)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">🔒 Lock this post</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Public visitors see a preview only. Signed-in members read the full post.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, is_locked: !prev.is_locked }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_locked ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_locked ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {message && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.title || !form.type || !form.content}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Posting...' : 'Post Research'}
            </button>
          </form>
        </div>
        )}
      </main>
    </div>
  )
}
