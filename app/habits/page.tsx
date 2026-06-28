'use client'
import { useState, useEffect, useRef } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc, limit } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type Habit = { id: string; name: string; color: string; created_at: string; category: string; habit_type: string }

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '◈' },
  { id: 'health', label: 'Health', icon: '❤' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'mind', label: 'Mind', icon: '🧠' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '✨' },
  { id: 'social', label: 'Social', icon: '🤝' },
]

const RECOMMENDED = [
  { name: 'Drink 2L water', emoji: '💧', color: '#185FA5', category: 'health', habit_type: 'simple' },
  { name: 'Floss teeth', emoji: '🦷', color: '#0F9E75', category: 'health', habit_type: 'simple' },
  { name: 'Cold shower', emoji: '🚿', color: '#185FA5', category: 'health', habit_type: 'simple' },
  { name: 'Posture check', emoji: '🧍', color: '#D4537E', category: 'health', habit_type: 'simple' },
  { name: 'Screen time limit', emoji: '📱', color: '#D85A30', category: 'health', habit_type: 'simple' },
  { name: 'No alcohol', emoji: '🚫', color: '#D85A30', category: 'health', habit_type: 'simple' },
  { name: 'Gym workout', emoji: '🏋️', color: '#D85A30', category: 'fitness', habit_type: 'gym' },
  { name: 'Football session', emoji: '⚽', color: '#0F9E75', category: 'fitness', habit_type: 'sport' },
  { name: 'Running', emoji: '🏃', color: '#0F9E75', category: 'fitness', habit_type: 'cardio' },
  { name: 'Walk 10,000 steps', emoji: '👟', color: '#0F9E75', category: 'fitness', habit_type: 'steps' },
  { name: 'Yoga', emoji: '🧘', color: '#D4537E', category: 'fitness', habit_type: 'yoga' },
  { name: 'Stretching', emoji: '🤸', color: '#7C3AED', category: 'fitness', habit_type: 'simple' },
  { name: 'Meditate', emoji: '🧘', color: '#D4537E', category: 'mind', habit_type: 'meditation' },
  { name: 'Read for 20 minutes', emoji: '📚', color: '#7C3AED', category: 'mind', habit_type: 'reading' },
  { name: 'Journal', emoji: '✏️', color: '#BA7517', category: 'mind', habit_type: 'journal' },
  { name: 'Gratitude practice', emoji: '🙏', color: '#D4537E', category: 'mind', habit_type: 'journal' },
  { name: 'No social media', emoji: '📵', color: '#D85A30', category: 'mind', habit_type: 'simple' },
  { name: 'Eat healthy meals', emoji: '🥗', color: '#0F9E75', category: 'nutrition', habit_type: 'nutrition' },
  { name: 'No junk food', emoji: '🚫', color: '#D85A30', category: 'nutrition', habit_type: 'simple' },
  { name: 'No sugar', emoji: '🍬', color: '#D85A30', category: 'nutrition', habit_type: 'simple' },
  { name: 'Protein goal', emoji: '🥩', color: '#D85A30', category: 'nutrition', habit_type: 'nutrition' },
  { name: 'Wake up at 6am', emoji: '⏰', color: '#BA7517', category: 'lifestyle', habit_type: 'simple' },
  { name: 'Make bed', emoji: '🛏️', color: '#7C3AED', category: 'lifestyle', habit_type: 'simple' },
  { name: 'Clean desk / room', emoji: '🧹', color: '#0F9E75', category: 'lifestyle', habit_type: 'simple' },
  { name: 'Call a friend or family', emoji: '📞', color: '#0F9E75', category: 'social', habit_type: 'simple' },
  { name: 'Do something kind', emoji: '💛', color: '#BA7517', category: 'social', habit_type: 'simple' },
]

const MOTIVATIONAL = [
  "Let's crush it today 💥",
  "Small steps, big results 🚀",
  "You showed up. That's everything 🔥",
  "Consistency is your superpower ⚡",
  "Make today count ✨",
  "Progress over perfection 🎯",
  "Your future self will thank you 🙌",
  "One habit at a time 🌱",
]

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [newHabit, setNewHabit] = useState('')
  const [loading, setLoading] = useState(true)
  const [showRecommended, setShowRecommended] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [recSearch, setRecSearch] = useState('')
  const [quote] = useState(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)])
  const [uid, setUid] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const COLORS = ['#7C3AED','#0F9E75','#D85A30','#D4537E','#185FA5','#BA7517']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const particles: {x:number;y:number;r:number;dx:number;dy:number;o:number}[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*1.5+0.3, dx: (Math.random()-0.5)*0.3, dy: (Math.random()-0.5)*0.3, o: Math.random()*0.4+0.1 })
    }
    let animId: number
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(139,92,246,${p.o})`; ctx.fill()
        p.x += p.dx; p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      loadData(user.uid)
    })
    return () => unsub()
  }, [])

  async function loadData(userId: string) {
    const habitsSnap = await getDocs(
      query(collection(db, 'habits'), where('user_id', '==', userId), orderBy('created_at'))
    )
    const habitsData: Habit[] = habitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Habit))

    const logsSnap = await getDocs(
      query(collection(db, 'habit_logs'), where('user_id', '==', userId), where('logged_date', '==', today))
    )
    const logsData = logsSnap.docs.map(d => d.data().habit_id as string)

    setHabits(habitsData)
    setLogs(logsData)
    await computeStreaks(habitsData)
    setLoading(false)
  }

  async function computeStreaks(habitList: Habit[]) {
    const result: Record<string, number> = {}
    for (const habit of habitList) {
      let streak = 0
      const d = new Date()
      while (true) {
        const ds = d.toISOString().slice(0, 10)
        const snap = await getDocs(
          query(collection(db, 'habit_logs'), where('habit_id', '==', habit.id), where('logged_date', '==', ds), limit(1))
        )
        if (!snap.empty) { streak++; d.setDate(d.getDate() - 1) } else break
      }
      result[habit.id] = streak
    }
    setStreaks(result)
  }

  async function addHabit(name?: string, color?: string, category?: string, habit_type?: string) {
    const habitName = name || newHabit.trim()
    if (!habitName || !uid) return
    const habitColor = color || COLORS[habits.length % COLORS.length]
    await addDoc(collection(db, 'habits'), {
      name: habitName, color: habitColor, user_id: uid,
      category: category || 'general', habit_type: habit_type || 'simple',
      created_at: new Date().toISOString()
    })
    setNewHabit(''); setShowRecommended(false)
    loadData(uid)
  }

  async function toggleLog(habit: Habit) {
    if (!uid) return
    const done = logs.includes(habit.id)
    const specialTypes = ['gym','sport','cardio','yoga','meditation','reading','journal','steps','water','sleep','nutrition','learning','focus']
    if (!done && specialTypes.includes(habit.habit_type)) {
      router.push(`/log?habit_id=${habit.id}&date=${today}&name=${encodeURIComponent(habit.name)}&type=${habit.habit_type}&color=${encodeURIComponent(habit.color)}`)
      return
    }
    if (done) {
      const snap = await getDocs(
        query(collection(db, 'habit_logs'), where('habit_id', '==', habit.id), where('logged_date', '==', today), limit(1))
      )
      if (!snap.empty) await deleteDoc(snap.docs[0].ref)
    } else {
      await addDoc(collection(db, 'habit_logs'), { habit_id: habit.id, logged_date: today, user_id: uid })
    }
    loadData(uid)
  }

  async function deleteHabit(id: string) {
    await deleteDoc(doc(db, 'habits', id))
    if (uid) loadData(uid)
  }

  async function handleSignOut() { await signOut(auth); router.push('/login') }

  const filtered = activeCategory === 'all' ? habits : habits.filter(h => h.category === activeCategory)
  const completed = logs.length, total = habits.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const existingNames = habits.map(h => h.name.toLowerCase())
  const filteredRec = RECOMMENDED.filter(r => !existingNames.includes(r.name.toLowerCase()) && (recSearch === '' || r.name.toLowerCase().includes(recSearch.toLowerCase()) || r.category.includes(recSearch.toLowerCase())))
  const bestStreak = Math.max(0, ...Object.values(streaks))
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 text-sm animate-pulse">Loading your habits...</p>
      </div>
    </div>
  )

  return (
    <PageContainer title="✅ Habits" subtitle={`${habits.length} active`}>
      <div className="min-h-screen pb-20 relative" style={{background:'linear-gradient(160deg, #07071a 0%, #0e0920 40%, #070d18 100%)'}}>
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{zIndex:0, opacity:0.6}} />
        <div className="fixed pointer-events-none" style={{top:'-10%',left:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',zIndex:0}} />

        <div className="relative max-w-lg mx-auto px-4" style={{zIndex:1}}>
          <div className="pt-10 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-purple-400/60 text-xs font-medium tracking-widest uppercase">{greeting()}</p>
                <h1 className="text-2xl font-bold text-white mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
                <p className="text-zinc-500 text-sm mt-1.5 italic">{quote}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => router.push('/stats')} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </button>
                <button onClick={handleSignOut} className="h-9 px-3 rounded-xl text-zinc-400 text-xs" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Out</button>
              </div>
            </div>
          </div>

          {total > 0 ? (
            <div className="rounded-3xl p-5 mb-5 relative overflow-hidden" style={{background:'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 100%)', border:'1px solid rgba(124,58,237,0.25)'}}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Today's Progress</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black" style={{background:'linear-gradient(90deg, #a78bfa, #34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>{pct}%</span>
                    <span className={`text-sm font-semibold mb-1.5 ${pct >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{pct >= 70 ? 'On track' : 'Below 70%'}</span>
                  </div>
                </div>
                <div className="text-4xl">{pct >= 100 ? '🏆' : pct >= 70 ? '🔥' : pct >= 40 ? '💪' : '😤'}</div>
              </div>
              <div className="h-3 rounded-full overflow-hidden mb-2" style={{background:'rgba(255,255,255,0.06)'}}>
                <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`, background: pct >= 70 ? 'linear-gradient(90deg, #7C3AED, #34d399)' : 'linear-gradient(90deg, #D85A30, #f59e0b)'}} />
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{completed} completed</span>
                <span>{total - completed} left</span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-8 mb-5 text-center" style={{background:'rgba(124,58,237,0.05)',border:'1px dashed rgba(124,58,237,0.2)'}}>
              <p className="text-5xl mb-3">🌱</p>
              <p className="text-white font-semibold mb-1">Start your journey</p>
              <p className="text-zinc-500 text-sm">Add habits below to begin</p>
            </div>
          )}

          {total > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label:'Habits', value: String(total), gradient:'rgba(124,58,237,0.15)', border:'rgba(124,58,237,0.2)' },
                { label:'Done', value: String(completed), gradient:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.2)' },
                { label:'Streak', value: `${bestStreak}🔥`, gradient:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.2)' },
              ].map((s,i) => (
                <div key={i} className="rounded-2xl p-3 text-center" style={{background:s.gradient, border:`1px solid ${s.border}`}}>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{scrollbarWidth:'none'}}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={activeCategory === cat.id
                  ? {background:'linear-gradient(135deg,#7C3AED,#5b21b6)', border:'1px solid rgba(124,58,237,0.5)', color:'white'}
                  : {background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.4)'}}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-3">
            <input value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key==='Enter' && addHabit()}
              placeholder="Add a custom habit..."
              className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none"
              style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}} />
            <button onClick={() => addHabit()} className="px-5 py-3 rounded-2xl text-sm font-bold text-white"
              style={{background:'linear-gradient(135deg,#7C3AED,#5b21b6)'}}>Add</button>
          </div>

          <button onClick={() => setShowRecommended(!showRecommended)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-4 text-sm"
            style={{background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.18)'}}>
            <span className={`text-purple-400 text-xs transition-transform duration-200 ${showRecommended?'rotate-90':''}`}>▶</span>
            <span className="text-purple-300/80 font-medium">Browse {RECOMMENDED.length}+ recommended habits</span>
            <span className="ml-auto text-purple-500/50 text-xs">{filteredRec.length} new</span>
          </button>

          {showRecommended && (
            <div className="rounded-3xl p-4 mb-5" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <input value={recSearch} onChange={e => setRecSearch(e.target.value)} placeholder="🔍 Search habits..."
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none mb-3"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}} />
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto" style={{scrollbarWidth:'none'}}>
                {filteredRec.map(r => (
                  <button key={r.name} onClick={() => addHabit(r.name, r.color, r.category, r.habit_type)}
                    className="flex items-center gap-3 p-3 rounded-2xl text-left"
                    style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)'}}>
                    <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl shrink-0" style={{background:'rgba(255,255,255,0.05)'}}>{r.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{r.name}</p>
                      <p className="text-xs text-zinc-500 capitalize mt-0.5">{r.category} · {r.habit_type !== 'simple' ? r.habit_type+' tracking' : 'simple'}</p>
                    </div>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0" style={{background:'rgba(124,58,237,0.2)',color:'#a78bfa'}}>+</span>
                  </button>
                ))}
                {filteredRec.length === 0 && <p className="text-center text-zinc-600 text-sm py-6">No habits found</p>}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-zinc-700">
                <p className="text-5xl mb-4">🌿</p>
                <p className="text-sm">No habits here yet</p>
              </div>
            )}
            {filtered.map(habit => {
              const done = logs.includes(habit.id)
              const streak = streaks[habit.id] || 0
              const isTracked = habit.habit_type !== 'simple'
              return (
                <div key={habit.id} onClick={() => toggleLog(habit)}
                  className="group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
                  style={{
                    background: done ? 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(52,211,153,0.06))' : 'rgba(255,255,255,0.03)',
                    border: done ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  <div className="w-1 h-12 rounded-full shrink-0" style={{background: done ? 'linear-gradient(180deg,#7C3AED,#34d399)' : habit.color}} />
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{background: done ? 'linear-gradient(135deg,#7C3AED,#34d399)' : 'rgba(255,255,255,0.05)', border: done ? 'none' : '2px solid rgba(255,255,255,0.1)'}}>
                    {done
                      ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <span style={{fontSize:'14px'}}>{RECOMMENDED.find(r=>r.name===habit.name)?.emoji || '⬡'}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${done ? 'text-zinc-400 line-through' : 'text-white'}`}>{habit.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs capitalize px-2 py-0.5 rounded-full" style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.25)'}}>{habit.category}</span>
                      {streak > 0 && <span className="text-xs text-amber-400">🔥 {streak}d</span>}
                      {isTracked && !done && <span className="text-xs" style={{color:'rgba(167,139,250,0.6)'}}>tap to log →</span>}
                      {done && <span className="text-xs text-emerald-400/70">✓ Done</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteHabit(habit.id) }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-xl flex items-center justify-center text-zinc-700 hover:text-red-400">
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}