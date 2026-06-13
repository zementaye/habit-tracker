'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/navigation'

export default function SettingsPage() {
  const [showLogout, setShowLogout] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sections = [
    {
      title: '⏰ Routines',
      items: [
        { icon: '⏰', label: 'Daily Routines', path: '/routine-setup', desc: 'Create your routines' },
        { icon: '📊', label: 'Routine Analytics', path: '/routine-analytics', desc: 'Your completion rate' },
      { icon: '🔥', label: 'Heatmap', path: '/heatmap', desc: 'Heatmap of your habits throughout the year' , activeMatch: ['/heatmap'] },
      ]
    },
    {
      title: '📈 Advanced',
      items: [
        { icon: '📊', label: 'Training Analytics', path: '/analytics', desc: 'Volume & trends' },
        { icon: '🏥', label: 'Rest Day Coach', path: '/rest-coach', desc: 'Readiness recommendations' },
        { icon: '📋', label: 'Weekly Review', path: '/weekly-review', desc: 'Your weekly report' },
        { icon: '🏋️', label: 'Training Splits', path: '/splits', desc: 'Workout structure' },
      ]
    },
    {
      title: '🎯 Goals & Tracking',
      items: [
        { icon: '🎯', label: 'My Goals', path: '/goals', desc: 'Track your targets' },
        { icon: '📏', label: 'Body Metrics', path: '/body', desc: 'Weight & measurements' },
      ]
    },
    {
      title: '👥 Community & Data',
      items: [
        { icon: '🏆', label: 'Leaderboard', path: '/leaderboard', desc: 'Share your scores' },
        { icon: '💾', label: 'Export Data', path: '/export', desc: 'Download your data' },
      ]
    },
    {
      title: '⚙️ App Settings',
      items: [
        { icon: '🔔', label: 'Notifications', path: '/notifications', desc: 'Reminders & alerts' },
      ]
    },

    {
      title: '⚙️ AI Coach',
      items: [
        { icon: '🤖', label: 'AI Coach', path: '/coach', desc: 'Your friendly AI Coach' },
      ]
    },
  ]

  return (
    <PageContainer title="⚙️ Settings & More" subtitle="Access all features">
      <div className="flex flex-col gap-4">
        {sections.map((section, idx) => (
          <div key={idx}>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 px-1">{section.title}</p>
            <div className="flex flex-col gap-2 mb-4">
              {section.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}
                >
                  <span className="text-2xl w-10 flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-semibold">{item.label}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{color:'rgba(255,255,255,0.3)'}}>
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Account section */}
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 px-1">👤 Account</p>
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="w-full flex items-center justify-between p-4 rounded-2xl"
            style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)'}}
          >
            <div className="text-left">
              <p className="text-red-400 font-semibold text-sm">Sign Out</p>
              <p className="text-zinc-500 text-xs mt-0.5">Log out of your account</p>
            </div>
            <span className="text-red-400">→</span>
          </button>
          {showLogout && (
            <div className="mt-3 p-4 rounded-2xl" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
              <p className="text-white text-sm mb-3">Are you sure? You'll need to log back in.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogout(false)}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 rounded-lg text-sm font-bold"
                  style={{background:'rgba(239,68,68,0.3)',border:'1px solid rgba(239,68,68,0.5)',color:'#ef4444'}}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="rounded-2xl p-4 mt-4" style={{background:'rgba(124,58,237,0.05)',border:'1px solid rgba(124,58,237,0.15)'}}>
          <p className="text-zinc-400 text-xs mb-2">💡 Pro Tip</p>
          <p className="text-zinc-300 text-xs leading-relaxed">
            Pin your most-used features to your dashboard by visiting them regularly. The bottom navigation remembers where you go.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}