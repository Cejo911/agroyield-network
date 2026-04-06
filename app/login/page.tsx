'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">AgroYield Network</h1>
        <p className="text-green-400 mb-8">Agriculture is a Business. Build Yours.</p>
        <button
          onClick={signInWithGoogle}
          className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-3 rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  )
}
