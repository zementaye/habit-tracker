'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageContainer } from '../../components/navigation'

type Goal = { id: string; title: string; description: string; category: string; target_date: string; status: string; created_at: string }

const GOAL_CATEGORIES = [
  { id:'fitness', label:'Fitness', icon:'💪', color:'#D85A30' },
  { id:'sport', label:'Sport', icon:'🏅', color:'#10b981' },
  { id:'health', label:'Health', icon:'❤️', color:'#ef4444' },
  { id:'mind', label:'Mind', icon:'🧠', color:'#8b5cf6' },
  { id:'body', label:'Body', icon:'📏', color:'#3b82f6' },
  { id:'nutrition', label:'Nutrition', icon:'🥗', color:'#84cc16' },
  { id:'finance', label:'Finance', icon:'💰', color:'#f59e0b' },
  { id:'lifestyle', label:'Lifestyle', icon:'✨', color:'#a78bfa' },
]

const GOAL_TEMPLATES = [
  { title:'Lose 5kg', category:'body', description:'Track weight weekly and hit nutrition targets' },
  { title:'Run 5km without stopping', category:'fitness', description:'Build up with cardio sessions 4x per week' },
  { title:'Score 10 goals this season', category:'sport', description:'Focus on finishing drills every session' },
  { title:'Read 12 books this year', category:'mind', description:'Read 20 minutes every day' },
  { title:'Build visible abs', category:'body', description:'Consistent core training and clean nutrition' },
  { title:'Hit a 100kg bench press', category:'fitness', description:'Progressive overload every gym session' },
  { title:'Meditate 30 days in a row', category:'mind', description:'Daily 10-minute meditation practice' },
  { title:'Learn conversational Spanish', category:'mind', description:'30 minutes of practice daily for 90 days' },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('fitness')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('active')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }

  async function saveGoal() {
    if (!title.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('goals').insert({ user_id: user!.id, title: title.trim(), description, category, target_date: targetDate || null, status: 'active' })
    setTitle(''); setDescription(''); setTargetDate(''); setShowForm(false)
    setSaving(false); load()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('goals').update({ status }).eq('id', id)
    load()
  }

  async function deleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  function useTemplate(t: typeof GOAL_TEMPLATES[0]) {
    setTitle(t.title); setDescription(t.description); setCategory(t.category); setShowForm(true)
  }

  const filtered = goals.filter(g => filter === 'all' ? true : g.status === filter)
  const catConfig = (id: string) => GOAL_CATEGORIES.find(c => c.id === id) || GOAL_CATEGORIES[0]
  const daysLeft = (date: string) => {
    if (!date) return null
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
    return diff
  }

  if (loading) return <PageContainer title="🎯 My Goals"><div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto"/></div></PageContainer>

  return (
    <PageContainer title="🎯 My Goals" subtitle={`${goals.filter(g=>g.status==='active').length} active`}>
      {/* New goal form */}
      {showForm && (
        <div className="rounded-3xl p-5 mb-5" style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-white font-bold mb-4">New Goal</p>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What do you want to achieve?" className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none mb-3" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}/>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="How will you get there? (optional)" rows={2} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none mb-3 resize-none" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}/>
          <div className="flex flex-wrap gap-2 mb-3">
            {GOAL_CATEGORIES.map(c=>(
              <button key={c.id} onClick={()=>setCategory(c.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all" style={category===c.id?{background:`${c.color}22`,border:`1px solid ${c.color}55`,color:c.color}:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-zinc-500 text-xs mb-1.5">Target date (optional)</p>
            <input type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',colorScheme:'dark'}}/>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setShowForm(false)} className="flex-1 py-3 rounded-2xl text-sm text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Cancel</button>
            <button onClick={saveGoal} disabled={saving} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#4f46e5)'}}>Save Goal</button>
          </div>
        </div>
      )}

      {/* Templates */}
      {!showForm && goals.length === 0 && (
        <div className="mb-5">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Start with a template</p>
          <div className="grid grid-cols-1 gap-2">
            {GOAL_TEMPLATES.map(t=>(
              <button key={t.title} onClick={()=>useTemplate(t)} className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all hover:scale-[1.01]" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                <span className="text-xl">{catConfig(t.category).icon}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{t.title}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{t.description}</p>
                </div>
                <span className="text-zinc-600 text-lg">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div className="flex gap-2 mb-4">
          {['active','completed','all'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className="px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all" style={filter===f?{background:'linear-gradient(135deg,#7C3AED,#4f46e5)',color:'white'}:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Goals list */}
      <div className="flex flex-col gap-3">
        {filtered.map(g=>{
          const cat = catConfig(g.category)
          const days = daysLeft(g.target_date)
          const done = g.status === 'completed'
          return (
            <div key={g.id} className="rounded-2xl p-4 relative overflow-hidden" style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${done?'rgba(52,211,153,0.2)':'rgba(255,255,255,0.07)'}`,opacity:done?0.7:1}}>
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{background:done?'#34d399':cat.color}}/>
              <div className="pl-2">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{cat.icon}</span>
                    <p className={`text-sm font-semibold text-white flex-1 ${done?'line-through text-zinc-500':''}`}>{g.title}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {!done && <button onClick={()=>updateStatus(g.id,'completed')} className="text-xs px-2.5 py-1 rounded-lg" style={{background:'rgba(52,211,153,0.15)',color:'#34d399',border:'1px solid rgba(52,211,153,0.25)'}}>Done ✓</button>}
                    <button onClick={()=>deleteGoal(g.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                {g.description && <p className="text-zinc-500 text-xs mb-2">{g.description}</p>}
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-lg capitalize" style={{background:`${cat.color}15`,color:cat.color}}>{cat.label}</span>
                  {days !== null && (
                    <span className={`text-xs font-medium ${days<0?'text-red-400':days<=7?'text-orange-400':'text-zinc-500'}`}>
                      {days<0?`${Math.abs(days)}d overdue`:days===0?'Due today':`${days}d left`}
                    </span>
                  )}
                  {done && <span className="text-xs text-emerald-400">✓ Completed</span>}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length===0 && goals.length>0 && (
          <div className="text-center py-10 text-zinc-600 text-sm">No {filter} goals</div>
        )}
      </div>

      {/* Add button */}
      {!showForm && (
        <button onClick={()=>setShowForm(true)} className="w-full mt-5 py-4 rounded-2xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#4f46e5)',boxShadow:'0 6px 24px rgba(124,58,237,0.3)'}}>
          + Create New Goal
        </button>
      )}
    </PageContainer>
  )
}