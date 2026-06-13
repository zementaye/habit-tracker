'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageContainer } from '../../components/navigation'

type PR = { id:string; exercise:string; weight_kg:number; reps:number; logged_date:string; rpe:number; notes:string }
type WorkoutLog = { id:string; logged_date:string; exercises:any[] }

export default function GymHistoryPage() {
  const [prs, setPrs] = useState<PR[]>([])
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'history'|'prs'|'volume'>('history')
  const [expandedWorkout, setExpandedWorkout] = useState<string|null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(()=>{load()},[])

  async function load() {
    const {data:{user}} = await supabase.auth.getUser()
    if(!user){router.push('/login');return}
    const [{data:prData},{data:wData}] = await Promise.all([
      supabase.from('personal_records').select('*').order('logged_date',{ascending:false}),
      supabase.from('workout_logs').select('*').order('logged_date',{ascending:false}).limit(20),
    ])
    setPrs(prData||[])
    setWorkouts(wData||[])
    setLoading(false)
  }

  const bestPRs: Record<string,PR> = {}
  prs.forEach(pr => {
    if(!bestPRs[pr.exercise] || (pr.weight_kg > bestPRs[pr.exercise].weight_kg)) {
      bestPRs[pr.exercise] = pr
    }
  })

  const volumeByMuscle: Record<string,number> = {}
  workouts.slice(0,7).forEach(w => {
    (w.exercises||[]).forEach((ex:any) => {
      const totalVol = (ex.sets||[]).reduce((a:number,s:any)=>{
        return a + ((+s.weight||0) * (+s.reps||0))
      },0)
      volumeByMuscle[ex.name] = (volumeByMuscle[ex.name]||0) + totalVol
    })
  })

  const totalWorkouts = workouts.length
  const totalPRs = Object.keys(bestPRs).length
  const lastWorkout = workouts[0]

  if(loading) return <PageContainer title="🏋️ Gym Tracker" subtitle={`${totalWorkouts} sessions`}><div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto"/></div></PageContainer>

  return (
    <PageContainer title="🏋️ Gym Tracker" subtitle={`${totalWorkouts} sessions · ${totalPRs} PRs`}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:'Sessions',val:String(totalWorkouts),color:'#f97316'},
          {label:'PRs set',val:String(totalPRs),color:'#eab308'},
          {label:'This week',val:String(workouts.filter(w=>new Date(w.logged_date)>=new Date(Date.now()-7*86400000)).length),color:'#10b981'},
        ].map((s,i)=>(
          <div key={i} className="rounded-2xl p-3 text-center" style={{background:`${s.color}12`,border:`1px solid ${s.color}30`}}>
            <p className="text-xl font-bold" style={{color:s.color}}>{s.val}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['history','prs','volume'] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all" style={activeTab===t?{background:'linear-gradient(135deg,#f97316,#dc2626)',color:'white'}:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
            {t==='prs'?'Personal Records':t==='volume'?'Volume':t}
          </button>
        ))}
      </div>

      {/* History tab */}
      {activeTab==='history' && (
        <div className="flex flex-col gap-3">
          {workouts.length===0 && (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-5xl mb-4">🏋️</p>
              <p className="text-sm text-white font-semibold mb-1">No sessions yet</p>
              <p className="text-xs">Log your first gym session from the habits page</p>
            </div>
          )}
          {workouts.map(w=>{
            const expanded = expandedWorkout===w.id
            const totalSets = (w.exercises||[]).reduce((a:number,e:any)=>a+(e.sets?.length||0),0)
            const totalVol = (w.exercises||[]).reduce((a:number,e:any)=>a+(e.sets||[]).reduce((b:number,s:any)=>b+(+s.weight||0)*(+s.reps||0),0),0)
            return (
              <div key={w.id} className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <button className="w-full p-4 text-left" onClick={()=>setExpandedWorkout(expanded?null:w.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">{new Date(w.logged_date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-zinc-500 text-xs">{w.exercises?.length||0} exercises</span>
                        <span className="text-zinc-500 text-xs">{totalSets} sets</span>
                        {totalVol>0 && <span className="text-orange-400/70 text-xs">{Math.round(totalVol)}kg vol</span>}
                      </div>
                    </div>
                    <span className="text-zinc-600 text-lg">{expanded?'↑':'↓'}</span>
                  </div>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 border-t border-white/5">
                    {(w.exercises||[]).map((ex:any,i:number)=>(
                      <div key={i} className="mt-3">
                        <p className="text-white text-xs font-semibold mb-2">{ex.name}</p>
                        <div className="grid grid-cols-3 gap-1 text-xs text-zinc-600 mb-1 px-1"><span>Set</span><span>Weight</span><span>Reps</span></div>
                        {(ex.sets||[]).map((s:any,j:number)=>(
                          <div key={j} className="grid grid-cols-3 gap-1 text-xs mb-1">
                            <span className="text-zinc-600 pl-1">{j+1}</span>
                            <span className="text-white">{s.weight||0}kg</span>
                            <span className="text-white">{s.reps||0}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PRs tab */}
      {activeTab==='prs' && (
        <div className="flex flex-col gap-3">
          {Object.keys(bestPRs).length===0 && (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-5xl mb-4">🏆</p>
              <p className="text-sm text-white font-semibold mb-1">No PRs yet</p>
              <p className="text-xs">PRs are automatically tracked as you log sessions</p>
            </div>
          )}
          {Object.entries(bestPRs).sort((a,b)=>b[1].weight_kg-a[1].weight_kg).map(([exercise,pr])=>{
            const history = prs.filter(p=>p.exercise===exercise).sort((a,b)=>new Date(a.logged_date).getTime()-new Date(b.logged_date).getTime())
            const first = history[0]
            const improvement = first && pr.weight_kg > first.weight_kg ? +(pr.weight_kg - first.weight_kg).toFixed(1) : null
            return (
              <div key={exercise} className="p-4 rounded-2xl" style={{background:'rgba(234,179,8,0.06)',border:'1px solid rgba(234,179,8,0.2)'}}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{exercise}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{new Date(pr.logged_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-black text-lg">{pr.weight_kg}kg</p>
                    <p className="text-zinc-500 text-xs">× {pr.reps} reps</p>
                  </div>
                </div>
                {improvement && (
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <span>↑</span><span>+{improvement}kg improvement since first log</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Volume tab */}
      {activeTab==='volume' && (
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Volume by exercise (last 7 sessions)</p>
          {Object.keys(volumeByMuscle).length===0 && (
            <div className="text-center py-16 text-zinc-600 text-sm">No volume data yet</div>
          )}
          <div className="flex flex-col gap-3">
            {Object.entries(volumeByMuscle).sort((a,b)=>b[1]-a[1]).map(([ex,vol])=>{
              const maxVol = Math.max(...Object.values(volumeByMuscle))
              const pct = Math.round((vol/maxVol)*100)
              return (
                <div key={ex}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300">{ex}</span>
                    <span className="text-orange-400 font-semibold">{Math.round(vol).toLocaleString()}kg</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:'linear-gradient(90deg,#f97316,#dc2626)'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </PageContainer>
  )
}