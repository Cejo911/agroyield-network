'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        fontSize: 13, fontWeight: 600, color: '#ef4444',
        background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 100, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit'
      }}
    >
      Sign out
    </button>
  )
}
