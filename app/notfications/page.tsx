'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { PageContainer } from '@/components/navigation'

type NotificationSettings = {
  habitReminders: boolean
  habitReminderTime: string
  dailyReview: boolean
  dailyReviewTime: string
  weeklyReview: boolean
  weeklyReviewDay: string
  achievementAlerts: boolean
  motivationalTips: boolean
}

const defaultSettings: NotificationSettings = {
  habitReminders: true,
  habitReminderTime: '09:00',
  dailyReview: true,
  dailyReviewTime: '20:00',
  weeklyReview: true,
  weeklyReviewDay: 'Sunday',
  achievementAlerts: true,
  motivationalTips: true,
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setLoading(false)
        return
      }
      const snap = await getDoc(doc(db, 'user_settings', uid))
      if (snap.exists()) {
        setSettings({ ...defaultSettings, ...snap.data().notifications })
      }
      setLoading(false)
    } catch (e) {
      console.error('Error loading settings:', e)
      setLoading(false)
    }
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const uid = auth.currentUser?.uid
      if (!uid) return
      await setDoc(
        doc(db, 'user_settings', uid),
        { notifications: settings },
        { merge: true }
      )
      setSaving(false)
    } catch (e) {
      console.error('Error saving settings:', e)
      setSaving(false)
    }
  }

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-4 mb-4 ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">{children}</p>
  )

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className="w-12 h-7 rounded-full transition-all flex items-center"
      style={{
        background: checked ? '#00D9FF' : 'rgba(255,255,255,0.1)',
        padding: '2px'
      }}
    >
      <div
        className="w-5 h-5 rounded-full bg-white transition-transform"
        style={{
          transform: checked ? 'translateX(20px)' : 'translateX(0)'
        }}
      />
    </button>
  )

  if (loading) {
    return (
      <PageContainer title="🔔 Notifications" subtitle="Reminders & alerts">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="🔔 Notifications" subtitle="Reminders & alerts">
      <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Habit Reminders */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-white text-sm">📋 Habit Reminders</p>
                <p className="text-zinc-500 text-xs mt-1">Daily reminders to log habits</p>
              </div>
              <Toggle checked={settings.habitReminders} onChange={v => setSettings({ ...settings, habitReminders: v })} />
            </div>
            {settings.habitReminders && (
              <div>
                <Label>Reminder time</Label>
                <input
                  type="time"
                  value={settings.habitReminderTime}
                  onChange={e => setSettings({ ...settings, habitReminderTime: e.target.value })}
                  className="w-full rounded-lg px-4 py-2 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            )}
          </Card>

          {/* Daily Review */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-white text-sm">📊 Daily Review</p>
                <p className="text-zinc-500 text-xs mt-1">Reminder to review your day</p>
              </div>
              <Toggle checked={settings.dailyReview} onChange={v => setSettings({ ...settings, dailyReview: v })} />
            </div>
            {settings.dailyReview && (
              <div>
                <Label>Review time</Label>
                <input
                  type="time"
                  value={settings.dailyReviewTime}
                  onChange={e => setSettings({ ...settings, dailyReviewTime: e.target.value })}
                  className="w-full rounded-lg px-4 py-2 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            )}
          </Card>

          {/* Weekly Review */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-white text-sm">📈 Weekly Review</p>
                <p className="text-zinc-500 text-xs mt-1">Weekly summary and insights</p>
              </div>
              <Toggle checked={settings.weeklyReview} onChange={v => setSettings({ ...settings, weeklyReview: v })} />
            </div>
            {settings.weeklyReview && (
              <div>
                <Label>Review day</Label>
                <select
                  value={settings.weeklyReviewDay}
                  onChange={e => setSettings({ ...settings, weeklyReviewDay: e.target.value })}
                  className="w-full rounded-lg px-4 py-2 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          {/* Achievement Alerts */}
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white text-sm">🏆 Achievement Alerts</p>
                <p className="text-zinc-500 text-xs mt-1">Notifications when you hit milestones</p>
              </div>
              <Toggle checked={settings.achievementAlerts} onChange={v => setSettings({ ...settings, achievementAlerts: v })} />
            </div>
          </Card>

          {/* Motivational Tips */}
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white text-sm">💡 Motivational Tips</p>
                <p className="text-zinc-500 text-xs mt-1">Daily inspiration & insights</p>
              </div>
              <Toggle checked={settings.motivationalTips} onChange={v => setSettings({ ...settings, motivationalTips: v })} />
            </div>
          </Card>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-6"
            style={{
              background: 'linear-gradient(135deg,#00D9FF,#00D9FF99)',
              boxShadow: '0 6px 24px #00D9FF44'
            }}
          >
            {saving ? 'Saving...' : '✅ Save Settings'}
          </button>
        </div>
      </div>
    </PageContainer>
  )
}