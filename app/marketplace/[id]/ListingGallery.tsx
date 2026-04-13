'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  images: string[]
  title: string
}

export default function ListingGallery({ images, title }: Props) {
  const [active, setActive] = useState(0)

  if (!images.length) return null

  return (
    <div className="mb-5">
      {/* Main image */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
        <Image
          src={images[active]}
          alt={`${title} - Photo ${active + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 672px) 100vw, 672px"
          priority
        />
      </div>

      {/* Thumbnails — only show if multiple images */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === active
                  ? 'border-green-500'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Image
                src={url}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
