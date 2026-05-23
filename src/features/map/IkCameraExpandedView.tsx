import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, X } from 'lucide-react'
import type { IKObject } from '@/types'
import type { IKCameraFeed } from '@/data/ikObjectMedia'
import { formatCameraTitle } from '@/data/ikCameraPresets'
import { SimulatedCameraFeed } from '@/components/camera/SimulatedCameraFeed'
import { Button } from '@/components/ui/Button'

function CameraStatusBadge({ status }: { status: IKCameraFeed['status'] }) {
  const colors = {
    online: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E', label: 'ONLINE' },
    degraded: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'DEGRADED' },
    offline: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: 'OFFLINE' },
  }[status]

  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 6,
      background: colors.bg, color: colors.color, whiteSpace: 'nowrap',
    }}>
      {colors.label}
    </span>
  )
}

function CameraPicker({
  cameras,
  activeCamera,
  onSelect,
}: {
  cameras: IKCameraFeed[]
  activeCamera: IKCameraFeed
  onSelect: (camera: IKCameraFeed) => void
}) {
  return (
    <div className="map-ik-cameras">
      <div className="map-ik-cameras__label">Dostępne kamery ({cameras.length})</div>
      <div className="map-ik-cameras__list">
        {cameras.map((camera, index) => {
          const isActive = activeCamera.id === camera.id
          return (
            <button
              key={camera.id}
              type="button"
              className={`map-ik-cameras__item${isActive ? ' is-active' : ''}${camera.status === 'offline' ? ' is-offline' : ''}`}
              onClick={() => onSelect(camera)}
            >
              <div className="map-ik-cameras__item-icon" aria-hidden>
                <Camera size={14} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="map-ik-cameras__item-body">
                <div className="map-ik-cameras__item-head">
                  <strong>{camera.code}</strong>
                  <span className="map-ik-cameras__zone">{camera.zone}</span>
                </div>
                <div className="map-ik-cameras__item-title">{camera.label}</div>
                <div className="map-ik-cameras__item-desc">{camera.description}</div>
              </div>
              <CameraStatusBadge status={camera.status} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function IkCameraExpandedView({
  object,
  cameras,
  initialCamera,
  onClose,
}: {
  object: IKObject
  cameras: IKCameraFeed[]
  initialCamera: IKCameraFeed
  onClose: () => void
}) {
  const [activeCamera, setActiveCamera] = useState(initialCamera)
  const [clock, setClock] = useState(() => new Date())

  const activeCameraIndex = useMemo(
    () => Math.max(0, cameras.findIndex(c => c.id === activeCamera.id)),
    [cameras, activeCamera.id],
  )

  useEffect(() => {
    setActiveCamera(initialCamera)
  }, [initialCamera.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal(
    <div className="map-ik-cctv-modal" role="dialog" aria-modal="true" aria-label={`CCTV ${object.shortName}`}>
      <div className="map-ik-cctv-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="map-ik-cctv-modal__panel">
        <header className="map-ik-cctv-modal__header">
          <div>
            <div className="map-ik-cctv-modal__object">{object.shortName} — {object.name}</div>
            <div className="map-ik-cctv-modal__camera">{formatCameraTitle(activeCamera)}</div>
            <div className="map-ik-cctv-modal__desc">{activeCamera.description}</div>
          </div>
          <button type="button" className="map-ik-cctv-modal__close" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </header>

        <div className="map-ik-cctv-modal__body">
          <div className="map-ik-cctv-modal__feed">
            <SimulatedCameraFeed
              seed={`${object.id}:${activeCamera.id}`}
              cameraIndex={activeCameraIndex}
              variant="cctv"
              mode="rgb"
              degraded={activeCamera.status === 'degraded'}
              offline={activeCamera.status === 'offline'}
              className="map-ik-cctv-modal__sim"
              overlay={(
                <div className="map-ik-panel__live-overlay">
                  <span className="map-ik-panel__live-badge">LIVE</span>
                  <span className="map-ik-panel__live-time">
                    {clock.toLocaleTimeString('pl-PL', { hour12: false })}
                  </span>
                  <span className="map-ik-cctv-modal__feed-code">{activeCamera.code}</span>
                </div>
              )}
            />
          </div>

          <aside className="map-ik-cctv-modal__sidebar">
            <CameraPicker
              cameras={cameras}
              activeCamera={activeCamera}
              onSelect={setActiveCamera}
            />
          </aside>
        </div>

        <footer className="map-ik-cctv-modal__footer">
          <span className="map-ik-cctv-modal__hint">Strefa: {activeCamera.zone} · ESC aby zamknąć</span>
          <Button variant="secondary" size="sm" onClick={onClose}>Zamknij podgląd</Button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
