'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type Advice = { type: 'insight' | 'warning' | 'encouragement' | 'suggestion'; text: string; emoji: string }

export default function AiCoachPage() {
  const [advice, setAdvice] = useState<Advice[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [stats, setStats] = useState({
    weekVolume: 0,
    prevVolume: 0,
    completionRate: 0,
    currentStreak: 0,
    readinessAvg: 0,
    gymSessions: 0,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

    // Get this week's gym volume
    const { data: thisWeekWorkouts } = await supabase
      .from('workout_logs')
      .select('exercises')
      .eq('user_id', user.id)
      .gte('logged_date', weekAgo.toISOString().slice(0, 10))

    const weekVolume = (thisWeekWorkouts || []).reduce((total: number, w: any) => {
      return total + (w.exercises || []).reduce((sum: number, e: any) => {
        return sum + (e.sets || []).reduce((s: number, set: any) => s + ((+set.weight || 0) * (+set.reps || 0)), 0)
      }, 0)
    }, 0)

    // Get previous week's volume
    const { data: prevWeekWorkouts } = await supabase
      .from('workout_logs')
      .select('exercises')
      .eq('user_id', user.id)
      .gte('logged_date', twoWeeksAgo.toISOString().slice(0, 10))
      .lt('logged_date', weekAgo.toISOString().slice(0, 10))

    const prevVolume = (prevWeekWorkouts || []).reduce((total: number, w: any) => {
      return total + (w.exercises || []).reduce((sum: number, e: any) => {
        return sum + (e.sets || []).reduce((s: number, set: any) => s + ((+set.weight || 0) * (+set.reps || 0)), 0)
      }, 0)
    }, 0)

    // Get habit completion
    const { data: habits } = await supabase.from('habits').select('id').eq('user_id', user.id)
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_date', weekAgo.toISOString().slice(0, 10))

    const completionRate = habits && habits.length > 0 
      ? Math.round((logs?.length || 0) / (habits.length * 7) * 100)
      : 0

    // Get readiness
    const { data: readiness } = await supabase
      .from('daily_readiness')
      .select('readiness_score')
      .eq('user_id', user.id)
      .gte('logged_date', weekAgo.toISOString().slice(0, 10))

    const readinessAvg = readiness && readiness.length > 0
      ? Math.round(readiness.reduce((a: number, r: any) => a + (r.readiness_score || 0), 0) / readiness.length)
      : 0

    // Get current streak
    let currentStreak = 0
    const today2 = new Date()
    for (let i = 0; i < 365; i++) {
      const date = new Date(today2.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      const dayLogs = logs?.filter(l => l.logged_date === dateStr) || []
      if (dayLogs.length > 0) {
        currentStreak++
      } else {
        break
      }
    }

    const newStats = {
      weekVolume,
      prevVolume,
      completionRate,
      currentStreak,
      readinessAvg,
      gymSessions: thisWeekWorkouts?.length || 0,
    }

    setStats(newStats)
    await generateAdvice(newStats, user.id)
    setLoading(false)
  }

  async function generateAdvice(stats: any, userId: string) {
    setAnalyzing(true)

    const prompt = `You are a personal fitness coach analyzing someone's weekly performance. Give them 4-5 specific, actionable pieces of advice based on this data:

- This week's gym volume: ${stats.weekVolume}kg
- Previous week's volume: ${stats.prevVolume}kg
- Habit completion rate: ${stats.completionRate}%
- Current streak: ${stats.currentStreak} days
- Average readiness (sleep/energy): ${stats.readinessAvg}/100
- Gym sessions this week: ${stats.gymSessions}

For EACH piece of advice, respond in this EXACT JSON format with NO other text:
{"type":"insight|warning|encouragement|suggestion","text":"specific advice here","emoji":"one emoji"}

Examples of good advice:
- "Your volume increased 12% this week! Push harder next week while readiness is high."
- "Readiness is low (${stats.readinessAvg}/100) - focus on recovery before adding weight."
- "You've got a ${stats.currentStreak}d streak! Don't break it - log your habits daily."

Give honest, specific feedback. Be encouraging but direct.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const content = data.content[0]?.text || ''

      // Parse JSON responses
      const adviceList: Advice[] = []
      const lines = content.split('\n').filter((l: string) => l.trim().startsWith('{'))
      
      lines.forEach((line: string) => {
        try {
          const parsed = JSON.parse(line)
          adviceList.push(parsed)
        } catch (e) {
          // Skip invalid JSON
        }
      })

      if (adviceList.length > 0) {
        setAdvice(adviceList)
      } else {
        // Fallback if API returns invalid JSON
        setAdvice([
          { type: 'encouragement', text: `You're at a ${stats.completionRate}% completion rate this week. Keep pushing!`, emoji: '💪' },
          { type: 'insight', text: `Your readiness is ${stats.readinessAvg}/100 - make sure you're getting quality sleep.`, emoji: '😴' },
        ])
      }
    } catch (error) {
      console.error('Coach error:', error)
      setAdvice([
        { type: 'encouragement', text: 'You\'re doing great! Keep up the consistency.', emoji: '🔥' },
      ])
    }

    setAnalyzing(false)
  }

  if (loading) return <PageContainer title="🤖 AI Coach" subtitle="Your personal trainer"><div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto"/></div></PageContainer>

  return (
    <PageContainer title="🤖 AI Coach" subtitle="Personalized guidance">
      {/* Weekly stats overview */}
      <div className="rounded-3xl p-5 mb-6" style={{background:'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(79,70,229,0.08))',border:'1px solid rgba(139,92,246,0.2)'}}>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">This week</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Volume', val: `${Math.round(stats.weekVolume)}kg`, icon: '🏋️' },
            { label: 'Change', val: stats.prevVolume > 0 ? `${Math.round(((stats.weekVolume - stats.prevVolume) / stats.prevVolume) * 100)}%` : '—', icon: '📈', color: stats.weekVolume > stats.prevVolume ? '#10b981' : '#ef4444' },
            { label: 'Completion', val: `${stats.completionRate}%`, icon: '✅' },
            { label: 'Streak', val: `${stats.currentStreak}d`, icon: '🔥' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="font-bold text-white text-sm">{s.val}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coach advice */}
      <div className="mb-5">
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">Coach analysis</p>
        
        {analyzing && (
          <div className="text-center py-8 text-zinc-500">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-2"/>
            <p className="text-sm">Analyzing your performance...</p>
          </div>
        )}

        {!analyzing && advice.length > 0 && (
          <div className="flex flex-col gap-3">
            {advice.map((item, i) => {
              const bgColor = 
                item.type === 'warning' ? 'rgba(239,68,68,0.08)' :
                item.type === 'encouragement' ? 'rgba(16,185,129,0.08)' :
                item.type === 'suggestion' ? 'rgba(59,130,246,0.08)' :
                'rgba(124,58,237,0.08)'
              
              const borderColor = 
                item.type === 'warning' ? 'rgba(239,68,68,0.2)' :
                item.type === 'encouragement' ? 'rgba(16,185,129,0.2)' :
                item.type === 'suggestion' ? 'rgba(59,130,246,0.2)' :
                'rgba(124,58,237,0.2)'

              return (
                <div key={i} className="rounded-2xl p-4" style={{background:bgColor,border:`1px solid ${borderColor}`}}>
                  <div className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                    <p className="text-white text-sm leading-relaxed">{item.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Refresh button */}
      <button 
        onClick={() => load()}
        disabled={analyzing}
        className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#8b5cf6,#7C3AED)',boxShadow:'0 6px 24px rgba(139,92,246,0.3)'}}
      >
        {analyzing ? 'Analyzing...' : '🔄 Get New Analysis'}
      </button>

      {/* Tips */}
      <div className="rounded-3xl p-5 mt-6" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
        <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">💡 Coach tips</p>
        <div className="flex flex-col gap-2 text-sm text-zinc-300">
          <p>✓ Log your workouts daily — the coach analyzes trends</p>
          <p>✓ Track your readiness (sleep, energy, stress)</p>
          <p>✓ Check back weekly for fresh insights</p>
        </div>
      </div>
    </PageContainer>
  )
}