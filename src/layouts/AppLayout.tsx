import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#05070A',
      }}
    >
      <Sidebar />

      {/* Main column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Topbar />

        {/* Content area */}
        <main
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Subtle background gradient */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,138,31,0.028) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
