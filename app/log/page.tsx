'use client'
import { useState, useEffect, Suspense } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, addDoc, setDoc, doc, limit } from 'firebase/firestore'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

const TYPE_CONFIG: Record<string,{icon:string;title:string;accent:string;sections:string[]}> = {
  gym:       {icon:'🏋️',title:'Gym Session',       accent:'#f97316',sections:['muscles','sets','rpe','notes']},
  sport:     {icon:'🏅',title:'Sport Session',     accent:'#10b981',sections:['performance','well','missing','notes']},
  cardio:    {icon:'🏃',title:'Cardio Session',    accent:'#06b6d4',sections:['cardio','energy','notes']},
  yoga:      {icon:'🧘',title:'Yoga Session',      accent:'#ec4899',sections:['yogatype','mood','energy','notes']},
  meditation:{icon:'🌿',title:'Meditation',        accent:'#14b8a6',sections:['duration','mood','notes']},
  reading:   {icon:'📚',title:'Reading Session',   accent:'#8b5cf6',sections:['pages','genre','rating','notes']},
  journal:   {icon:'✏️',title:'Journal Entry',     accent:'#f59e0b',sections:['mood','gratitude','notes']},
  steps:     {icon:'👟',title:'Step Count',        accent:'#10b981',sections:['steps','energy','notes']},
  water:     {icon:'💧',title:'Hydration Log',     accent:'#3b82f6',sections:['glasses','notes']},
  sleep:     {icon:'😴',title:'Sleep Log',         accent:'#6366f1',sections:['hours','quality','notes']},
  nutrition: {icon:'🥗',title:'Nutrition Log',     accent:'#84cc16',sections:['meals','calories','notes']},
  learning:  {icon:'🎓',title:'Language Practice', accent:'#6366f1',sections:['language','rating','duration','notes']},
  focus:     {icon:'🎯',title:'Deep Work',         accent:'#ef4444',sections:['duration','tasks','notes']},
}

const MUSCLE_GROUPS = ['Chest','Back','Shoulders','Biceps','Triceps','Legs','Core','Cardio']
const EXERCISES: Record<string,string[]> = {
  Chest:['Bench Press','Incline Press','Decline Press','Cable Fly','Push-ups','Dips','Chest Press Machine','Pec Deck'],
  Back:['Pull-ups','Deadlift','Barbell Row','Lat Pulldown','Cable Row','T-Bar Row','Face Pulls','Hyperextensions'],
  Shoulders:['Overhead Press','Lateral Raises','Front Raises','Arnold Press','Upright Row','Rear Delt Fly','Cable Lateral'],
  Biceps:['Barbell Curl','Dumbbell Curl','Hammer Curl','Preacher Curl','Cable Curl','Concentration Curl','Incline Curl'],
  Triceps:['Skull Crushers','Tricep Dips','Cable Pushdown','Close-grip Bench','Overhead Extension','Kickbacks','Diamond Push-ups'],
  Legs:['Squat','Leg Press','Romanian Deadlift','Leg Curl','Leg Extension','Calf Raises','Lunges','Hack Squat','Bulgarian Split Squat'],
  Core:['Plank','Crunches','Leg Raises','Russian Twists','Ab Wheel','Cable Crunch','Hollow Hold','Dragon Flag'],
  Cardio:['Running','Cycling','Jump Rope','Rowing Machine','Stair Climber','Elliptical','HIIT','Battle Ropes'],
}

const SPORT_DRILLS: Record<string,Record<string,string[]>> = {
  football: {
    'Finishing':['10 mins finishing practice from edge of box','One-on-one drills with goalkeeper','Penalty practice 20 shots','Weak foot shooting drills'],
    'Positioning':['Watch film — pause and predict movement','Shadow movement drills without ball','Third-man run practice'],
    'First touch':['Wall passing — control and return drills','Juggling 100 touches daily','Receiving passes from different angles'],
    'Stamina':['Interval runs 4×400m','Fartlek training 30 mins','Add 5 mins to your run each week'],
    'Decision making':['Rondo 5v2 pressure drills','Small-sided games (3v3)','Watch and analyze 1 professional game per week'],
    'Defending':['1v1 defensive stance drills','Tracking runs practice','Pressing triggers training'],
    'Speed':['Acceleration drills — 10m sprints','Ladder footwork drills','Resisted sprint training'],
    'Composure':['Practice receiving under simulated pressure','Breathing techniques before set pieces','Mindfulness 10 mins daily'],
    'Passing accuracy':['Pass and move drills','Long-range passing targets','One-touch passing circuits'],
    'Communication':['Deliberately call for ball every touch','Pre-game communication agreements with teammates'],
  },
  tennis: {
    'First serve %':['Serve practice 50 balls focusing on placement','Slow motion serve video analysis','Toss consistency drills'],
    'Backhand':['Wall backhand 10 mins daily','Cross-court backhand drill','Backhand slice practice'],
    'Footwork':['Ladder drills 15 mins','Split step timing drills','Court coverage shadow swings'],
    'Net play':['Volley practice at net','Approach shot + volley combos','Half-volley drills'],
    'Mental resilience':['Practice playing from 0-40 down','Breathing reset between points','Visualization before serve'],
    'Return of serve':['Practice against fast serves','Return positioning drills','Read the toss drill'],
    'Stamina':['On-court sprints side to side','Match simulation 2 sets practice','Core and leg conditioning'],
  },
  basketball: {
    'Shooting':['100 shots daily from 5 spots','Form shooting 10 mins','Free throw practice 50 shots'],
    'Dribbling':['Stationary dribble drills','Full court dribble moves','Off-hand dribbling 10 mins'],
    'Defense':['Defensive stance slides','Close-out drills','1v1 defensive practice'],
    'Stamina':['Suicides 5 sets','Full court sprints','Jump rope 15 mins'],
  },
  boxing: {
    'Jab accuracy':['Shadow boxing focus on jab placement','Bag work — jab combinations 3 rounds','Mirror drilling'],
    'Footwork':['Ladder drills','In-out movement practice','Pivoting drills'],
    'Defense':['Slip bag practice','Partner mitts defense drill','Head movement shadow boxing'],
    'Stamina':['Jump rope 3×3min rounds','Sprint intervals','Swimming or cycling cross-training'],
  },
}

const SPORT_MISSING: Record<string,string[]> = {
  football:['Finishing','Positioning','Stamina','Communication','First touch','Decision making','Defending','Speed','Composure','Passing accuracy','Pressing','Aerial duels'],
  tennis:['First serve %','Backhand','Net play','Footwork','Return of serve','Mental resilience','Drop shots','Court coverage','Topspin','Slice'],
  basketball:['Shooting','Dribbling','Defense','Court vision','Free throws','Rebounding','Passing','Stamina'],
  boxing:['Jab accuracy','Footwork','Defense','Combinations','Stamina','Head movement','Power','Timing'],
  default:['Stamina','Technique','Focus','Communication','Speed','Decision making','Recovery','Consistency'],
}

const LANGUAGES = ['Arabic','Spanish','French','English','German','Italian','Japanese','Chinese','Portuguese','Turkish','Korean','Russian','Swahili','Dutch','Hindi','Persian','Amharic']
const YOGA_TYPES = ['Hatha','Vinyasa','Yin','Restorative','Power','Ashtanga','Kundalini','Hot yoga','Morning flow']
const GENRES = ['Non-fiction','Fiction','Self-help','Biography','Science','History','Philosophy','Business','Fantasy','Psychology']
const MOODS = ['😔 Low','😐 Neutral','🙂 Good','😊 Great','🤩 Amazing']
const ENERGY = ['🪫 Drained','😴 Tired','💪 Normal','⚡ Energized','🔥 Peak']

type ExEntry = {name:string;sets:{reps:string;weight:string}[]}
type LastSession = {exercise:string;bestWeight:number;bestReps:number}

function LogContent() {
  const sp = useSearchParams()
  const habitId = sp.get('habit_id')||''
  const date = sp.get('date')||new Date().toISOString().slice(0,10)
  const name = sp.get('name')||'Habit'
  const type = sp.get('type')||'simple'
  const color = sp.get('color')||'#7C3AED'
  const cfg = TYPE_CONFIG[type]||TYPE_CONFIG['sport']

  const [notes,setNotes] = useState('')
  const [energy,setEnergy] = useState(2)
  const [mood,setMood] = useState(2)
  const [saving,setSaving] = useState(false)
  const [muscleGroup,setMuscleGroup] = useState('Chest')
  const [exercises,setExercises] = useState<ExEntry[]>([])
  const [lastSessions,setLastSessions] = useState<Record<string,LastSession>>({})
  const [newPRs,setNewPRs] = useState<string[]>([])
  const [rpe,setRpe] = useState(7)
  const [performance,setPerformance] = useState(6)
  const [wentWell,setWentWell] = useState('')
  const [missing,setMissing] = useState<string[]>([])
  const [suggestedDrills,setSuggestedDrills] = useState<{area:string;drills:string[]}[]>([])
  const [duration,setDuration] = useState('')
  const [distance,setDistance] = useState('')
  const [steps,setSteps] = useState('')
  const [glasses,setGlasses] = useState(4)
  const [hours,setHours] = useState(7)
  const [sleepQuality,setSleepQuality] = useState(2)
  const [pages,setPages] = useState('')
  const [genre,setGenre] = useState('')
  const [sessionRating,setSessionRating] = useState(0)
  const [yogaType,setYogaType] = useState('')
  const [meals,setMeals] = useState(3)
  const [calories,setCalories] = useState('')
  const [language,setLanguage] = useState('')
  const [focusDuration,setFocusDuration] = useState('')
  const [tasks,setTasks] = useState('')
  const [gratitude,setGratitude] = useState('')

  const router = useRouter()

  const sportKey = name.toLowerCase().includes('tennis')?'tennis':name.toLowerCase().includes('basket')?'basketball':name.toLowerCase().includes('box')||name.toLowerCase().includes('mma')?'boxing':name.toLowerCase().includes('football')||name.toLowerCase().includes('soccer')?'football':'default'
  const missingOptions = SPORT_MISSING[sportKey]||SPORT_MISSING.default

  // Load last session data for progressive overload
  useEffect(()=>{
    if(type==='gym') loadLastSessions()
  },[type])

  async function loadLastSessions() {
    const uid = auth.currentUser?.uid
    if(!uid) return
    try {
      const q = query(collection(db, 'personal_records'), where('user_id', '==', uid), orderBy('logged_date', 'desc'))
      const snap = await getDocs(q)
      const map: Record<string,LastSession> = {}
      snap.docs.forEach((d)=>{
        const pr = d.data()
        if(!map[pr.exercise]||pr.weight_kg>map[pr.exercise].bestWeight) {
          map[pr.exercise]={exercise:pr.exercise,bestWeight:pr.weight_kg,bestReps:pr.reps}
        }
      })
      setLastSessions(map)
    } catch(e) {
      console.error('Error loading last sessions:', e)
    }
  }

  function addExercise(n:string){
    if(!exercises.find(e=>e.name===n)) setExercises(p=>[...p,{name:n,sets:[{reps:'',weight:''}]}])
  }
  function addSet(i:number){setExercises(p=>p.map((e,j)=>j===i?{...e,sets:[...e.sets,{reps:'',weight:''}]}:e))}
  function updateSet(ei:number,si:number,f:'reps'|'weight',v:string){
    setExercises(p=>p.map((e,i)=>i===ei?{...e,sets:e.sets.map((s,j)=>j===si?{...s,[f]:v}:s)}:e))
    // Check for PR in real time
    const ex = exercises[ei]
    if(ex && f==='weight') {
      const last = lastSessions[ex.name]
      if(last && +v > last.bestWeight && !newPRs.includes(ex.name)) {
        setNewPRs(p=>[...p,ex.name])
      }
    }
  }
  function removeEx(i:number){setExercises(p=>p.filter((_,j)=>j!==i))}
  function toggleMissing(x:string){
    setMissing(missing.includes(x)?missing.filter(i=>i!==x):[...missing,x])
    // Generate drills for selected weaknesses
    const sportDrills = SPORT_DRILLS[sportKey]||{}
    const updated = missing.includes(x)?missing.filter(i=>i!==x):[...missing,x]
    const drills = updated
      .filter(m=>sportDrills[m])
      .map(m=>({area:m,drills:sportDrills[m]}))
    setSuggestedDrills(drills)
  }

  const perfLabel = ['','Poor','Below avg','Average','Decent','OK','Good','Great','Excellent','Outstanding','Perfect'][performance]||'Good'
  const perfColor = performance<=3?'#ef4444':performance<=5?'#f59e0b':performance<=7?'#10b981':performance<=9?'#3b82f6':'#8b5cf6'

  async function save() {
    setSaving(true)
    const uid = auth.currentUser?.uid
    if(!uid) {
      alert('Not logged in')
      setSaving(false)
      return
    }

    try {
      // Save habit log
      await setDoc(doc(db, 'habit_logs', `${uid}_${date}`), {
        habit_id: habitId,
        logged_date: date,
        user_id: uid,
        note: notes,
        performance: type==='sport'?performance:null,
        created_at: new Date()
      }, { merge: true })

      if(type==='gym' && exercises.length>0) {
        // Save workout log
        await addDoc(collection(db, 'workout_logs'), {
          user_id: uid,
          logged_date: date,
          exercises,
          created_at: new Date()
        })
        // Save PRs
        for(const ex of exercises) {
          const bestSet = ex.sets.reduce((best:any,s)=>{
            return (!best||+s.weight>+best.weight)?s:best
          },null)
          if(bestSet && +bestSet.weight>0) {
            const last = lastSessions[ex.name]
            if(!last || +bestSet.weight >= last.bestWeight) {
              await addDoc(collection(db, 'personal_records'), {
                user_id: uid,
                exercise: ex.name,
                weight_kg: +bestSet.weight,
                reps: +bestSet.reps||0,
                logged_date: date,
                rpe,
                created_at: new Date()
              })
            }
          }
        }
      }

      if(type==='sport') {
        await addDoc(collection(db, 'sport_logs'), {
          user_id: uid,
          sport: name,
          logged_date: date,
          performance,
          what_went_well: wentWell,
          what_was_missing: missing.join(', '),
          notes,
          created_at: new Date()
        })
      }

      setSaving(false)
      router.push('/habits')
    } catch(e) {
      console.error('Error saving:', e)
      alert('Error saving. Check console.')
      setSaving(false)
    }
  }

  const Card = ({children,className=''}:{children:React.ReactNode,className?:string})=>(
    <div className={`rounded-2xl p-4 mb-4 ${className}`} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>{children}</div>
  )
  const Label = ({children}:{children:React.ReactNode})=>(
    <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">{children}</p>
  )
  const Pill = ({label,active,onClick,color:c}:{label:string,active:boolean,onClick:()=>void,color?:string})=>(
    <button onClick={onClick} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all border"
      style={active?{background:`${c||cfg.accent}22`,borderColor:`${c||cfg.accent}55`,color:c||cfg.accent}:{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
      {label}
    </button>
  )

  return (
    <PageContainer title="📝 Log Entry" subtitle="New entry">
      <div className="min-h-screen pb-10" style={{background:'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)'}}>
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center gap-3 pt-8 pb-5">
            <button onClick={()=>router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{cfg.icon} {name}</h1>
              <p className="text-zinc-500 text-xs">{new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
            </div>
          </div>

          {/* New PR alert */}
          {newPRs.length>0 && (
            <div className="rounded-2xl p-4 mb-4 text-center" style={{background:'linear-gradient(135deg,rgba(234,179,8,0.15),rgba(245,158,11,0.08))',border:'1px solid rgba(234,179,8,0.3)'}}>
              <p className="text-2xl mb-1">🏆</p>
              <p className="text-yellow-400 font-bold text-sm">New Personal Record!</p>
              <p className="text-zinc-300 text-xs mt-1">{newPRs.join(', ')}</p>
            </div>
          )}

          {/* GYM */}
          {type==='gym' && <>
            <Card>
              <Label>Muscle group</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {MUSCLE_GROUPS.map(g=><Pill key={g} label={g} active={muscleGroup===g} onClick={()=>setMuscleGroup(g)}/>)}
              </div>
              <Label>Select exercises</Label>
              <div className="flex flex-wrap gap-2">
                {EXERCISES[muscleGroup].map(ex=>{
                  const added = !!exercises.find(e=>e.name===ex)
                  const hasLast = !!lastSessions[ex]
                  return (
                    <button key={ex} onClick={()=>addExercise(ex)} className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all border" style={added?{background:`${cfg.accent}22`,borderColor:`${cfg.accent}55`,color:cfg.accent}:{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:hasLast?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.4)'}}>
                      {added?'✓ ':''}{ex}{hasLast?` (PR: ${lastSessions[ex].bestWeight}kg)`:''}
                    </button>
                  )
                })}
              </div>
            </Card>

            {exercises.map((ex,ei)=>{
              const last = lastSessions[ex.name]
              const isPR = newPRs.includes(ex.name)
              return (
                <Card key={ex.name}>
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="font-bold text-white text-sm">{ex.name}</p>
                      {last && <p className="text-xs mt-0.5" style={{color:cfg.accent}}>Previous best: {last.bestWeight}kg × {last.bestReps} reps — beat it!</p>}
                      {isPR && <p className="text-yellow-400 text-xs">🏆 New PR this session!</p>}
                    </div>
                    <button onClick={()=>removeEx(ei)} className="text-zinc-600 hover:text-red-400 text-xl">×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600 mb-2 px-1"><span>Set</span><span>kg</span><span>Reps</span></div>
                  {ex.sets.map((s,si)=>(
                    <div key={si} className="grid grid-cols-3 gap-2 mb-2">
                      <span className="text-zinc-500 text-sm flex items-center pl-1">{si+1}</span>
                      <input 
                        defaultValue={s.weight} 
                        onBlur={e=>updateSet(ei,si,'weight',e.target.value)}
                        type="number" 
                        placeholder="0" 
                        className="rounded-lg px-3 py-2 text-sm text-white text-center outline-none" 
                        style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}
                      />
                      <input 
                        defaultValue={s.reps} 
                        onBlur={e=>updateSet(ei,si,'reps',e.target.value)} 
                        type="number" 
                        placeholder="0" 
                        className="rounded-lg px-3 py-2 text-sm text-white text-center outline-none" 
                        style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}
                      />
                    </div>
                  ))}
                  <button onClick={()=>addSet(ei)} className="text-xs mt-1" style={{color:cfg.accent}}>+ Add set</button>
                </Card>
              )
            })}

            {exercises.length>0 && (
              <Card>
                <Label>RPE — Rate of Perceived Exertion</Label>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl font-black text-white">{rpe}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{color:rpe>=9?'#ef4444':rpe>=7?'#f97316':rpe>=5?'#f59e0b':'#10b981'}}>{rpe>=9?'Max effort':rpe>=7?'Hard':rpe>=5?'Moderate':'Easy'}</p>
                    <p className="text-zinc-600 text-xs">out of 10</p>
                  </div>
                </div>
                <input type="range" min="1" max="10" value={rpe} onChange={e=>setRpe(+e.target.value)} className="w-full" style={{accentColor:cfg.accent}}/>
              </Card>
            )}
          </>}

          {/* SPORT */}
          {type==='sport' && <>
            <Card>
              <Label>Performance rating</Label>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-6xl font-black text-white">{performance}</span>
                <div className="mb-2"><span className="text-lg font-bold" style={{color:perfColor}}>{perfLabel}</span><p className="text-zinc-600 text-xs">out of 10</p></div>
              </div>
              <input type="range" min="1" max="10" value={performance} onChange={e=>setPerformance(+e.target.value)} className="w-full mb-2" style={{accentColor:cfg.accent}}/>
              <div className="flex justify-between text-xs text-zinc-700"><span>1</span><span>5</span><span>10</span></div>
            </Card>
            <Card>
              <Label>What went well</Label>
              <textarea value={wentWell} onChange={e=>setWentWell(e.target.value)} placeholder="Goals, good plays, wins..." rows={3} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none resize-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}/>
            </Card>
            <Card>
              <Label>Areas to improve — tap to select</Label>
              <div className="flex flex-wrap gap-2">
                {missingOptions.map(x=><Pill key={x} label={(missing.includes(x)?'✗ ':'')+x} active={missing.includes(x)} onClick={()=>toggleMissing(x)} color="#ef4444"/>)}
              </div>
            </Card>

            {/* Drill suggestions */}
            {suggestedDrills.length>0 && (
              <div className="rounded-2xl p-4 mb-4" style={{background:'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.06))',border:'1px solid rgba(16,185,129,0.25)'}}>
                <p className="text-emerald-400 text-xs uppercase tracking-widest mb-3">🎯 Recommended drills for next session</p>
                {suggestedDrills.map(({area,drills})=>(
                  <div key={area} className="mb-4 last:mb-0">
                    <p className="text-white text-xs font-bold mb-2 flex items-center gap-1"><span className="text-red-400">⚠</span> {area}</p>
                    <div className="flex flex-col gap-1.5">
                      {drills.slice(0,3).map((d,i)=>(
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 text-xs mt-0.5 flex-shrink-0">→</span>
                          <p className="text-zinc-300 text-xs">{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>}

          {/* CARDIO */}
          {type==='cardio' && (
            <Card>
              <Label>Session details</Label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><p className="text-zinc-500 text-xs mb-1.5">Duration (min)</p><input value={duration} onChange={e=>setDuration(e.target.value)} type="number" placeholder="30" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/></div>
                <div><p className="text-zinc-500 text-xs mb-1.5">Distance (km)</p><input value={distance} onChange={e=>setDistance(e.target.value)} type="number" placeholder="5" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/></div>
              </div>
            </Card>
          )}

          {/* STEPS */}
          {type==='steps' && (
            <Card>
              <Label>Steps today</Label>
              <input value={steps} onChange={e=>setSteps(e.target.value)} type="number" placeholder="8000" className="w-full rounded-xl px-4 py-4 text-2xl text-white outline-none text-center font-bold" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/>
              {steps && <div className="h-2 rounded-full overflow-hidden mt-3" style={{background:'rgba(255,255,255,0.06)'}}><div className="h-full rounded-full" style={{width:`${Math.min(100,(+steps/10000)*100)}%`,background:cfg.accent}}/></div>}
              {steps && <p className="text-center text-xs mt-2" style={{color:+steps>=10000?'#10b981':'rgba(255,255,255,0.4)'}}>{+steps>=10000?'✅ Goal reached!':`${(10000-+steps).toLocaleString()} steps to go`}</p>}
            </Card>
          )}

          {/* WATER */}
          {type==='water' && (
            <Card>
              <Label>Glasses of water</Label>
              <div className="flex items-center justify-center gap-6 py-4">
                <button onClick={()=>setGlasses(Math.max(0,glasses-1))} className="w-12 h-12 rounded-full text-2xl font-bold text-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.07)'}}>−</button>
                <div className="text-center"><span className="text-6xl font-black text-white">{glasses}</span><p className="text-zinc-500 text-xs mt-1">glasses</p></div>
                <button onClick={()=>setGlasses(Math.min(20,glasses+1))} className="w-12 h-12 rounded-full text-2xl font-bold text-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.07)'}}>+</button>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-center mt-2">
                {Array.from({length:8}).map((_,i)=><div key={i} className="text-2xl transition-all" style={{opacity:i<glasses?1:0.15}}>💧</div>)}
              </div>
              <p className="text-center text-xs mt-3" style={{color:glasses>=8?'#10b981':'rgba(255,255,255,0.3)'}}>{glasses>=8?'✅ Daily goal reached!!':`${8-glasses} more to hit goal`}</p>
            </Card>
          )}

          {/* SLEEP */}
          {type==='sleep' && (
            <Card>
              <Label>Hours slept</Label>
              <div className="flex items-center justify-center gap-6 py-2 mb-4">
                <button onClick={()=>setHours(Math.max(0,hours-.5))} className="w-12 h-12 rounded-full text-xl font-bold text-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.07)'}}>−</button>
                <div className="text-center"><span className="text-6xl font-black text-white">{hours}</span><p className="text-zinc-500 text-xs mt-1">hours</p></div>
                <button onClick={()=>setHours(Math.min(12,hours+.5))} className="w-12 h-12 rounded-full text-xl font-bold text-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.07)'}}>+</button>
              </div>
              <Label>Sleep quality</Label>
              <div className="flex gap-2 flex-wrap">
                {['😴 Terrible','😔 Poor','😐 OK','🙂 Good','😊 Great'].map((q,i)=><Pill key={q} label={q} active={sleepQuality===i} onClick={()=>setSleepQuality(i)}/>)}
              </div>
            </Card>
          )}

          {/* READING */}
          {type==='reading' && (
            <Card>
              <Label>Pages read</Label>
              <input value={pages} onChange={e=>setPages(e.target.value)} type="number" placeholder="20" className="w-full rounded-xl px-4 py-4 text-2xl text-white outline-none text-center font-bold mb-4" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/>
              <Label>Genre</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {GENRES.map(g=><Pill key={g} label={g} active={genre===g} onClick={()=>setGenre(g)}/>)}
              </div>
              <Label>Session rating</Label>
              <div className="flex items-center gap-2 py-2">
                {[1,2,3,4,5].map(star=>(
                  <button key={star} onClick={()=>setSessionRating(star)} className="text-3xl transition-all hover:scale-110 active:scale-95" style={{color:star<=sessionRating?'#f59e0b':'rgba(255,255,255,0.1)',filter:star<=sessionRating?'drop-shadow(0 0 6px #f59e0b88)':'none'}}>★</button>
                ))}
                <span className="text-sm ml-2" style={{color:sessionRating>=4?'#f59e0b':'rgba(255,255,255,0.3)'}}>{['','Weak','OK','Good','Great','Excellent'][sessionRating]}</span>
              </div>
            </Card>
          )}

          {/* YOGA */}
          {type==='yoga' && (
            <Card>
              <Label>Yoga style</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {YOGA_TYPES.map(y=><Pill key={y} label={y} active={yogaType===y} onClick={()=>setYogaType(y)}/>)}
              </div>
            </Card>
          )}

          {/* MEDITATION */}
          {type==='meditation' && (
            <Card>
              <Label>Duration (minutes)</Label>
              <input value={duration} onChange={e=>setDuration(e.target.value)} type="number" placeholder="10" className="w-full rounded-xl px-4 py-4 text-2xl text-white outline-none text-center font-bold" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/>
            </Card>
          )}

          {/* JOURNAL */}
          {type==='journal' && (
            <Card>
              <Label>3 things I'm grateful for</Label>
              <textarea value={gratitude} onChange={e=>setGratitude(e.target.value)} placeholder="1. &#10;2. &#10;3. " rows={5} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none resize-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}/>
            </Card>
          )}

          {/* NUTRITION */}
          {type==='nutrition' && (
            <Card>
              <Label>Meals today</Label>
              <div className="flex items-center justify-center gap-6 py-2 mb-4">
                <button onClick={()=>setMeals(Math.max(0,meals-1))} className="w-12 h-12 rounded-full text-xl font-bold text-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.07)'}}>−</button>
                <div className="text-center"><span className="text-5xl font-black text-white">{meals}</span><p className="text-zinc-500 text-xs mt-1">meals</p></div>
                <button onClick={()=>setMeals(Math.min(8,meals+1))} className="w-12 h-12 rounded-full text-xl font-bold text-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.07)'}}>+</button>
              </div>
              <Label>Calories (optional)</Label>
              <input value={calories} onChange={e=>setCalories(e.target.value)} type="number" placeholder="2000" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/>
            </Card>
          )}

          {/* LEARNING / LANGUAGE */}
          {type==='learning' && (
            <Card>
              <Label>Language</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {LANGUAGES.map(l=><Pill key={l} label={l} active={language===l} onClick={()=>setLanguage(l)}/>)}
              </div>
              <Label>Session rating</Label>
              <div className="flex items-center gap-2 py-2 mb-4">
                {[1,2,3,4,5].map(star=>(
                  <button key={star} onClick={()=>setSessionRating(star)} className="text-3xl transition-all hover:scale-110 active:scale-95" style={{color:star<=sessionRating?'#f59e0b':'rgba(255,255,255,0.1)',filter:star<=sessionRating?'drop-shadow(0 0 6px #f59e0b88)':'none'}}>★</button>
                ))}
                <span className="text-sm ml-2" style={{color:sessionRating>=4?'#f59e0b':'rgba(255,255,255,0.3)'}}>{['','Weak','OK','Good','Great','Excellent'][sessionRating]}</span>
              </div>
              <Label>Duration (minutes)</Label>
              <input value={duration} onChange={e=>setDuration(e.target.value)} type="number" placeholder="30" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none text-center" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/>
            </Card>
          )}

          {/* FOCUS */}
          {type==='focus' && (
            <Card>
              <Label>Duration (minutes)</Label>
              <input value={focusDuration} onChange={e=>setFocusDuration(e.target.value)} type="number" placeholder="90" className="w-full rounded-xl px-4 py-4 text-2xl text-white outline-none text-center font-bold mb-4" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}/>
              <Label>Tasks completed</Label>
              <textarea value={tasks} onChange={e=>setTasks(e.target.value)} placeholder="What did you get done?" rows={3} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none resize-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}/>
            </Card>
          )}

          {/* Mood */}
          {cfg.sections.includes('mood') && (
            <Card>
              <Label>Mood</Label>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map((m,i)=><Pill key={m} label={m} active={mood===i} onClick={()=>setMood(i)}/>)}
              </div>
            </Card>
          )}

          {/* Energy */}
          {cfg.sections.includes('energy') && (
            <Card>
              <Label>Energy level</Label>
              <div className="flex gap-2 flex-wrap">
                {ENERGY.map((e,i)=><Pill key={e} label={e} active={energy===i} onClick={()=>setEnergy(i)}/>)}
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <Label>Notes (optional)</Label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anything else..." rows={3} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none resize-none" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}/>
          </Card>

          <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-2" style={{background:`linear-gradient(135deg,${cfg.accent},${cfg.accent}99)`,boxShadow:`0 6px 24px ${cfg.accent}44`}}>
            {saving?'Saving...':`${cfg.icon} Save ${cfg.title}`}
          </button>
        </div>
      </div>
    </PageContainer>
  )
}

export default function LogPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{background:'#07071a'}}><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/></div>}><LogContent/></Suspense>
}