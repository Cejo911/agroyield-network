import { redirect } from 'next/navigation'

// Legacy /verify route — redirect to the new pricing page
export default function VerifyPage() {
  redirect('/pricing')
}
