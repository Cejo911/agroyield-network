import Link from 'next/link'
import AppNav from '@/app/components/AppNav'

export default function VerifySuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#16a34a">
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful!</h1>
        <p className="text-gray-500 mb-2">
          Your verified badge is being activated. It may take up to a minute to appear on your profile.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          If your badge does not appear after a few minutes, please contact support.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile"
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
            View My Profile
          </Link>
          <Link href="/dashboard"
            className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
