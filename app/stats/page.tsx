'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type Habit = { id: string; name: string; color: string }

export default function StatsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [weekData, setWeekData] = useState<{ day: string; pct: number }[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return }
      loadStats(user.uid)
    })
    return () => unsub()
  }, [])

  async function loadStats(uid: string) {
    const habitsSnap = await getDocs(
      query(collection(db, 'habits'), where('user_id', '==', uid))
    )
    const habitsData: Habit[] = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Habit))
    setHabits(habitsData)

    const ratesMap: Record<string, number> = {}
    const streaksMap: Record<string, number> = {}

    for (const h of habitsData) {
      // 30-day completion rate
      let total = 0, done = 0
      for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const ds = d.toISOString().slice(0, 10)
        total++
        const snap = await getDocs(
          query(collection(db, 'habit_logs'), where('habit_id', '==', h.id), where('logged_date', '==', ds), limit(1))
        )
        if (!snap.empty) done++
      }
      ratesMap[h.id] = total > 0 ? Math.round((done / total) * 100) : 0

      // streak
      let streak = 0
      const d = new Date()
      while (true) {
        const ds = d.toISOString().slice(0, 10)
        const snap = await getDocs(
          query(collection(db, 'habit_logs'), where('habit_id', '==', h.id), where('logged_date', '==', ds), limit(1))
        )
        if (!snap.empty) { streak++; d.setDate(d.getDate() - 1) } else break
      }
      streaksMap[h.id] = streak
    }
    setRates(ratesMap)
    setStreaks(streaksMap)

    // Week overview
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const week = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const daySnap = await getDocs(
        query(collection(db, 'habit_logs'), where('user_id', '==', uid), where('logged_date', '==', ds))
      )
      const pct = habitsData.length > 0 ? Math.round((daySnap.size / habitsData.length) * 100) : 0
      week.push({ day: days[d.getDay()], pct })
    }
    setWeekData(week)
    setLoading(false)
  }

  const avgRate = habits.length > 0 ? Math.round(Object.values(rates).reduce((a, b) => a + b, 0) / habits.length) : 0
  const bestStreak = Math.max(0, ...Object.values(streaks))

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <PageContainer title="📊 Stats" subtitle="Your performance">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{avgRate}%</p>
          <p className="text-zinc-500 text-xs mt-1">Avg rate</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">🔥 {bestStreak}</p>
          <p className="text-zinc-500 text-xs mt-1">Best streak</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{habits.length}</p>
          <p className="text-zinc-500 text-xs mt-1">Habits</p>
        </div>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-6">
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">This week</p>
        <div className="flex items-end gap-2 h-24">
          {weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-lg transition-all" style={{ height: `${Math.max(4, d.pct * 0.8)}px`, background: d.pct >= 70 ? 'rgb(124,58,237)' : d.pct >= 40 ? 'rgb(234,179,8)' : 'rgb(63,63,70)' }} />
              <span className="text-zinc-500 text-xs">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">30-day completion per habit</p>
      <div className="flex flex-col gap-3">
        {habits.map(h => {
          const rate = rates[h.id] || 0
          const streak = streaks[h.id] || 0
          return (
            <div key={h.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-white">{h.name}</p>
                <div className="flex items-center gap-2">
                  {streak > 0 && <span className="text-xs text-amber-400">🔥{streak}</span>}
                  <span className={`text-sm font-bold ${rate >= 70 ? 'text-green-400' : rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: rate >= 70 ? 'rgb(74,222,128)' : rate >= 40 ? 'rgb(234,179,8)' : 'rgb(248,113,113)' }} />
              </div>
              {rate < 70 && <p className="text-xs text-zinc-600 mt-1">Need {70 - rate}% more to hit target</p>}
            </div>
          )
        })}
      </div>
    </PageContainer>
  )
}