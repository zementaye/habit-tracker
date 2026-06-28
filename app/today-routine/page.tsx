'use client'
import { useState, useEffect, Suspense } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type Routine = { id: string; name: string; description: string }
type Task = { id: string; routine_id: string; task_name: string; scheduled_time: string; priority: number; icon: string }
type Completion = { id: string; task_id: string; completed: boolean; completed_time: string | null }

function TodayRoutineContent() {
  const sp = useSearchParams()
  const routineId = sp.get('routine_id') || ''
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Record<string, Completion>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { load() }, [routineId])

  async function load() {
    const uid = auth.currentUser?.uid
    if (!uid) { router.push('/login'); return }

    const routineSnap = await getDocs(
      query(collection(db, 'daily_routines'), where('id', '==', routineId))
    )
    if (!routineSnap.empty) {
      setRoutine({ id: routineSnap.docs[0].id, ...routineSnap.docs[0].data() } as Routine)
    }

    const taskSnap = await getDocs(
      query(collection(db, 'routine_tasks'), where('routine_id', '==', routineId), orderBy('scheduled_time'))
    )
    const taskData: Task[] = taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task))
    setTasks(taskData)

    const completionSnap = await getDocs(
      query(collection(db, 'routine_completions'), where('routine_id', '==', routineId), where('completed_date', '==', today))
    )
    const completionMap: Record<string, Completion> = {}
    completionSnap.docs.forEach(d => {
      const comp = d.data()
      completionMap[comp.task_id] = { id: d.id, ...comp } as Completion
    })
    setCompletions(completionMap)
    setLoading(false)
  }

  async function toggleTask(taskId: string) {
    const uid = auth.currentUser?.uid
    if (!uid) return
    
    const completion = completions[taskId]
    if (completion) {
      await updateDoc(doc(db, 'routine_completions', completion.id), {
        completed: !completion.completed,
        completed_time: !completion.completed ? new Date().toISOString() : null
      })
    } else {
      await addDoc(collection(db, 'routine_completions'), {
        routine_id: routineId,
        task_id: taskId,
        completed_date: today,
        completed: true,
        completed_time: new Date().toISOString(),
        user_id: uid,
      })
    }
    load()
  }

  const completedCount = Object.values(completions).filter(c => c.completed).length
  const totalCount = tasks.length
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) return <PageContainer title="📋 Today's Routine" subtitle={new Date().toLocaleDateString()}><div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto"/></div></PageContainer>

  return (
    <PageContainer title="📋 Today's Routine" subtitle={new Date().toLocaleDateString()}>
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

      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Routine Tasks</p>
      <div className="flex flex-col gap-2">
        {tasks.map(task => {
          const completion = completions[task.id]
          const isCompleted = completion?.completed || false

          return (
            <button key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-3 p-4 rounded-2xl transition-all" style={{
              background: isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
              border: isCompleted ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.07)',
            }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0" style={{background:isCompleted?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.05)',border:isCompleted?'2px solid rgba(16,185,129,0.5)':'1px solid rgba(255,255,255,0.1)'}}>
                {isCompleted ? '✓' : task.icon}
              </div>
              <div className="flex-1 text-left">
                <p className={`font-semibold ${isCompleted ? 'text-zinc-400 line-through' : 'text-white'}`}>{task.task_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-500">{task.scheduled_time}</span>
                  {isCompleted && <span className="text-xs text-emerald-400">Done</span>}
                </div>
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
    </PageContainer>
  )
}

export default function TodayRoutinePage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto"/></div>}><TodayRoutineContent/></Suspense>
}