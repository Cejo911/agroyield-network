import PageShell from '@/app/components/design/PageShell'
import { PrimaryLink, SecondaryLink } from '@/app/components/design/Button'

// Migrated to PageShell during Day 7 of the pre-Beta sweep. Side benefit:
// PageShell adds the dark:bg-gray-950 background variant that this page was
// missing, fixing a small dark-mode bug on the post-payment confirmation.
// Custom inner layout (centered icon + headline + dual CTAs) is preserved
// inside the shell — this page is a one-off success state, not a module.
export default function VerifySuccessPage() {
  return (
    <PageShell maxWidth="none">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#16a34a">
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Payment Successful!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          Your verified badge is being activated. It may take up to a minute to appear on your profile.
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mb-8">
          If your badge does not appear after a few minutes, please contact support.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryLink href="/profile" size="lg">View My Profile</PrimaryLink>
          <SecondaryLink href="/dashboard" size="lg">Go to Dashboard</SecondaryLink>
        </div>
      </div>
    </PageShell>
  )
}
