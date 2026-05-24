import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { OperationalTelemetryRail } from '@/components/dashboard/OperationalTelemetryRail'
import { useElectronShell } from '@/hooks/useElectronShell'
import { useAppStore } from '@/store/useAppStore'
import { FlaskConical } from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isMacOS, titlebarHeight } = useElectronShell()
  const mode = useAppStore(s => s.mode)

  return (
    <div className="grid-bg" style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw', overflow: 'hidden', background: '#05070A',
    }}>
      {isMacOS && (
        <div
          className="window-drag"
          aria-hidden
          style={{
            height: titlebarHeight,
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        />
      )}

      {mode === 'simulation' && (
        <div className="simulation-banner" role="status">
          <FlaskConical size={14} aria-hidden />
          <span>TRYB SYMULACJI — dane ćwiczeniowe, adaptery TETRA/RCB oznaczone jako MOCK</span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Topbar />
          <main style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div aria-hidden style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
              background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,138,31,0.06) 0%, transparent 70%)',
            }} />
            <div style={{ position: 'relative', zIndex: 1, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</div>
              <OperationalTelemetryRail />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
