'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'


type Routine = { id: string; name: string }
type Task = { id: string; task_name: string; scheduled_time: string }
type Completion = { id: string; task_id: string; completed: boolean; completed_date: string }

export default function RoutineAnalyticsPage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [allCompletions, setAllCompletions] = useState<Completion[]>([])
  const [taskStats, setTaskStats] = useState<Record<string, {name:string;completed:number;total:number}>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(30)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [selectedDays])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: routineData } = await supabase.from('daily_routines').select('*').eq('user_id', user.id)
    setRoutines(routineData || [])

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays)
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10)

    const { data: completionData } = await supabase.from('routine_completions').select('*').eq('user_id', user.id).gte('completed_date', cutoffDateStr)
    setAllCompletions(completionData || [])

    // Calculate stats per task
    const stats: Record<string, {name:string;completed:number;total:number}> = {}
    
    for (const routine of (routineData || [])) {
      const { data: taskData } = await supabase.from('routine_tasks').select('*').eq('routine_id', routine.id)
      for (const task of (taskData || [])) {
        const taskCompletions = (completionData || []).filter(c => c.task_id === task.id)
        const completed = taskCompletions.filter(c => c.completed).length
        stats[task.id] = {
          name: task.task_name,
          completed,
          total: taskCompletions.length || 1,
        }
      }
    }
    setTaskStats(stats)
    setLoading(false)
  }

  const overallRate = Object.values(taskStats).length > 0
    ? Math.round(Object.values(taskStats).reduce((a, s) => a + (s.completed / s.total), 0) / Object.values(taskStats).length * 100)
    : 0

  const bestTask = Object.entries(taskStats).sort((a, b) => (b[1].completed / b[1].total) - (a[1].completed / a[1].total))[0]
  const worstTask = Object.entries(taskStats).sort((a, b) => (a[1].completed / a[1].total) - (b[1].completed / b[1].total))[0]

  const dailyData: Record<string, number> = {}
  allCompletions.forEach(c => {
    dailyData[c.completed_date] = (dailyData[c.completed_date] || 0) + (c.completed ? 1 : 0)
  })

  const dailyAvg = Object.keys(dailyData).length > 0 ? Math.round(Object.values(dailyData).reduce((a, b) => a + b) / Object.keys(dailyData).length) : 0

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/></div>

  return (
    <PageContainer title="📊 Routine Analytics" subtitle={`Last ${selectedDays} days`}>
      {/* JUST your content goes here — no wrapper divs, no manual header, no back button */}
  

        {/* Time range selector */}
        <div className="flex gap-2 mb-5">
          {[7, 30, 90].map(days => (
            <button key={days} onClick={() => setSelectedDays(days)} className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all" style={selectedDays === days
              ? {background:'linear-gradient(135deg,#7C3AED,#4f46e5)',color:'white'}
              : {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
              {days}d
            </button>
          ))}
        </div>

        {/* Overall stats */}
        <div className="rounded-3xl p-5 mb-5" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.08))',border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Overall Completion Rate</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-6xl font-black text-white">{overallRate}%</span>
            <div className="mb-2">
              <p className="text-lg font-bold" style={{color:overallRate>=80?'#10b981':overallRate>=60?'#f59e0b':'#ef4444'}}>{overallRate>=80?'Excellent':overallRate>=60?'Good':'Needs work'}</p>
              <p className="text-zinc-500 text-xs">last {selectedDays} days</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full" style={{width:`${overallRate}%`,background:'linear-gradient(90deg,#7C3AED,#34d399)'}}/>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {bestTask && (
            <div className="rounded-2xl p-4" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
              <p className="text-emerald-400 text-xs uppercase tracking-widest mb-2">🏆 Best task</p>
              <p className="text-white text-sm font-semibold">{bestTask[1].name}</p>
              <p className="text-emerald-400/70 text-xs mt-1">{Math.round((bestTask[1].completed/bestTask[1].total)*100)}% done</p>
            </div>
          )}
          {worstTask && (
            <div className="rounded-2xl p-4" style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}>
              <p className="text-red-400 text-xs uppercase tracking-widest mb-2">⚠️ Needs work</p>
              <p className="text-white text-sm font-semibold">{worstTask[1].name}</p>
              <p className="text-red-400/70 text-xs mt-1">{Math.round((worstTask[1].completed/worstTask[1].total)*100)}% done</p>
            </div>
          )}
        </div>

        {/* Per-task stats */}
        {Object.values(taskStats).length > 0 && (
          <div className="rounded-3xl p-5 mb-5" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Task Completion</p>
            <div className="flex flex-col gap-3">
              {Object.entries(taskStats)
                .sort((a, b) => (b[1].completed / b[1].total) - (a[1].completed / a[1].total))
                .map(([taskId, stat]) => {
                  const rate = Math.round((stat.completed / stat.total) * 100)
                  return (
                    <div key={taskId}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-zinc-300">{stat.name}</span>
                        <span style={{color:rate>=80?'#10b981':rate>=60?'#f59e0b':'#ef4444'}}>{rate}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div className="h-full rounded-full" style={{width:`${rate}%`,background:rate>=80?'#10b981':rate>=60?'#f59e0b':'#ef4444'}}/>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="rounded-3xl p-5" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(79,70,229,0.08))',border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-purple-400 text-xs uppercase tracking-widest mb-3">💡 Insights</p>
          <div className="flex flex-col gap-2 text-sm text-zinc-300">
            {overallRate >= 80 && <p>✓ You're crushing your routines! Keep this momentum going.</p>}
            {overallRate >= 60 && overallRate < 80 && <p>✓ Good consistency. Focus on the 2-3 tasks you miss most often.</p>}
            {overallRate < 60 && <p>✓ Try reducing your routine to just the 3 critical tasks and build from there.</p>}
            {dailyAvg > 0 && <p>✓ You complete {dailyAvg} tasks on average per day.</p>}
            {worstTask && Math.round((worstTask[1].completed/worstTask[1].total)*100) < 50 && <p>✓ "{worstTask[1].name}" needs attention — reschedule or simplify it.</p>}
          </div>
        </div>
      
    
      </PageContainer>
  )
}