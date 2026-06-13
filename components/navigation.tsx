'use client'
import { usePathname, useRouter } from 'next/navigation'

export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { icon: '🏠', label: 'Home', path: '/dashboard', activeMatch: ['/dashboard'] },
    { icon: '✅', label: 'Habits', path: '/habits', activeMatch: ['/habits', '/log'] },
    { icon: '🏋️', label: 'Gym', path: '/gym-history', activeMatch: ['/gym-history', '/gym', '/analytics'] },
    { icon: '📊', label:'Stats', path:'/stats' , activeMatch: ['/stats'] },
    { icon: '🎯', label: 'Goals', path: '/goals', activeMatch: ['/goals', '/body'] },
    { icon: '⚙️', label: 'More', path: '/settings', activeMatch: ['/settings', '/notifications', '/leaderboard', '/weekly-review', '/rest-coach', '/export'] },
  ]

  const isActive = (item: typeof navItems[0]) => item.activeMatch.some(match => pathname?.startsWith(match))

  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pt-2 z-50" style={{background:'linear-gradient(180deg,rgba(10,8,25,0) 0%,rgba(10,8,25,0.98) 60%,rgba(10,8,25,1) 100%)'}}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around rounded-3xl px-2 py-3" style={{background:'rgba(10,8,25,0.92)',border:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(20px)',boxShadow:'0 -8px 32px rgba(0,0,0,0.4)'}}>
          {navItems.map(item => {
            const active = isActive(item)
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200"
                style={active ? {background:'rgba(124,58,237,0.2)'} : {}}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium" style={{color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)'}}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PageContainer({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const router = useRouter()
  
  return (
    <div className="min-h-screen pb-28" style={{background:'linear-gradient(160deg,#07071a 0%,#0d0920 50%,#070d18 100%)'}}>
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center gap-3 pt-8 pb-5">
          <button 
            onClick={() => router.back()} 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors" 
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-zinc-500 text-xs">{subtitle}</p>}
          </div>
        </div>

        {children}
      </div>

      <BottomNavigation />
    </div>
  )
}