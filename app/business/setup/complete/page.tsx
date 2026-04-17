import Link from 'next/link'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ slug?: string }>

export default async function BusinessSetupCompletePage({ searchParams }: { searchParams: SearchParams }) {
  const { slug } = await searchParams
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://agroyield.africa'
  const url = slug ? `${origin}/b/${slug}` : null

  return (
    <div className="max-w-2xl mx-auto py-10 text-center space-y-6">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your business is live on AgroYield!</h1>
      <p className="text-gray-600 dark:text-gray-300">
        You can share your public page anywhere — WhatsApp, Instagram bio, business cards, invoices.
      </p>

      {url && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-3">
          <code className="block text-sm text-green-700 dark:text-green-300 break-all">{url}</code>
          <div className="flex flex-wrap justify-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              View my page
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Check out my business on AgroYield: ${url}`)}`}
              target="_blank" rel="noreferrer"
              className="text-xs bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              Share on WhatsApp
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just launched my business on @AgroYield 🌾`)}&url=${encodeURIComponent(url)}`}
              target="_blank" rel="noreferrer"
              className="text-xs bg-sky-100 text-sky-700 px-4 py-2 rounded-lg hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"
            >
              Share on X
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
              target="_blank" rel="noreferrer"
              className="text-xs bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
            >
              Share on Facebook
            </a>
          </div>
        </div>
      )}

      <Link href="/business" className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-medium">
        Go to dashboard
      </Link>
    </div>
  )
}