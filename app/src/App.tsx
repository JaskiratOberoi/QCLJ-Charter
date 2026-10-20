import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PrintProvider } from './components/print'
import { Shell } from './components/Shell'
import { shouldShowSplash, Splash } from './components/Splash'
import { useAuth } from './lib/auth'
import { useStore } from './lib/store'
import { LoginPage } from './pages/Login'
import { ChartsPage } from './pages/Charts'
import { EntryPage } from './pages/Entry'
import { OverviewPage } from './pages/Overview'
import { QcPage } from './pages/Qc'
import { ReportsPage } from './pages/Reports'
import { RunsPage } from './pages/Runs'
import { SetupPage } from './pages/Setup'

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const signedIn = useAuth((s) => !!s.cred)
  const [splash, setSplash] = useState(shouldShowSplash)
  const overlay = splash ? <Splash onDone={() => setSplash(false)} /> : null
  if (!signedIn)
    return (
      <>
        {overlay}
        <LoginPage />
      </>
    )
  if (!hydrated)
    return (
      <>
        {overlay}
        <div className="grid h-full place-items-center text-sm text-muted">Opening workspace…</div>
      </>
    )
  return (
    <PrintProvider>
      {overlay}
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<OverviewPage />} />
            <Route path="charts" element={<ChartsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="entry" element={<EntryPage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="qc" element={<QcPage />} />
            <Route path="setup" element={<SetupPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PrintProvider>
  )
}
