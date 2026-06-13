'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else router.push('/habits')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/habits')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-white text-2xl font-semibold mb-2">
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          {isSignUp ? 'Start tracking your habits today' : 'Log in to your habit tracker'}
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 mb-3 text-sm outline-none border border-zinc-700 focus:border-purple-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 mb-4 text-sm outline-none border border-zinc-700 focus:border-purple-500"
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Log in'}
        </button>
        <p className="text-zinc-400 text-sm text-center mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-purple-400 hover:underline">
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}