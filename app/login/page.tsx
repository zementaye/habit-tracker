'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function signInAnon() {
    setLoading(true)
    setError('')
    try {
      await signInAnonymously(auth)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function signInWithGoogle() {
    setLoading(true)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
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
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 mb-3 text-sm outline-none border border-zinc-700 focus:border-cyan-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 mb-4 text-sm outline-none border border-zinc-700 focus:border-cyan-400"
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Log in'}
        </button>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 text-black rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50 mt-3"
        >
          🔍 Continue with Google
        </button>

        <button
          onClick={signInAnon}
          disabled={loading}
          className="w-full bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-3 text-sm font-medium transition-colors disabled:opacity-50 mt-3"
        >
          Continue as Guest
        </button>

        <p className="text-zinc-400 text-sm text-center mt-4">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-cyan-400 hover:underline">
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}