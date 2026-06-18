import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import CosmicBackground from '@/components/shared/CosmicBackground'
import SplashScreen from '@/components/shared/SplashScreen'
import Sidebar from '@/components/layout/Sidebar'
import Dashboard from '@/pages/Dashboard'
import WorkspacePage from '@/pages/WorkspacePage'
import SubjectPage from '@/pages/SubjectPage'
import TopicPage from '@/pages/TopicPage'
import SearchPage from '@/pages/SearchPage'
import {
  RecentPage, ArchivePage, SettingsPage,
  AnalyticsPage, AuditPage, AdminPage, LoginPage
} from '@/pages/OtherPages'
import { useStore } from '@/store'
import { appConfig } from '@/config/appConfig'
import { motion, AnimatePresence } from 'framer-motion'

function AppContent() {
  const { activePage } = useStore()

  const pageMap: Record<string, JSX.Element> = {
    dashboard: <Dashboard />,
    workspace: <WorkspacePage />,
    subject:   <SubjectPage />,
    topic:     <TopicPage />,
    search:    <SearchPage />,
    recent:    <RecentPage />,
    archive:   <ArchivePage />,
    settings:  <SettingsPage />,
    analytics: <AnalyticsPage />,
    audit:     <AuditPage />,
    admin:     <AdminPage />,
  }

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <Sidebar />
      <main className="flex-1 overflow-y-auto thin-scroll relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="min-h-full"
          >
            {pageMap[activePage] || <Dashboard />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function App() {
  const { user, setUser, fetchWorkspaces, fetchRecentActivity } = useStore()
  const [checking, setChecking] = useState(true)
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search)
      const tokenFromRedirect = params.get('token')
      if (tokenFromRedirect) {
        localStorage.setItem('__akshar_token', tokenFromRedirect)
        window.history.replaceState({}, '', window.location.pathname)
      }
      const token = localStorage.getItem('__akshar_token')
      if (!token) { setChecking(false); return }
      try {
        const res = await fetch(`${appConfig.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json()
          setUser({
            id:                json.data.id,
            name:              json.data.name,
            email:             json.data.email,
            googleId:          json.data.google_id,
            avatar:            json.data.avatar ?? '',
            role:              json.data.role,
            status:            json.data.status,
            createdAt:         json.data.created_at,
            lastLogin:         json.data.last_login,
            driveConnected:    json.data.drive_connected,
            driveRootFolderId: json.data.drive_root_folder_id,
          })
          await Promise.all([fetchWorkspaces(), fetchRecentActivity()])
        } else {
          localStorage.removeItem('__akshar_token')
        }
      } catch {
        localStorage.removeItem('__akshar_token')
      }
      setChecking(false)
    }
    init()
  }, [])

  const handleLogin = () => { window.location.href = `${appConfig.apiUrl}/auth/google` }

  const handleLogout = async () => {
    try {
      await fetch(`${appConfig.apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('__akshar_token')}` },
        credentials: 'include',
      })
    } catch { /* ignore */ }
    localStorage.removeItem('__akshar_token')
    setUser(null)
  }
  ;(window as any).__aksharLogout = handleLogout

  if (!splashDone) return (
    <>
      <CosmicBackground />
      <SplashScreen onDone={() => setSplashDone(true)} />
    </>
  )

  if (checking) return (
    <>
      <CosmicBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden animate-float">
            <img src="/src/assets/logo.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm" style={{ color: 'rgba(232,230,240,0.4)' }}>Loading…</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <CosmicBackground />
      <div className="sacred-geometry fixed inset-0 z-0 pointer-events-none" />
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="login" className="relative z-10 min-h-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage onLogin={handleLogin} />
          </motion.div>
        ) : (
          <motion.div key="app" className="relative z-10 h-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AppContent />
          </motion.div>
        )}
      </AnimatePresence>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f0f1a', color: '#e8e6f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontSize: '13px',
          },
          success: { iconTheme: { primary: '#93c5fd', secondary: '#050508' } },
        }}
      />
    </>
  )
}
