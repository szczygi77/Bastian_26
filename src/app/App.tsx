import { useEffect } from 'react'
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
  const { operator, activeView, setOnline, refreshSystemHealth } = useAppStore()

  useEffect(() => {
    const handleOnline = () => { setOnline(true); refreshSystemHealth() }
    const handleOffline = () => { setOnline(false); refreshSystemHealth() }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline, refreshSystemHealth])

  if (!operator) return <LoginPage />

  const ActiveView = VIEW_COMPONENTS[activeView] ?? Dashboard

  return (
    <AppLayout>
      <ActiveView />
    </AppLayout>
  )
}
