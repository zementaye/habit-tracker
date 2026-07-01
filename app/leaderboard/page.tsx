'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { PageContainer } from '@/components/navigation'

type LeaderboardEntry = {
  id: string
  username: string
  totalHabits: number
  streakDays: number
  completionRate: number
  avatar?: string
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  async function loadLeaderboard() {
    try {
      // Mock data - in production this would aggregate user data
      setEntries([
        { id: '1', username: 'You', totalHabits: 12, streakDays: 45, completionRate: 92, avatar: '👤' },
        { id: '2', username: 'Alex', totalHabits: 15, streakDays: 67, completionRate: 95, avatar: '👨' },
        { id: '3', username: 'Jordan', totalHabits: 10, streakDays: 32, completionRate: 88, avatar: '👩' },
        { id: '4', username: 'Casey', totalHabits: 8, streakDays: 28, completionRate: 85, avatar: '👤' },
        { id: '5', username: 'Morgan', totalHabits: 14, streakDays: 56, completionRate: 90, avatar: '👤' },
      ])
      setLoading(false)
    } catch (e) {
      console.error('Error loading leaderboard:', e)
      setLoading(false)
    }
  }

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-4 mb-3 ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )

  if (loading) {
    return (
      <PageContainer title="🏆 Leaderboard" subtitle="Share your scores">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="🏆 Leaderboard" subtitle="Share your scores">
      <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <p className="text-zinc-400 text-sm">Top performers this month</p>
          </div>

          {entries.map((entry, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  '
            const isYou = entry.username === 'You'
            
            return (
              <Card
                key={entry.id}
                className={isYou ? 'ring-2 ring-cyan-500' : ''}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{medal}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{entry.avatar}</span>
                      <div>
                        <p className="font-bold text-white text-sm flex items-center gap-2">
                          {entry.username}
                          {isYou && <span className="text-xs px-2 py-1 rounded-full bg-cyan-500 text-black">You</span>}
                        </p>
                        <p className="text-zinc-500 text-xs">#{idx + 1}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-zinc-600">Habits</p>
                        <p className="text-white font-bold">{entry.totalHabits}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Streak</p>
                        <p className="text-white font-bold">{entry.streakDays}d</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Rate</p>
                        <p className="text-white font-bold">{entry.completionRate}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}

          <div className="mt-8 rounded-2xl p-4" style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.3)' }}>
            <p className="text-cyan-400 text-sm">💡 Complete more habits and maintain streaks to climb the leaderboard!</p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}