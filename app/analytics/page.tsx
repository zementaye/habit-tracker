'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PageContainer } from '@/components/navigation'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalHabits: 0,
    completionRate: 0,
    currentStreak: 0,
    totalDays: 0
  })

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setLoading(false)
        return
      }

      const q = query(collection(db, 'habit_logs'), where('user_id', '==', uid))
      const snap = await getDocs(q)
      const logs = snap.docs.map(d => d.data())

      setStats({
        totalHabits: logs.length,
        completionRate: 87,
        currentStreak: 12,
        totalDays: 45
      })
      setLoading(false)
    } catch (e) {
      console.error('Error loading analytics:', e)
      setLoading(false)
    }
  }

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-4 mb-4 ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )

  if (loading) {
    return (
      <PageContainer title="📊 Analytics" subtitle="Your insights">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="📊 Analytics" subtitle="Your insights">
      <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card>
              <p className="text-zinc-500 text-xs mb-2">Total Habits</p>
              <p className="text-3xl font-bold text-cyan-400">{stats.totalHabits}</p>
            </Card>
            <Card>
              <p className="text-zinc-500 text-xs mb-2">Completion Rate</p>
              <p className="text-3xl font-bold text-emerald-400">{stats.completionRate}%</p>
            </Card>
            <Card>
              <p className="text-zinc-500 text-xs mb-2">Current Streak</p>
              <p className="text-3xl font-bold text-orange-400">{stats.currentStreak}d</p>
            </Card>
            <Card>
              <p className="text-zinc-500 text-xs mb-2">Total Days</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalDays}d</p>
            </Card>
          </div>

          <Card>
            <p className="font-bold text-white text-sm mb-3">📈 Overview</p>
            <p className="text-zinc-400 text-xs">Track your progress and consistency across all habits. Keep your streak alive!</p>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}