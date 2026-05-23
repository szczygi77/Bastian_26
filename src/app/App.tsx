import { useEffect } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { APP_NAME } from '@/config/app'
import { useAppStore } from '@/store/useAppStore'
import { LoginPage } from '@/pages/LoginPage'
import { AppLayout } from '@/layouts/AppLayout'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { TacticalMap } from '@/features/map/TacticalMap'
import { DependencyGraph } from '@/features/graph/DependencyGraph'
import { ScenarioEngine } from '@/features/scenarios/ScenarioEngine'
import { AlertCenter } from '@/features/alerts/AlertCenter'
import { DecisionSupport } from '@/features/ai/DecisionSupport'
import { SkyMarshal } from '@/features/skymarshal/SkyMarshal'
import { AuditLog } from '@/features/audit/AuditLog'
import { ComplianceCenter } from '@/features/compliance/ComplianceCenter'
import { SystemStatus } from '@/features/system/SystemStatus'
import { ReportGenerator } from '@/features/reports/ReportGenerator'
import { initDatabase, hydrateFromDatabase, flushSyncQueue } from '@/services/databaseService'
import { setAuditLog } from '@/services/auditLogService'

const VIEW_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  map: TacticalMap,
  graph: DependencyGraph,
  scenarios: ScenarioEngine,
  alerts: AlertCenter,
  ai: DecisionSupport,
  skymarshal: SkyMarshal,
  audit: AuditLog,
  compliance: ComplianceCenter,
  system: SystemStatus,
  reports: ReportGenerator,
}

export default function App() {
  const { operator, activeView, setOnline, refreshSystemHealth, loadIkLocations, hydrateDatabase } = useAppStore()

  useEffect(() => {
    document.title = APP_NAME
  }, [])

  useEffect(() => {
    void (async () => {
      await initDatabase()
      const data = await hydrateFromDatabase()
      hydrateDatabase(data)
      setAuditLog(data.auditEntries)
      await flushSyncQueue()
      refreshSystemHealth()
    })()
  }, [hydrateDatabase, refreshSystemHealth])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      void flushSyncQueue().then(() => refreshSystemHealth())
      loadIkLocations()
    }
    const handleOffline = () => {
      setOnline(false)
      refreshSystemHealth()
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline, refreshSystemHealth, loadIkLocations])

  useEffect(() => {
    if (operator) loadIkLocations()
  }, [operator, loadIkLocations])

  if (!operator) {
    return (
      <ToastProvider>
        <LoginPage />
      </ToastProvider>
    )
  }

  const ActiveView = VIEW_COMPONENTS[activeView] ?? Dashboard

  return (
    <ToastProvider>
      <AppLayout>
        <ActiveView />
      </AppLayout>
    </ToastProvider>
  )
}
