'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type Habit = { id: string; name: string; category: string }

export default function WeeklyReviewPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitRates, setHabitRates] = useState<{habit:Habit;rate:number;streak:number}[]>([])
  const [weekPct, setWeekPct] = useState(0)
  const [bestHabit, setBestHabit] = useState<string|null>(null)
  const [worstHabit, setWorstHabit] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [sportInsights, setSportInsights] = useState<string[]>([])
  const [gymInsights, setGymInsights] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()
  const startDate = new Date()
startDate.setDate(startDate.getDate() - startDate.getDay())

  const weekStart = (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10) })()
  const weekEnd = new Date().toISOString().slice(0,10)

  useEffect(()=>{load()},[])

  async function load() {
    const {data:{user}} = await supabase.auth.getUser()
    if(!user){router.push('/login');return}

    const {data:habitsData} = await supabase.from('habits').select('*')
    setHabits(habitsData||[])

    // per-habit rates this week
    const rates = []
    let totalDone=0, totalPossible=0
    for(const h of (habitsData||[])) {
      let done=0
      for(let i=0;i<7;i++){
        const d=new Date(); d.setDate(d.getDate()-d.getDay()+i)
        if(d>new Date()) break
        const ds=d.toISOString().slice(0,10)
        const {data} = await supabase.from('habit_logs').select('id').eq('habit_id',h.id).eq('logged_date',ds).single()
        if(data) done++
        totalPossible++
      }
      totalDone+=done
      // streak
      let streak=0, d2=new Date()
      while(true){
        const ds=d2.toISOString().slice(0,10)
        const {data} = await supabase.from('habit_logs').select('id').eq('habit_id',h.id).eq('logged_date',ds).single()
        if(data){streak++;d2.setDate(d2.getDate()-1)}else break
      }
      rates.push({habit:h, rate:Math.round((done/7)*100), streak})
    }
    setHabitRates(rates)
    setWeekPct(totalPossible>0?Math.round((totalDone/totalPossible)*100):0)
    const sorted=[...rates].sort((a,b)=>b.rate-a.rate)
    if(sorted.length>0) setBestHabit(sorted[0].habit.name)
    if(sorted.length>1) setWorstHabit(sorted[sorted.length-1].habit.name)

    // sport insights from this week
    const {data:sportLogs} = await supabase.from('sport_logs').select('*').gte('logged_date',weekStart).lte('logged_date',weekEnd)
    if(sportLogs&&sportLogs.length>0) {
      const avgPerf = Math.round(sportLogs.reduce((a:number,b:any)=>a+b.performance,0)/sportLogs.length)
      const allMissing = sportLogs.flatMap((l:any)=>l.what_was_missing?l.what_was_missing.split(', '):[])
      const freqMissing: Record<string,number>={}
      allMissing.forEach((m:string)=>{if(m) freqMissing[m]=(freqMissing[m]||0)+1})
      const topMissing = Object.entries(freqMissing).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0])
      const ins = [`Average performance this week: ${avgPerf}/10`]
      if(topMissing.length>0) ins.push(`Most common weakness: ${topMissing.join(', ')} — focus here next week`)
      if(avgPerf>=7) ins.push('Strong week on the pitch — keep the momentum')
      else ins.push('Below your best — review your preparation and recovery')
      setSportInsights(ins)
    }

    // gym insights
    const {data:gymLogs} = await supabase.from('workout_logs').select('*').gte('logged_date',weekStart).lte('logged_date',weekEnd)
    const {data:prs} = await supabase.from('personal_records').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5)
    if(gymLogs&&gymLogs.length>0) {
      const ins2 = [`${gymLogs.length} gym session${gymLogs.length>1?'s':''} this week`]
      if(prs&&prs.length>0) ins2.push(`Latest PR: ${prs[0].exercise} — ${prs[0].weight_kg}kg × ${prs[0].reps} reps`)
      setGymInsights(ins2)
    }

    setLoading(false)
  }

  const weekScore = weekPct>=80?'Exceptional':weekPct>=60?'Solid':weekPct>=40?'Average':'Needs work'
  const weekColor = weekPct>=80?'#10b981':weekPct>=60?'#3b82f6':weekPct>=40?'#f59e0b':'#ef4444'
  const catBreakdown: Record<string,{total:number;done:number}> = {}
  habitRates.forEach(r=>{
    if(!catBreakdown[r.habit.category]) catBreakdown[r.habit.category]={total:0,done:0}
    catBreakdown[r.habit.category].total++
    catBreakdown[r.habit.category].done += r.rate/100
  })

  if(loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/></div>

  return (
     <PageContainer title="📋 Weekly Review" subtitle={`Week of ${startDate.toLocaleDateString()}`}>
      {/* JUST your content goes here — no wrapper divs, no manual header, no back button */}
   
    <div className="min-h-screen pb-10" style={{background:'linear-gradient(160deg,#07071a 0%,#0d0920 50%,#070d18 100%)'}}>
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center gap-3 pt-8 pb-5">
          <button onClick={()=>router.push('/dashboard')} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">📋 Weekly Review</h1>
            <p className="text-zinc-500 text-xs">{new Date(weekStart+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} — {new Date(weekEnd+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
          </div>
        </div>

        {/* Big score */}
        <div className="rounded-3xl p-6 mb-4 text-center relative overflow-hidden" style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${weekColor}33`}}>
          <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at center, ${weekColor}12 0%, transparent 70%)`}}/>
          <div className="relative">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">This Week's Score</p>
            <div className="text-7xl font-black mb-1" style={{color:weekColor}}>{weekPct}%</div>
            <p className="text-white font-bold text-lg">{weekScore}</p>
            <p className="text-zinc-500 text-sm mt-1">overall habit completion</p>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {bestHabit && (
            <div className="rounded-2xl p-4" style={{background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)'}}>
              <p className="text-emerald-400 text-xs uppercase tracking-widest mb-2">🏆 Best habit</p>
              <p className="text-white text-sm font-semibold">{bestHabit}</p>
              <p className="text-emerald-400/70 text-xs mt-1">{habitRates.find(r=>r.habit.name===bestHabit)?.rate}% this week</p>
            </div>
          )}
          {worstHabit && (
            <div className="rounded-2xl p-4" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}>
              <p className="text-red-400 text-xs uppercase tracking-widest mb-2">⚠️ Needs focus</p>
              <p className="text-white text-sm font-semibold">{worstHabit}</p>
              <p className="text-red-400/70 text-xs mt-1">{habitRates.find(r=>r.habit.name===worstHabit)?.rate}% this week</p>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        {Object.keys(catBreakdown).length>0 && (
          <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Category breakdown</p>
            {Object.entries(catBreakdown).map(([cat,data])=>{
              const pct2 = Math.round((data.done/data.total)*100)
              return (
                <div key={cat} className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 capitalize">{cat}</span>
                    <span className={pct2>=70?'text-emerald-400':pct2>=40?'text-yellow-400':'text-red-400'}>{pct2}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full" style={{width:`${pct2}%`,background:pct2>=70?'#10b981':pct2>=40?'#f59e0b':'#ef4444'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Per habit rates */}
        <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Habit by habit</p>
          <div className="flex flex-col gap-3">
            {habitRates.sort((a,b)=>b.rate-a.rate).map(r=>(
              <div key={r.habit.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white">{r.habit.name}</p>
                    {r.streak>2 && <span className="text-xs text-amber-400">🔥{r.streak}</span>}
                  </div>
                  <span className={`text-sm font-bold ${r.rate>=70?'text-emerald-400':r.rate>=40?'text-yellow-400':'text-red-400'}`}>{r.rate}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${r.rate}%`,background:r.rate>=70?'#10b981':r.rate>=40?'#f59e0b':'#ef4444'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sport insights */}
        {sportInsights.length>0 && (
          <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.2)'}}>
            <p className="text-emerald-400 text-xs uppercase tracking-widest mb-3">⚽ Sport Performance</p>
            {sportInsights.map((ins,i)=>(
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-emerald-500 text-xs mt-0.5">◆</span>
                <p className="text-zinc-300 text-sm">{ins}</p>
              </div>
            ))}
          </div>
        )}

        {/* Gym insights */}
        {gymInsights.length>0 && (
          <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)'}}>
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-3">🏋️ Gym Performance</p>
            {gymInsights.map((ins,i)=>(
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-amber-500 text-xs mt-0.5">◆</span>
                <p className="text-zinc-300 text-sm">{ins}</p>
              </div>
            ))}
          </div>
        )}

        {/* Next week focus */}
        <div className="rounded-3xl p-5" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(79,70,229,0.08))',border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-purple-400 text-xs uppercase tracking-widest mb-3">🎯 Focus for next week</p>
          {worstHabit && <p className="text-white text-sm mb-2">• Prioritise <span className="text-purple-300 font-semibold">"{worstHabit}"</span> — it's your biggest gap</p>}
          {weekPct < 70 && <p className="text-white text-sm mb-2">• Hit 70% minimum daily — that's the baseline</p>}
          {weekPct >= 70 && <p className="text-white text-sm mb-2">• You hit target — now aim for {Math.min(100,weekPct+10)}% next week</p>}
          {sportInsights.length>0 && <p className="text-white text-sm">• Work on the areas flagged in your sport sessions</p>}
        </div>
      </div>
    </div>
      </PageContainer>
  )
}