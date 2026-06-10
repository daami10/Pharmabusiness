import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SettingsModal } from '@/features/settings/SettingsModal'
import { PrivacyModal } from '@/features/settings/PrivacyModal'
import { OnboardingModal } from '@/features/settings/OnboardingModal'
import { isOnboardingPending } from '@/lib/config/wholesalers'
import { Chatbot } from './Chatbot'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(() => isOnboardingPending())

  return (
    <div className="relative min-h-screen bg-[#090d16] text-[#f1f5f9] antialiased overflow-x-hidden">
      {/* Glowing Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-500/20 to-[#00f2fe]/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-purple-500/15 to-[#00f2fe]/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex min-h-screen bg-transparent">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSettings={() => setSettingsOpen(true)}
          onPrivacy={() => setPrivacyOpen(true)}
        />
        <div className="flex flex-1 flex-col lg:pl-64">
          <Header onMenu={() => setSidebarOpen((v) => !v)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        <SettingsModal
          key={settingsOpen ? 'settings-open' : 'settings-closed'}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
        <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
        <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
        <Chatbot />
      </div>
    </div>
  )
}
