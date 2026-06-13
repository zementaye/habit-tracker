'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

const WHAT_MISSING: Record<string, string[]> = {
  default: ['Finishing', 'Positioning', 'Stamina', 'Communication', 'First touch', 'Decision making', 'Defending', 'Speed', 'Composure', 'Passing accuracy'],
  football: ['Finishing', 'Positioning', 'Stamina', 'Communication', 'First touch', 'Decision making', 'Defending', 'Speed', 'Composure', 'Passing accuracy'],
  tennis: ['First serve %', 'Backhand consistency', 'Net play', 'Footwork', 'Return of serve', 'Mental resilience', 'Drop shots', 'Court coverage', 'Topspin', 'Slice'],
}

function SportContent() {
  const searchParams = useSearchParams()
  const habitId = searchParams.get('habit_id')
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const sportName = searchParams.get('name') || 'Sport'
  const isTennis = sportName.toLowerCase().includes('tennis')
  const areas = isTennis ? WHAT_MISSING.tennis : WHAT_MISSING.football

  const [logs, setLogs] = useState<any[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => { load() }, [])

async function load() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/login'); return }
  
  const { data } = await supabase
    .from('sport_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_date', { ascending: false })
  
  setLogs(data || [])
  setLoading(false)
}


  const [performance, setPerformance] = useState(5)
  const [wentWell, setWentWell] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function toggleMissing(item: string) {
    setMissing(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  const perfLabel = performance <= 3 ? 'Poor' : performance <= 5 ? 'Average' : performance <= 7 ? 'Good' : performance <= 9 ? 'Great' : 'Outstanding'
  const perfColor = performance <= 3 ? 'text-red-400' : performance <= 5 ? 'text-yellow-400' : performance <= 7 ? 'text-green-400' : performance <= 9 ? 'text-blue-400' : 'text-purple-400'

  async function saveLog() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('sport_logs').insert({
      user_id: user!.id, sport: sportName, logged_date: date,
      performance, what_went_well: wentWell,
      what_was_missing: missing.join(', '), notes
    })
    if (habitId) {
      await supabase.from('habit_logs').insert({ habit_id: habitId, logged_date: date, user_id: user!.id, performance })
    }
    setSaving(false)
    router.push('/habits')
  }

  return (
    <PageContainer title="⚽ Sports" subtitle={`${logs?.length || 0} sessions`}>
      {/* JUST your content goes here — no wrapper divs, no manual header, no back button */}
   
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-10">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center gap-3 pt-8 pb-6">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">{isTennis ? '🎾' : '⚽'} {sportName}</h1>
            <p className="text-zinc-500 text-xs">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Performance rating */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Performance rating</p>
          <div className="flex items-end gap-4 mb-4">
            <span className="text-6xl font-bold">{performance}</span>
            <div className="mb-2">
              <span className={`text-lg font-semibold ${perfColor}`}>{perfLabel}</span>
              <p className="text-zinc-500 text-xs">out of 10</p>
            </div>
          </div>
          <input type="range" min="1" max="10" value={performance} onChange={e => setPerformance(Number(e.target.value))}
            className="w-full accent-purple-500 mb-3" />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>1</span><span>5</span><span>10</span>
          </div>
        </div>

        {/* What went well */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">What went well</p>
          <textarea value={wentWell} onChange={e => setWentWell(e.target.value)}
            placeholder="e.g. Great pressing, scored a goal, won key duels..."
            rows={3}
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 placeholder-zinc-600 resize-none" />
        </div>

        {/* What was missing */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">Areas to improve</p>
          <div className="flex flex-wrap gap-2">
            {areas.map(item => (
              <button key={item} onClick={() => toggleMissing(item)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${missing.includes(item) ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {missing.includes(item) ? '✗ ' : ''}{item}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-6">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">Additional notes</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Anything else about the session — opponent level, fatigue, conditions..."
            rows={3}
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 placeholder-zinc-600 resize-none" />
        </div>

        <button onClick={saveLog} disabled={saving}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50">
          {saving ? 'Saving...' : `${isTennis ? '🎾' : '⚽'} Save Session`}
        </button>
      </div>
    </div>
      </PageContainer>
  )
}

export default function SportPage() {
  return <Suspense><SportContent /></Suspense>
}