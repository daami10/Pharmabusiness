import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SettingsModal } from '@/features/settings/SettingsModal'
import { PrivacyModal } from '@/features/settings/PrivacyModal'
import { OnboardingModal } from '@/features/settings/OnboardingModal'
import { isOnboardingPending } from '@/lib/config/wholesalers'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(() => isOnboardingPending())

  return (
    <div className="flex min-h-screen">
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
    </div>
  )
}
