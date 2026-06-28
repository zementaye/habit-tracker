'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, limit, getDocs, setDoc, doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PageContainer } from '../../components/navigation'

type Metric = { id:string; logged_date:string; weight_kg:number; body_fat_pct:number; chest_cm:number; waist_cm:number; hips_cm:number; arms_cm:number; notes:string }

export default function BodyPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [weight, setWeight] = useState('')
  const [fat, setFat] = useState('')
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const [arms, setArms] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const router = useRouter()
  const today = new Date().toISOString().slice(0,10)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return }
      setUid(user.uid)
      load(user.uid)
    })
    return () => unsub()
  }, [])

  async function load(userId: string) {
    const snap = await getDocs(
      query(collection(db, 'body_metrics'), where('user_id', '==', userId), orderBy('logged_date', 'desc'), limit(30))
    )
    setMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() } as Metric)))
    setLoading(false)
  }

  async function save() {
    if (!weight || !uid) return
    setSaving(true)
    await setDoc(doc(db, 'body_metrics', `${uid}_${today}`), {
      user_id: uid, logged_date: today,
      weight_kg: +weight,
      body_fat_pct: fat ? +fat : null,
      chest_cm: chest ? +chest : null,
      waist_cm: waist ? +waist : null,
      hips_cm: hips ? +hips : null,
      arms_cm: arms ? +arms : null,
      notes
    }, { merge: true })
    setSaving(false); setShowForm(false); load(uid)
  }

  const latest = metrics[0]
  const prev = metrics[1]
  const diff = (key: keyof Metric) => {
    if (!latest || !prev) return null
    const a = latest[key] as number, b = prev[key] as number
    if (!a || !b) return null
    return +(a - b).toFixed(1)
  }

  const Diff = ({val, inverse=false}: {val:number|null, inverse?:boolean}) => {
    if (val === null || val === 0) return null
    const good = inverse ? val < 0 : val > 0
    return <span className={`text-xs font-semibold ml-1 ${good?'text-emerald-400':'text-red-400'}`}>{val>0?'+':''}{val}</span>
  }

  const chartData = [...metrics].reverse()
  const maxW = Math.max(...chartData.map(m => m.weight_kg || 0))
  const minW = Math.min(...chartData.filter(m => m.weight_kg).map(m => m.weight_kg || 0))

  if (loading) return <PageContainer title="📏 Body Metrics"><div className="text-center py-10"><div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto"/></div></PageContainer>

  return (
    <PageContainer title="📏 Body Metrics" subtitle={`${metrics.length} entries`}>
      {showForm && (
        <div className="rounded-3xl p-5 mb-5" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)'}}>
          <p className="text-white font-bold mb-4">Log Today's Metrics</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {label:'Weight (kg) *', val:weight, set:setWeight, placeholder:'75.5'},
              {label:'Body fat %', val:fat, set:setFat, placeholder:'18'},
              {label:'Chest (cm)', val:chest, set:setChest, placeholder:'100'},
              {label:'Waist (cm)', val:waist, set:setWaist, placeholder:'82'},
              {label:'Hips (cm)', val:hips, set:setHips, placeholder:'95'},
              {label:'Arms (cm)', val:arms, set:setArms, placeholder:'35'},
            ].map(f => (
              <div key={f.label}>
                <p className="text-zinc-500 text-xs mb-1.5">{f.label}</p>
                <input defaultValue={f.val} onBlur={e=>f.set(e.target.value)} type="number" placeholder={f.placeholder} className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}/>
              </div>
            ))}
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none resize-none mb-3" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}/>
          <div className="flex gap-2">
            <button onClick={()=>setShowForm(false)} className="flex-1 py-3 rounded-2xl text-sm text-zinc-400" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>Cancel</button>
            <button onClick={save} disabled={saving||!weight} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)'}}>Save</button>
          </div>
        </div>
      )}

      {latest && (
        <div className="rounded-3xl p-5 mb-4" style={{background:'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(124,58,237,0.08))',border:'1px solid rgba(59,130,246,0.2)'}}>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Latest — {new Date(latest.logged_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:'Weight', val:latest.weight_kg, unit:'kg', diff:diff('weight_kg'), inverse:true},
              {label:'Body fat', val:latest.body_fat_pct, unit:'%', diff:diff('body_fat_pct'), inverse:true},
              {label:'Waist', val:latest.waist_cm, unit:'cm', diff:diff('waist_cm'), inverse:true},
              {label:'Chest', val:latest.chest_cm, unit:'cm', diff:diff('chest_cm'), inverse:false},
              {label:'Arms', val:latest.arms_cm, unit:'cm', diff:diff('arms_cm'), inverse:false},
              {label:'Hips', val:latest.hips_cm, unit:'cm', diff:diff('hips_cm'), inverse:true},
            ].map(s => (
              <div key={s.label} className="text-center rounded-2xl p-3" style={{background:'rgba(255,255,255,0.04)'}}>
                <p className="text-white font-bold text-base">{s.val||'—'}<span className="text-zinc-500 text-xs">{s.val?s.unit:''}</span></p>
                {s.val && <Diff val={s.diff} inverse={s.inverse}/>}
                <p className="text-zinc-600 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {chartData.filter(m=>m.weight_kg).length > 1 && (
        <div className="rounded-3xl p-5 mb-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-4">Weight trend</p>
          <div className="relative" style={{height:'80px'}}>
            <svg width="100%" height="80" viewBox={`0 0 ${chartData.length*40} 80`} preserveAspectRatio="none">
              {chartData.filter(m=>m.weight_kg).map((m,i,arr)=>{
                if(i===0) return null
                const prev2=arr[i-1], range=maxW-minW||1
                const x1=(i-1)*40+20, y1=70-((prev2.weight_kg-minW)/range*60)
                const x2=i*40+20, y2=70-((m.weight_kg-minW)/range*60)
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
              })}
              {chartData.filter(m=>m.weight_kg).map((m,i)=>{
                const range=maxW-minW||1, x=i*40+20, y=70-((m.weight_kg-minW)/range*60)
                return <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" stroke="#07071a" strokeWidth="2"/>
              })}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>{chartData.filter(m=>m.weight_kg)[0]?.logged_date?.slice(5)}</span>
            <span>{chartData.filter(m=>m.weight_kg).slice(-1)[0]?.logged_date?.slice(5)}</span>
          </div>
        </div>
      )}

      {metrics.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">History</p>
          <div className="flex flex-col gap-2">
            {metrics.map(m=>(
              <div key={m.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-blue-400 shrink-0" style={{background:'rgba(59,130,246,0.1)'}}>
                  {new Date(m.logged_date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-1">
                  {m.weight_kg && <span className="text-white text-xs font-semibold">{m.weight_kg}kg</span>}
                  {m.body_fat_pct && <span className="text-zinc-400 text-xs">{m.body_fat_pct}% fat</span>}
                  {m.waist_cm && <span className="text-zinc-400 text-xs">{m.waist_cm}cm waist</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.length===0 && !showForm && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-5xl mb-4">📏</p>
          <p className="text-sm text-white font-semibold mb-1">Start tracking your body</p>
          <p className="text-xs">Log weight, measurements, and body fat to see your transformation over time</p>
        </div>
      )}

      {!showForm && (
        <button onClick={()=>setShowForm(true)} className="w-full mt-5 py-4 rounded-2xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',boxShadow:'0 6px 24px rgba(59,130,246,0.3)'}}>
          + Log Today's Metrics
        </button>
      )}
    </PageContainer>
  )
}