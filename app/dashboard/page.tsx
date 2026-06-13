'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Habit = { id: string; name: string; color: string; category: string; habit_type: string }
type Goal = { id: string; title: string; category: string; target_date: string; status: string }
type Readiness = { readiness_score: number; recommendation: string; sleep_hours: number; energy_level: number; stress_level: number }

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [weekData, setWeekData] = useState<{day:string;pct:number;date:string}[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showReadinessForm, setShowReadinessForm] = useState(false)
  const [sleepH, setSleepH] = useState(7)
  const [energyL, setEnergyL] = useState(3)
  const [stressL, setStressL] = useState(2)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  // particle bg
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const particles: any[] = []
    for (let i = 0; i < 80; i++) particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*1.5+0.2, dx: (Math.random()-.5)*.25, dy: (Math.random()-.5)*.25, o: Math.random()*.35+.05 })
    let id: number
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(139,92,246,${p.o})`; ctx.fill()
        p.x+=p.dx; p.y+=p.dy
        if(p.x<0||p.x>canvas.width) p.dx*=-1
        if(p.y<0||p.y>canvas.height) p.dy*=-1
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize',resize) }
  }, [])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const [{ data: habitsData }, { data: logsData }, { data: goalsData }, { data: readinessData }] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_logs').select('habit_id').eq('logged_date', today),
      supabase.from('goals').select('*').eq('status','active').order('created_at').limit(3),
      supabase.from('daily_readiness').select('*').eq('logged_date', today).single(),
    ])

    setHabits(habitsData || [])
    setLogs((logsData||[]).map((l:any)=>l.habit_id))
    setGoals(goalsData || [])
    if (readinessData) setReadiness(readinessData)

    // streaks
    const streakMap: Record<string,number> = {}
    for (const h of (habitsData||[])) {
      let s=0, d=new Date()
      while(true) {
        const ds=d.toISOString().slice(0,10)
        const {data} = await supabase.from('habit_logs').select('id').eq('habit_id',h.id).eq('logged_date',ds).single()
        if(data){s++;d.setDate(d.getDate()-1)}else break
      }
      streakMap[h.id]=s
    }
    setStreaks(streakMap)

    // week data
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const week=[]
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i)
      const ds=d.toISOString().slice(0,10)
      const {data:dl} = await supabase.from('habit_logs').select('habit_id').eq('logged_date',ds)
      const pct = habitsData&&habitsData.length>0 ? Math.round(((dl?.length||0)/habitsData.length)*100) : 0
      week.push({day:days[d.getDay()],pct,date:ds})
    }
    setWeekData(week)

    // generate insights
    generateInsights(habitsData||[], streakMap)
    setLoading(false)
  }

  function generateInsights(habitList: Habit[], streakMap: Record<string,number>) {
    const ins: string[] = []
    const byCategory: Record<string,number> = {}
    habitList.forEach(h => { byCategory[h.category] = (byCategory[h.category]||0)+1 })
    const topCat = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]
    if (topCat) ins.push(`Your strongest focus area is ${topCat[0]} with ${topCat[1]} habits`)
    const bestStreak = Object.entries(streakMap).sort((a,b)=>b[1]-a[1])[0]
    if (bestStreak && bestStreak[1]>2) {
      const h = habitList.find(x=>x.id===bestStreak[0])
      if (h) ins.push(`🔥 ${bestStreak[1]}-day streak on "${h.name}" — don't break it!`)
    }
    if (habitList.length > 0) ins.push(`You have ${habitList.length} active habits — consistency is building`)
    setInsights(ins)
  }

  async function saveReadiness() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const score = Math.round(((sleepH/8)*40) + ((energyL/5)*35) + ((1-stressL/5)*25))
    const rec = score>=80 ? "You're primed — push hard today 💪" : score>=60 ? "Good to go — train smart and stay consistent" : score>=40 ? "Take it moderate — focus on technique over intensity" : "Recovery day recommended — light activity or rest 🛌"
    const { data } = await supabase.from('daily_readiness').upsert({ user_id: user.id, logged_date: today, sleep_hours: sleepH, energy_level: energyL, stress_level: stressL, readiness_score: score, recommendation: rec }).select().single()
    if (data) setReadiness(data)
    setShowReadinessForm(false)
  }

  const completed = logs.length
  const total = habits.length
  const pct = total > 0 ? Math.round((completed/total)*100) : 0
  const bestStreak = Math.max(0, ...Object.values(streaks))
  const readinessScore = readiness?.readiness_score || 0
  const readinessColor = readinessScore>=80?'#10b981':readinessScore>=60?'#3b82f6':readinessScore>=40?'#f59e0b':'#ef4444'
  const readinessLabel = readinessScore>=80?'Peak':readinessScore>=60?'Good':readinessScore>=40?'Moderate':'Low'

  const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }
  const firstName = user?.email?.split('@')[0] || 'Athlete'

  const NAV = [
    { icon:'🏠', label:'Home', path:'/dashboard', active:true },
    { icon:'✅', label:'Habits', path:'/habits' },
    { icon:'🏋️', label:'Gym', path:'/gym-history' },
    { icon:'📊', label:'Stats', path:'/stats' },
    { icon:'🎯', label:'Goals', path:'/goals' },
     { icon: '⚙️', label: 'More', path: '/settings', activeMatch: ['/settings', '/notifications', '/leaderboard', '/weekly-review', '/rest-coach', '/export'] },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4"/>
        <p className="text-zinc-500 text-sm animate-pulse">Loading your performance data...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-28" style={{background:'linear-gradient(160deg,#07071a 0%,#0d0920 45%,#070d18 100%)'}}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{zIndex:0,opacity:.5}}/>
      <div className="fixed pointer-events-none" style={{top:'-15%',left:'-10%',width:'55vw',height:'55vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)',zIndex:0}}/>
      <div className="fixed pointer-events-none" style={{bottom:'-10%',right:'-10%',width:'45vw',height:'45vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)',zIndex:0}}/>

      <div className="relative max-w-lg mx-auto px-4" style={{zIndex:1}}>

        {/* Header */}
        <div className="pt-10 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-400/60 text-xs tracking-widest uppercase">{greeting()}</p>
              <h1 className="text-2xl font-black text-white mt-0.5">{firstName} <span className="text-purple-400">↗</span></h1>
              <p className="text-zinc-500 text-sm mt-1">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
            </div>
            <button onClick={()=>router.push('/profile')} className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold" style={{background:'linear-gradient(135deg,#7C3AED,#4f46e5)',boxShadow:'0 4px 20px rgba(124,58,237,0.4)'}}>
              {firstName[0]?.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Readiness card */}
        <div className="rounded-3xl p-5 mb-4 relative overflow-hidden" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',backdropFilter:'blur(20px)'}}>
          <div className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse at top right, ${readinessColor}18 0%, transparent 60%)`}}/>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-400 text-xs uppercase tracking-widest">Daily Readiness</p>
              {!readiness && <button onClick={()=>setShowReadinessForm(true)} className="text-xs px-3 py-1.5 rounded-xl font-medium" style={{background:'rgba(124,58,237,0.2)',color:'#a78bfa',border:'1px solid rgba(124,58,237,0.3)'}}>Check in →</button>}
            </div>
            {readiness ? (
              <div>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-6xl font-black" style={{color:readinessColor}}>{readinessScore}</span>
                  <div className="mb-2">
                    <span className="text-lg font-bold text-white">{readinessLabel}</span>
                    <p className="text-zinc-500 text-xs">readiness score</p>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${readinessScore}%`,background:`linear-gradient(90deg,${readinessColor}88,${readinessColor})`}}/>
                </div>
                <p className="text-sm text-zinc-300 italic">"{readiness.recommendation}"</p>
                <div className="flex gap-4 mt-3">
                  {[{label:'Sleep',val:`${readiness.sleep_hours}h`,icon:'😴'},{label:'Energy',val:`${readiness.energy_level}/5`,icon:'⚡'},{label:'Stress',val:`${readiness.stress_level}/5`,icon:'🧠'}].map(s=>(
                    <div key={s.label} className="text-center">
                      <p className="text-base">{s.icon}</p>
                      <p className="text-white text-xs font-semibold">{s.val}</p>
                      <p className="text-zinc-600 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-4xl mb-2">🌅</p>
                <p className="text-white font-semibold text-sm">How are you feeling today?</p>
                <p className="text-zinc-500 text-xs mt-1">Log sleep, energy & stress to get your readiness score</p>
              </div>
            )}
          </div>
        </div>

        {/* Readiness form */}
        {showReadinessForm && (
          <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>
            <p className="text-white font-semibold mb-4">Morning Check-in</p>
            <div className="mb-4">
              <div className="flex justify-between mb-1"><span className="text-zinc-400 text-xs">Sleep hours</span><span className="text-white text-xs font-bold">{sleepH}h</span></div>
              <input type="range" min="3" max="12" step="0.5" value={sleepH} onChange={e=>setSleepH(+e.target.value)} className="w-full" style={{accentColor:'#7C3AED'}}/>
              <div className="flex justify-between text-xs text-zinc-700 mt-1"><span>3h</span><span>8h</span><span>12h</span></div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-1"><span className="text-zinc-400 text-xs">Energy level</span><span className="text-white text-xs font-bold">{['🪫','😴','😐','💪','⚡','🔥'][energyL]}</span></div>
              <input type="range" min="1" max="5" value={energyL} onChange={e=>setEnergyL(+e.target.value)} className="w-full" style={{accentColor:'#10b981'}}/>
            </div>
            <div className="mb-5">
              <div className="flex justify-between mb-1"><span className="text-zinc-400 text-xs">Stress level</span><span className="text-white text-xs font-bold">{['😌','🙂','😐','😤','😰','🤯'][stressL]}</span></div>
              <input type="range" min="1" max="5" value={stressL} onChange={e=>setStressL(+e.target.value)} className="w-full" style={{accentColor:'#ef4444'}}/>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowReadinessForm(false)} className="flex-1 py-3 rounded-2xl text-sm text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Cancel</button>
              <button onClick={saveReadiness} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#4f46e5)'}}>Get my score</button>
            </div>
          </div>
        )}

        {/* Today progress */}
        <div className="rounded-3xl p-5 mb-4 relative overflow-hidden" style={{background: pct>=70?'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(52,211,153,0.08))':'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(245,158,11,0.07))', border: pct>=70?'1px solid rgba(124,58,237,0.25)':'1px solid rgba(239,68,68,0.2)'}}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Today's Habits</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white">{pct}%</span>
                <span className={`text-sm font-semibold mb-1 ${pct>=70?'text-emerald-400':'text-orange-400'}`}>{pct>=70?'On track':'Below 70%'}</span>
              </div>
            </div>
            <div className="text-3xl">{pct>=100?'🏆':pct>=70?'🔥':pct>=40?'💪':'😤'}</div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" style={{width:`${pct}%`,background:pct>=70?'linear-gradient(90deg,#7C3AED,#34d399)':'linear-gradient(90deg,#D85A30,#f59e0b)'}}>
              <div className="absolute inset-0 bg-white/10"/>
            </div>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>{completed}/{total} done</span>
            <span>│ 70% min target</span>
            <button onClick={()=>router.push('/habits')} className="text-purple-400">View all →</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {label:'Best Streak',val:`${bestStreak}🔥`,bg:'rgba(251,191,36,0.1)',border:'rgba(251,191,36,0.2)'},
            {label:'Active Habits',val:String(total),bg:'rgba(124,58,237,0.1)',border:'rgba(124,58,237,0.2)'},
            {label:'Active Goals',val:String(goals.length),bg:'rgba(52,211,153,0.1)',border:'rgba(52,211,153,0.2)'},
          ].map((s,i)=>(
            <div key={i} className="rounded-2xl p-3 text-center" style={{background:s.bg,border:`1px solid ${s.border}`}}>
              <p className="text-xl font-bold text-white">{s.val}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Week chart */}
        <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-xs uppercase tracking-widest">This Week</p>
            <span className="text-zinc-600 text-xs">{weekData.length>0?Math.round(weekData.reduce((a,b)=>a+b.pct,0)/weekData.length):0}% avg</span>
          </div>
          <div className="flex items-end gap-2" style={{height:'80px'}}>
            {weekData.map((d,i)=>{
              const isToday = d.date===today
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-xl transition-all relative overflow-hidden" style={{height:`${Math.max(6,d.pct*0.72)}px`,background:isToday?(d.pct>=70?'linear-gradient(180deg,#7C3AED,#34d399)':'linear-gradient(180deg,#D85A30,#f59e0b)'):(d.pct>=70?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.08)')}}>
                    {isToday && <div className="absolute inset-0 bg-white/15"/>}
                  </div>
                  <span className={`text-xs ${isToday?'text-purple-400 font-bold':'text-zinc-600'}`}>{d.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="rounded-3xl p-5 mb-4" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.05))',border:'1px solid rgba(124,58,237,0.2)'}}>
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">⚡ Insights</p>
            <div className="flex flex-col gap-2">
              {insights.map((ins,i)=>(
                <div key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 text-xs mt-0.5">◆</span>
                  <p className="text-zinc-300 text-sm">{ins}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active goals */}
        {goals.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs uppercase tracking-widest">Active Goals</p>
              <button onClick={()=>router.push('/goals')} className="text-purple-400 text-xs">See all →</button>
            </div>
            <div className="flex flex-col gap-2">
              {goals.map(g=>(
                <div key={g.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:'#7C3AED',boxShadow:'0 0 6px #7C3AED'}}/>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{g.title}</p>
                    {g.target_date && <p className="text-zinc-600 text-xs mt-0.5">Target: {new Date(g.target_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg capitalize" style={{background:'rgba(124,58,237,0.15)',color:'#a78bfa'}}>{g.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {icon:'✅',label:'Log Habits',sub:'Check off today',path:'/habits',color:'#7C3AED'},
              {icon:'🎯',label:'My Goals',sub:'Track progress',path:'/goals',color:'#10b981'},
              {icon:'📏',label:'Body Metrics',sub:'Log measurements',path:'/body',color:'#3b82f6'},
              {icon:'📋',label:'Weekly Review',sub:'See your report',path:'/weekly-review',color:'#f59e0b'},
            ].map(a=>(
              <button key={a.path} onClick={()=>router.push(a.path)} className="p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <span className="text-2xl block mb-2">{a.icon}</span>
                <p className="text-white text-sm font-semibold">{a.label}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{a.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-2" style={{zIndex:50}}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-around rounded-3xl px-2 py-3" style={{background:'rgba(10,8,25,0.92)',border:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',boxShadow:'0 -8px 32px rgba(0,0,0,0.4)'}}>
            {NAV.map(n=>(
              <button key={n.path} onClick={()=>router.push(n.path)} className="flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all" style={n.active?{background:'rgba(124,58,237,0.2)'}:{}}>
                <span className="text-xl">{n.icon}</span>
                <span className="text-xs font-medium" style={{color:n.active?'#a78bfa':'rgba(255,255,255,0.3)'}}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}