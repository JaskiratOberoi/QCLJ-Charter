import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PrintProvider } from './components/print'
import { Shell } from './components/Shell'
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
  if (!signedIn) return <LoginPage />
  if (!hydrated) return <div className="grid h-full place-items-center text-sm text-muted">Opening workspace…</div>
  return (
    <PrintProvider>
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
