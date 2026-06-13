'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/navigation'


type Routine = { id: string; name: string; description: string }
type Task = { id: string; routine_id: string; task_name: string; scheduled_time: string; priority: number; icon: string }
type Completion = { id: string; task_id: string; completed: boolean; completed_time: string | null }

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#3b82f6',
  4: '#8b5cf6',
  5: '#6b7280',
}

function TodayRoutineContent() {
  const sp = useSearchParams()
  const routineId = sp.get('routine_id') || ''
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Record<string, Completion>>({})
  const [loading, setLoading] = useState(true)
  const [nextTask, setNextTask] = useState<Task | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { load() }, [routineId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: routineData } = await supabase.from('daily_routines').select('*').eq('id', routineId).single()
    setRoutine(routineData)

    const { data: taskData } = await supabase.from('routine_tasks').select('*').eq('routine_id', routineId).order('scheduled_time')
    setTasks(taskData || [])

    // Load today's completions
    const { data: completionData } = await supabase.from('routine_completions').select('*').eq('routine_id', routineId).eq('completed_date', today)
    const completionMap: Record<string, Completion> = {}
    (completionData || []).forEach(c => { completionMap[c.task_id] = c })
    setCompletions(completionMap)

    // Find next task
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const nextT = taskData?.find(t => t.scheduled_time > currentTime && !completionMap[t.id]?.completed)
    setNextTask(nextT || null)

    setLoading(false)
  }

  async function toggleTask(taskId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const completion = completions[taskId]
    if (completion) {
      if (completion.completed) {
        await supabase.from('routine_completions').update({ completed: false, completed_time: null }).eq('id', completion.id)
      } else {
        await supabase.from('routine_completions').update({ completed: true, completed_time: new Date().toISOString() }).eq('id', completion.id)
      }
    } else {
      await supabase.from('routine_completions').insert({
        routine_id: routineId,
        task_id: taskId,
        completed_date: today,
        completed: true,
        completed_time: new Date().toISOString(),
        user_id: user!.id,
      })
    }
    load()
  }

  const completedCount = Object.values(completions).filter(c => c.completed).length
  const totalCount = tasks.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/></div>

  return (
     <PageContainer title="📋 Today's Routine" subtitle={new Date().toLocaleDateString()}>
      {/* JUST your content goes here — no wrapper divs, no manual header, no back button */}
   
    <div className="min-h-screen pb-10" style={{background:'linear-gradient(160deg,#07071a 0%,#0d0920 50%,#070d18 100%)'}}>
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center gap-3 pt-8 pb-5">
          <button onClick={() => router.push('/routine-setup')} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">📋 {routine?.name}</h1>
            <p className="text-zinc-500 text-xs">{new Date().toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric'})}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-3xl p-5 mb-5 relative overflow-hidden" style={{background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(52,211,153,0.08))',border:'1px solid rgba(124,58,237,0.25)'}}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-zinc-400 text-xs uppercase tracking-widest">Today's Progress</p>
            <span className="text-sm font-bold text-white">{completedCount}/{totalCount}</span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-5xl font-black text-white">{completionPct}%</span>
            <p className="text-sm font-semibold mb-1" style={{color:completionPct>=80?'#10b981':completionPct>=50?'#f59e0b':'#ef4444'}}>{completionPct>=80?'Crushing it!':completionPct>=50?'Good progress':'Keep going'}</p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
            <div className="h-full rounded-full transition-all" style={{width:`${completionPct}%`,background:'linear-gradient(90deg,#7C3AED,#34d399)'}}/>
          </div>
        </div>

        {/* Next task alert */}
        {nextTask && (
          <div className="rounded-2xl p-4 mb-5" style={{background:'linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))',border:'1px solid rgba(251,191,36,0.3)'}}>
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-2">⏰ Up next</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{nextTask.icon}</span>
              <div className="flex-1">
                <p className="text-white font-bold">{nextTask.task_name}</p>
                <p className="text-amber-400/70 text-sm">At {nextTask.scheduled_time}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tasks */}
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Routine Tasks</p>
        <div className="flex flex-col gap-2">
          {tasks.map(task => {
            const completion = completions[task.id]
            const isCompleted = completion?.completed || false
            const now = new Date()
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            const isPast = task.scheduled_time <= currentTime
            const isNext = task === nextTask

            return (
              <button key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-3 p-4 rounded-2xl transition-all" style={{
                background: isCompleted ? 'rgba(16,185,129,0.1)' : isPast && !isCompleted ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                border: isCompleted ? '1px solid rgba(16,185,129,0.3)' : isPast && !isCompleted ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.07)',
              }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:isCompleted?'rgba(16,185,129,0.2)':isPast?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.05)',border:isCompleted?'2px solid rgba(16,185,129,0.5)':isPast?'2px solid rgba(239,68,68,0.3)':'1px solid rgba(255,255,255,0.1)'}}>
                  {isCompleted ? '✓' : task.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold ${isCompleted ? 'text-zinc-400 line-through' : 'text-white'}`}>{task.task_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500">{task.scheduled_time}</span>
                    {isNext && <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(251,191,36,0.2)',color:'#fbbf24'}}>Next</span>}
                    {isCompleted && <span className="text-xs text-emerald-400">Done</span>}
                    {isPast && !isCompleted && <span className="text-xs text-red-400">Overdue</span>}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded-lg" style={{background:`${PRIORITY_COLORS[task.priority]}22`,color:PRIORITY_COLORS[task.priority],border:`1px solid ${PRIORITY_COLORS[task.priority]}44`}}>
                  {task.priority === 1 ? '⚠️' : task.priority === 2 ? '→' : '◆'}
                </div>
              </button>
            )
          })}
        </div>

        {completedCount === totalCount && totalCount > 0 && (
          <div className="rounded-3xl p-6 mt-5 text-center" style={{background:'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,182,212,0.08))',border:'1px solid rgba(16,185,129,0.3)'}}>
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-white font-bold text-lg">Routine Complete!</p>
            <p className="text-emerald-400 text-sm mt-1">You crushed today's routine. Great work!</p>
          </div>
        )}
      </div>
    </div>
      </PageContainer>
  )
}

export default function TodayRoutinePage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/></div>}><TodayRoutineContent/></Suspense>
}