'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type HeatmapDay = { date: string; count: number }

export default function HabitHeatmapPage() {
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([])
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)
  const [habits, setHabits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ completedDays: 0, longestStreak: 0, currentStreak: 0 })
  const [uid, setUid] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      load(user.uid)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (uid) load(uid)
  }, [selectedHabit])

  async function load(userId: string) {
    const habitsSnap = await getDocs(
      query(collection(db, 'habits'), where('user_id', '==', userId))
    )
    setHabits(habitsSnap.docs.map(d => ({ id: d.id, ...d.data() })))

    const logsQuery = selectedHabit
      ? query(collection(db, 'habit_logs'), where('user_id', '==', userId), where('habit_id', '==', selectedHabit))
      : query(collection(db, 'habit_logs'), where('user_id', '==', userId))

    const logsSnap = await getDocs(logsQuery)

    const today = new Date()
    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

    const dayMap: Record<string, number> = {}
    logsSnap.docs.forEach(d => {
      const date = d.data().logged_date
      dayMap[date] = (dayMap[date] || 0) + 1
    })

    const heatmapDays: HeatmapDay[] = []
    let completedDays = 0, longestStreak = 0, tempStreak = 0

    for (let i = 0; i < 365; i++) {
      const date = new Date(yearAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      const count = dayMap[dateStr] || 0
      if (count > 0) { completedDays++; tempStreak++; longestStreak = Math.max(longestStreak, tempStreak) } else { tempStreak = 0 }
      heatmapDays.push({ date: dateStr, count })
    }

    let currentStreak = 0
    for (let i = 0; i < 365; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      if (dayMap[dateStr]) { currentStreak++ } else break
    }

    setHeatmap(heatmapDays)
    setStats({ completedDays, longestStreak, currentStreak })
    setLoading(false)
  }

  const weeks = []
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7))

  if (loading) return <PageContainer title="🔥 Habit Heatmap" subtitle="365-day view"><div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin mx-auto"/></div></PageContainer>

  return (
    <PageContainer title="🔥 Habit Heatmap" subtitle="Your consistency">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {emoji:'🔥', val:`${stats.currentStreak}d`, label:'Current', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.4)', color:'text-emerald-400'},
          {emoji:'🏆', val:`${stats.longestStreak}d`, label:'Longest', bg:'rgba(251,191,36,0.15)', border:'rgba(251,191,36,0.4)', color:'text-amber-400'},
          {emoji:'✅', val:String(stats.completedDays), label:'Days', bg:'rgba(59,130,246,0.15)', border:'rgba(59,130,246,0.4)', color:'text-blue-400'},
        ].map((s,i) => (
          <div key={i} className="rounded-2xl p-4 text-center" style={{background:s.bg, border:`1px solid ${s.border}`}}>
            <p className="text-2xl mb-1">{s.emoji}</p>
            <p className={`font-bold ${s.color}`}>{s.val}</p>
            <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {habits.length > 0 && (
        <div className="mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Filter by habit</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedHabit(null)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={!selectedHabit ? {background:'linear-gradient(135deg,#7C3AED,#4f46e5)',color:'white'} : {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>
              All Habits
            </button>
            {habits.slice(0, 8).map(h => (
              <button key={h.id} onClick={() => setSelectedHabit(h.id)} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={selectedHabit === h.id ? {background:h.color||'#7C3AED',color:'white'} : {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl p-6 mb-6" style={{background:'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(16,185,129,0.02))',border:'1px solid rgba(16,185,129,0.2)'}}>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Last 365 days</p>
        <div style={{display:'flex',gap:'8px',alignItems:'flex-start',overflowX:'auto',paddingBottom:'1rem'}}>
          <div style={{display:'flex',flexDirection:'column',gap:'4px',marginRight:'4px'}}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <span key={d} style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',height:'20px'}}>{d}</span>
            ))}
          </div>
          <div style={{display:'flex',gap:'4px',minWidth:'fit-content'}}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                {week.map(day => (
                  <div key={day.date} style={{width:'20px',height:'20px',borderRadius:'3px',background:day.count>0?'#10b981':'#1f2937',border:day.count>0?'1px solid rgba(16,185,129,0.6)':'1px solid rgba(255,255,255,0.1)',cursor:'pointer'}}/>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 text-xs text-zinc-500">
          <span>Less</span>
          <div className="flex gap-2">
            <div className="w-4 h-4 rounded-sm" style={{background:'#1f2937',border:'1px solid rgba(255,255,255,0.2)'}}/>
            <div className="w-4 h-4 rounded-sm" style={{background:'#10b981',border:'1px solid rgba(16,185,129,0.6)'}}/>
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="rounded-3xl p-5" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(79,70,229,0.08))',border:'1px solid rgba(124,58,237,0.2)'}}>
        <p className="text-purple-400 text-xs uppercase tracking-widest mb-3">💡 Insights</p>
        <div className="flex flex-col gap-2 text-sm text-zinc-300">
          {stats.currentStreak > 0 ? <p>🔥 {stats.currentStreak}-day streak! Keep it going.</p> : <p>📍 Start your streak today. Log one habit now.</p>}
          {stats.completedDays >= 100 && <p>✅ {stats.completedDays} days completed — you're unstoppable!</p>}
          {stats.longestStreak > 0 && stats.longestStreak !== stats.currentStreak && <p>📈 Best streak: {stats.longestStreak}d. Beat it!</p>}
        </div>
      </div>
    </PageContainer>
  )
}