'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

type Routine = { id: string; name: string; description: string }
type Task = { id: string; routine_id: string; task_name: string; scheduled_time: string; priority: number; icon: string }

const ROUTINE_TEMPLATES = [
  {
    name: 'Morning Power Routine',
    description: 'Start your day strong with essential habits',
    tasks: [
      { task_name: 'Pray/Meditate', scheduled_time: '06:00', priority: 1, icon: '🙏' },
      { task_name: 'Stretch', scheduled_time: '06:15', priority: 2, icon: '🧘' },
      { task_name: 'Ice injury/recovery', scheduled_time: '06:30', priority: 2, icon: '❄️' },
      { task_name: 'Drink water', scheduled_time: '06:45', priority: 3, icon: '💧' },
      { task_name: 'Cold shower', scheduled_time: '07:00', priority: 3, icon: '🚿' },
      { task_name: 'Healthy breakfast', scheduled_time: '07:15', priority: 2, icon: '🥗' },
    ]
  },
  {
    name: 'Evening Wind Down',
    description: 'Relax and prepare for quality sleep',
    tasks: [
      { task_name: 'No screens', scheduled_time: '21:00', priority: 2, icon: '📵' },
      { task_name: 'Journaling/gratitude', scheduled_time: '21:15', priority: 2, icon: '✏️' },
      { task_name: 'Stretching', scheduled_time: '21:30', priority: 3, icon: '🧘' },
      { task_name: 'Bed by 10:30pm', scheduled_time: '22:30', priority: 1, icon: '😴' },
    ]
  },
  {
    name: 'Pre-Workout Ritual',
    description: 'Get mentally and physically ready',
    tasks: [
      { task_name: 'Warm up', scheduled_time: '17:00', priority: 2, icon: '🔥' },
      { task_name: 'Review workout plan', scheduled_time: '17:10', priority: 2, icon: '📋' },
      { task_name: 'Hydrate', scheduled_time: '17:20', priority: 1, icon: '💧' },
      { task_name: 'Mental prep/visualization', scheduled_time: '17:30', priority: 3, icon: '🧠' },
    ]
  },
]

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6', 5: '#6b7280',
}
const PRIORITY_LABELS: Record<number, string> = {
  1: 'Critical', 2: 'Important', 3: 'Standard', 4: 'Optional', 5: 'Low',
}

export default function RoutineSetupPage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const [routineDesc, setRoutineDesc] = useState('')
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ name: '', time: '06:00', priority: 2, icon: '✓' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const uid = auth.currentUser?.uid
    if (!uid) { router.push('/login'); return }

    const routineSnap = await getDocs(
      query(collection(db, 'daily_routines'), where('user_id', '==', uid))
    )
    const routineData: Routine[] = routineSnap.docs.map(d => ({ id: d.id, ...d.data() } as Routine))
    setRoutines(routineData)

    for (const r of routineData) {
      const taskSnap = await getDocs(
        query(collection(db, 'routine_tasks'), where('routine_id', '==', r.id), orderBy('scheduled_time'))
      )
      const taskData: Task[] = taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task))
      setTasks(prev => ({ ...prev, [r.id]: taskData }))
    }
    setLoading(false)
  }

  async function createRoutine() {
    if (!routineName.trim()) return
    setSaving(true)
    const uid = auth.currentUser?.uid
    if (!uid) return
    await addDoc(collection(db, 'daily_routines'), {
      user_id: uid,
      name: routineName,
      description: routineDesc,
      created_at: new Date().toISOString()
    })
    setRoutineName('')
    setRoutineDesc('')
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function createFromTemplate(template: typeof ROUTINE_TEMPLATES[0]) {
    setSaving(true)
    const uid = auth.currentUser?.uid
    if (!uid) return
    const docRef = await addDoc(collection(db, 'daily_routines'), {
      user_id: uid,
      name: template.name,
      description: template.description,
      created_at: new Date().toISOString()
    })

    for (const t of template.tasks) {
      await addDoc(collection(db, 'routine_tasks'), {
        routine_id: docRef.id,
        task_name: t.task_name,
        scheduled_time: t.scheduled_time,
        priority: t.priority,
        icon: t.icon,
      })
    }
    setShowTemplates(false)
    setSaving(false)
    load()
  }

  async function addTask(routineId: string) {
    if (!newTask.name.trim()) return
    await addDoc(collection(db, 'routine_tasks'), {
      routine_id: routineId,
      task_name: newTask.name,
      scheduled_time: newTask.time,
      priority: newTask.priority,
      icon: newTask.icon,
    })
    setNewTask({ name: '', time: '06:00', priority: 2, icon: '✓' })
    setSelectedRoutine(null)
    load()
  }

  async function deleteRoutine(id: string) {
    await deleteDoc(doc(db, 'daily_routines', id))
    load()
  }

  async function deleteTask(id: string) {
    await deleteDoc(doc(db, 'routine_tasks', id))
    load()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/></div>

  return (
    <PageContainer title="⏰ Daily Routines" subtitle={`${routines.length} routines`}>
      {showTemplates && (
        <div className="rounded-3xl p-5 mb-5" style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-white font-bold mb-4">Quick templates</p>
          {ROUTINE_TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => createFromTemplate(t)} className="w-full text-left p-4 rounded-2xl mb-3 transition-all" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <p className="text-white font-semibold text-sm">{t.name}</p>
              <p className="text-zinc-500 text-xs mt-1">{t.description}</p>
              <p className="text-zinc-600 text-xs mt-2">{t.tasks.length} tasks</p>
            </button>
          ))}
          <button onClick={() => setShowTemplates(false)} className="w-full py-2 rounded-xl text-sm text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Cancel</button>
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl p-5 mb-5" style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-white font-bold mb-4">Create Routine</p>
          <input value={routineName} onChange={e => setRoutineName(e.target.value)} placeholder="e.g., Morning Power Routine" className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none mb-3" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}/>
          <textarea value={routineDesc} onChange={e => setRoutineDesc(e.target.value)} placeholder="Optional description..." rows={2} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none resize-none mb-4" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}/>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-2xl text-sm text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Cancel</button>
            <button onClick={createRoutine} disabled={saving} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{background:'linear-gradient(135deg,#7C3AED,#4f46e5)'}}>Create</button>
          </div>
        </div>
      )}

      {routines.length === 0 && !showForm && !showTemplates && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-5xl mb-4">⏰</p>
          <p className="text-sm text-white font-semibold mb-1">No routines yet</p>
          <p className="text-xs">Create a routine to get started with time-based notifications</p>
        </div>
      )}

      {routines.map(routine => (
        <div key={routine.id} className="rounded-3xl p-5 mb-5" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-bold">{routine.name}</p>
              {routine.description && <p className="text-zinc-500 text-xs mt-1">{routine.description}</p>}
            </div>
            <button onClick={() => deleteRoutine(routine.id)} className="text-zinc-700 hover:text-red-400">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {(tasks[routine.id] || []).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <span className="text-lg">{task.icon}</span>
                <div className="flex-1">
                  <p className="text-white text-xs font-semibold">{task.task_name}</p>
                  <p className="text-zinc-600 text-xs">{task.scheduled_time}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg" style={{background:`${PRIORITY_COLORS[task.priority]}22`,color:PRIORITY_COLORS[task.priority],border:`1px solid ${PRIORITY_COLORS[task.priority]}44`}}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
                <button onClick={() => deleteTask(task.id)} className="text-zinc-700 hover:text-red-400">
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>

          {selectedRoutine === routine.id ? (
            <div className="flex flex-col gap-2 p-3 rounded-xl" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.2)'}}>
              <input value={newTask.name} onChange={e => setNewTask({...newTask,name:e.target.value})} placeholder="Task name..." className="rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}/>
              <div className="grid grid-cols-3 gap-2">
                <input type="time" value={newTask.time} onChange={e => setNewTask({...newTask,time:e.target.value})} className="rounded-lg px-3 py-2 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',colorScheme:'dark'}}/>
                <input value={newTask.icon} onChange={e => setNewTask({...newTask,icon:e.target.value})} placeholder="🎯" className="rounded-lg px-3 py-2 text-sm text-white text-center outline-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',maxWidth:'60px'}}/>
                <select value={newTask.priority} onChange={e => setNewTask({...newTask,priority:+e.target.value})} className="rounded-lg px-3 py-2 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',colorScheme:'dark'}}>
                  {[1,2,3,4,5].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedRoutine(null)} className="flex-1 py-2 rounded-lg text-xs text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Cancel</button>
                <button onClick={() => addTask(routine.id)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{background:'rgba(124,58,237,0.3)',border:'1px solid rgba(124,58,237,0.5)'}}>Add</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setSelectedRoutine(routine.id)} className="w-full py-2 rounded-xl text-xs text-center font-medium" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.3)',color:'#a78bfa'}}>
              + Add task
            </button>
          )}

          <button onClick={() => router.push(`/today-routine?routine_id=${routine.id}`)} className="w-full mt-3 py-3 rounded-2xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#4f46e5)'}}>
            View today's routine →
          </button>
        </div>
      ))}
    </PageContainer>
  )
}