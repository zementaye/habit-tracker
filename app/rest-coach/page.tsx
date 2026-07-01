'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { PageContainer } from '@/components/navigation'

export default function RestCoachPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    avgSleep: 6.5,
    recoveryScore: 72,
    recommendation: 'Increase sleep by 1 hour'
  })

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
      <PageContainer title="😴 Rest Coach" subtitle="Recovery insights">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="😴 Rest Coach" subtitle="Recovery insights">
      <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-zinc-500 text-xs mb-2">Recovery Score</p>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-indigo-400">{data.recoveryScore}</p>
              <p className="text-zinc-400 text-xs mb-1">/100</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-zinc-500 text-xs mb-2">Average Sleep</p>
            <p className="text-3xl font-bold text-blue-400">{data.avgSleep}h</p>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white text-sm mb-3">💡 Recommendation</p>
            <p className="text-zinc-300 text-sm">{data.recommendation}</p>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <p className="text-indigo-400 text-xs">Rest well, train hard. Recovery is where gains happen!</p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}