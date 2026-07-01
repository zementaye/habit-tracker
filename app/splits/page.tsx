'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PageContainer } from '@/components/navigation'

const SPLITS = [
  {
    name: 'Push/Pull/Legs',
    days: 6,
    description: 'Balanced 3-day split done twice per week'
  },
  {
    name: 'Upper/Lower',
    days: 4,
    description: 'Two upper days, two lower days'
  },
  {
    name: 'Full Body',
    days: 3,
    description: 'Complete body each session, 3x per week'
  },
  {
    name: 'Body Part Split',
    days: 5,
    description: 'One muscle group per day, 5 days per week'
  }
]

export default function SplitsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedSplit, setSelectedSplit] = useState('Push/Pull/Legs')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setLoading(false)
        return
      }
      setLoading(false)
    } catch (e) {
      console.error('Error loading data:', e)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageContainer title="💪 Workout Splits" subtitle="Program your training">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="💪 Workout Splits" subtitle="Program your training">
      <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          <p className="text-zinc-400 text-sm mb-4">Choose a split that fits your schedule and goals</p>

          {SPLITS.map(split => (
            <div 
              key={split.name} 
              onClick={() => setSelectedSplit(split.name)}
              className="rounded-2xl p-4 mb-3 cursor-pointer transition-all"
              style={{ 
                background: selectedSplit === split.name ? 'rgba(0,217,255,0.15)' : 'rgba(255,255,255,0.03)', 
                border: selectedSplit === split.name ? '1px solid rgba(0,217,255,0.5)' : '1px solid rgba(255,255,255,0.07)' 
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white text-sm">{split.name}</p>
                  <p className="text-zinc-500 text-xs mt-1">{split.description}</p>
                </div>
                <span className="text-2xl">{split.days}d</span>
              </div>
            </div>
          ))}

          <div className="rounded-2xl p-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <p className="text-emerald-400 text-xs font-bold mb-2">✅ {selectedSplit}</p>
            <p className="text-emerald-300 text-xs">This split is ideal for consistent progress. Start with this if you're unsure!</p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}