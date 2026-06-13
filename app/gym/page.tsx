'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Cardio']

const EXERCISES: Record<string, string[]> = {
  Chest: ['Bench Press', 'Incline Press', 'Cable Fly', 'Push-ups', 'Dips'],
  Back: ['Pull-ups', 'Deadlift', 'Barbell Row', 'Lat Pulldown', 'Cable Row'],
  Shoulders: ['Overhead Press', 'Lateral Raises', 'Front Raises', 'Face Pulls', 'Arnold Press'],
  Biceps: ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl'],
  Triceps: ['Skull Crushers', 'Tricep Dips', 'Cable Pushdown', 'Close-grip Bench', 'Overhead Extension'],
  Legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Calf Raises', 'Lunges'],
  Core: ['Plank', 'Crunches', 'Leg Raises', 'Russian Twists', 'Ab Wheel'],
  Cardio: ['Running', 'Cycling', 'Jump Rope', 'Rowing Machine', 'Stair Climber'],
}

type Set = { reps: string; weight: string }
type Exercise = { name: string; sets: Set[] }

function GymContent() {
  const searchParams = useSearchParams()
  const habitId = searchParams.get('habit_id')
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const [selectedGroup, setSelectedGroup] = useState('Chest')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function addExercise(name: string) {
    if (exercises.find(e => e.name === name)) return
    setExercises(prev => [...prev, { name, sets: [{ reps: '', weight: '' }] }])
  }

  function addSet(eIdx: number) {
    setExercises(prev => prev.map((e, i) => i === eIdx ? { ...e, sets: [...e.sets, { reps: '', weight: '' }] } : e))
  }

  function updateSet(eIdx: number, sIdx: number, field: 'reps' | 'weight', value: string) {
    setExercises(prev => prev.map((e, i) => i === eIdx ? { ...e, sets: e.sets.map((s, j) => j === sIdx ? { ...s, [field]: value } : s) } : e))
  }

  function removeExercise(eIdx: number) {
    setExercises(prev => prev.filter((_, i) => i !== eIdx))
  }

  async function saveWorkout() {
    if (exercises.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('workout_logs').insert({ user_id: user!.id, logged_date: date, exercises })
    if (habitId) {
      await supabase.from('habit_logs').insert({ habit_id: habitId, logged_date: date, user_id: user!.id })
    }
    setSaving(false)
    router.push('/habits')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-10">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center gap-3 pt-8 pb-6">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">🏋️ Gym Session</h1>
            <p className="text-zinc-500 text-xs">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Muscle group selector */}
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Select muscle group</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {MUSCLE_GROUPS.map(g => (
            <button key={g} onClick={() => setSelectedGroup(g)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedGroup === g ? 'bg-orange-500 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'}`}>
              {g}
            </button>
          ))}
        </div>

        {/* Exercise picker */}
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Add exercises</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {EXERCISES[selectedGroup].map(ex => {
            const added = exercises.find(e => e.name === ex)
            return (
              <button key={ex} onClick={() => addExercise(ex)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${added ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'}`}>
                {added ? '✓ ' : '+ '}{ex}
              </button>
            )
          })}
        </div>

        {/* Exercise logs */}
        {exercises.length === 0 && (
          <div className="text-center py-10 text-zinc-600 text-sm">Select a muscle group and add exercises above</div>
        )}
        <div className="flex flex-col gap-4 mb-6">
          {exercises.map((exercise, eIdx) => (
            <div key={exercise.name} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-white">{exercise.name}</p>
                <button onClick={() => removeExercise(eIdx)} className="text-zinc-600 hover:text-red-400 transition-colors text-lg">×</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500 mb-2 px-1">
                <span>Set</span><span>Weight (kg)</span><span>Reps</span>
              </div>
              {exercise.sets.map((set, sIdx) => (
                <div key={sIdx} className="grid grid-cols-3 gap-2 mb-2 items-center">
                  <span className="text-zinc-500 text-sm pl-1">{sIdx + 1}</span>
                  <input value={set.weight} onChange={e => updateSet(eIdx, sIdx, 'weight', e.target.value)}
                    placeholder="0" type="number"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500 text-center" />
                  <input value={set.reps} onChange={e => updateSet(eIdx, sIdx, 'reps', e.target.value)}
                    placeholder="0" type="number"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500 text-center" />
                </div>
              ))}
              <button onClick={() => addSet(eIdx)} className="text-xs text-orange-400 hover:text-orange-300 mt-1 transition-colors">+ Add set</button>
            </div>
          ))}
        </div>

        {exercises.length > 0 && (
          <button onClick={saveWorkout} disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white py-4 rounded-2xl font-semibold text-sm transition-all disabled:opacity-50">
            {saving ? 'Saving...' : '💪 Save Workout'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function GymPage() {
  return <Suspense><GymContent /></Suspense>
}