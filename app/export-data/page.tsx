'use client'
import { useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { PageContainer } from '@/components/navigation'

export default function ExportDataPage() {
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')

  async function exportAsJSON() {
    setExporting(true)
    setMessage('Preparing your data...')
    
    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setMessage('Not logged in')
        setExporting(false)
        return
      }

      // Fetch all user data
      const collections = ['habits', 'habit_logs', 'personal_records', 'workout_logs', 'sport_logs', 'goals', 'body_metrics']
      const allData: Record<string, any[]> = {}

      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('user_id', '==', uid))
        const snap = await getDocs(q)
        allData[collectionName] = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      }

      // Create and download JSON
      const dataStr = JSON.stringify(allData, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `habit-tracker-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage('✅ Data exported successfully!')
      setExporting(false)
    } catch (e) {
      console.error('Error exporting:', e)
      setMessage('❌ Error exporting data. Check console.')
      setExporting(false)
    }
  }

  async function exportAsCSV() {
    setExporting(true)
    setMessage('Preparing your data...')

    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setMessage('Not logged in')
        setExporting(false)
        return
      }

      // Fetch habit logs
      const q = query(collection(db, 'habit_logs'), where('user_id', '==', uid))
      const snap = await getDocs(q)
      const logs = snap.docs.map(d => d.data())

      // Create CSV
      const headers = ['Date', 'Habit ID', 'Note', 'Performance']
      const rows = logs.map((log: any) => [
        log.logged_date,
        log.habit_id,
        log.note || '',
        log.performance || ''
      ])

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `habit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage('✅ CSV exported successfully!')
      setExporting(false)
    } catch (e) {
      console.error('Error exporting CSV:', e)
      setMessage('❌ Error exporting CSV. Check console.')
      setExporting(false)
    }
  }

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-4 mb-4 ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  )

  return (
    <PageContainer title="📥 Export Data" subtitle="Download your data">
      <div className="min-h-screen pb-10" style={{ background: 'linear-gradient(160deg,#07071a 0%,#0e0920 50%,#070d18 100%)' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          <Card>
            <p className="text-zinc-400 text-sm mb-4">
              Download all your habit tracking data in your preferred format. Your data is yours and can be imported into other apps or used for personal analysis.
            </p>
          </Card>

          <Card>
            <p className="font-bold text-white text-sm mb-3">📄 JSON Format</p>
            <p className="text-zinc-500 text-xs mb-4">Complete data including all collections. Best for backup and data portability.</p>
            <button
              onClick={exportAsJSON}
              disabled={exporting}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg,#3b82f6,#3b82f699)',
                boxShadow: '0 6px 24px #3b82f644'
              }}
            >
              {exporting ? 'Exporting...' : '⬇️ Export as JSON'}
            </button>
          </Card>

          <Card>
            <p className="font-bold text-white text-sm mb-3">📊 CSV Format</p>
            <p className="text-zinc-500 text-xs mb-4">Habit logs in spreadsheet format. Best for Excel, Google Sheets, or data analysis.</p>
            <button
              onClick={exportAsCSV}
              disabled={exporting}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg,#10b981,#10b98199)',
                boxShadow: '0 6px 24px #10b98144'
              }}
            >
              {exporting ? 'Exporting...' : '⬇️ Export as CSV'}
            </button>
          </Card>

          {message && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(0,217,255,0.1)', border: '1px solid rgba(0,217,255,0.3)' }}>
              <p className="text-cyan-400 text-sm">{message}</p>
            </div>
          )}

          <Card>
            <p className="text-zinc-500 text-xs">
              🔐 <strong>Privacy:</strong> Your data is processed locally and never stored on external servers. The download happens directly in your browser.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}