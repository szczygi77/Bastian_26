import { useEffect, useMemo, useState } from 'react'
import { Camera, Maximize2, X } from 'lucide-react'
import type { IKObject } from '@/types'
import type { IKCameraFeed } from '@/data/ikObjectMedia'
import { useIkObjectMedia } from '@/hooks/useIkObjectMedia'
import { criticalityLabel } from '@/utils/format'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getIkCategoryLabel } from '@/features/map/ikMapMarkers'
import { SimulatedCameraFeed } from '@/components/camera/SimulatedCameraFeed'
import { ObjectHeroImage } from '@/components/map/ObjectHeroImage'
import { IkCameraExpandedView } from '@/features/map/IkCameraExpandedView'

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
      background: colors.bg, color: colors.color,
    }}>
      {colors.label}
    </span>
  )
}

export function IkObjectDetailPanel({
  object,
  onClose,
}: {
  object: IKObject
  onClose: () => void
}) {
  return <IkObjectDetailPanelBody key={object.id} object={object} onClose={onClose} />
}

function IkObjectDetailPanelBody({
  object,
  onClose,
}: {
  object: IKObject
  onClose: () => void
}) {
  const { media, loading, attribution } = useIkObjectMedia(object)
  const [activeCameraId, setActiveCameraId] = useState(() => media.cameras[0]?.id ?? '')
  const [expandedOpen, setExpandedOpen] = useState(false)
  const [clock, setClock] = useState(() => new Date())

  const activeCamera = useMemo(
    () => media.cameras.find(camera => camera.id === activeCameraId) ?? media.cameras[0],
    [media.cameras, activeCameraId],
  )

  const activeCameraIndex = useMemo(
    () => Math.max(0, media.cameras.findIndex(camera => camera.id === activeCamera.id)),
    [media.cameras, activeCamera.id],
  )

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <div className="map-ik-panel">
        <div className="map-ik-panel__hero">
          <ObjectHeroImage
            src={media.heroImage}
            alt={object.name}
            loading={loading}
            available={media.heroAvailable}
          />
          <div className="map-ik-panel__hero-overlay">
            <div>
              <div className="map-ik-panel__code">{object.shortName}</div>
              <div className="map-ik-panel__name">{object.name}</div>
            </div>
            <button type="button" className="map-ik-panel__close" onClick={onClose} aria-label="Zamknij">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="map-ik-panel__content">
          <div className="map-ik-panel__meta">
            <div><span>Kategoria</span><strong>{getIkCategoryLabel(object.category)}</strong></div>
            <div><span>Status</span><StatusBadge status={object.status} /></div>
            <div><span>Krytyczność</span><strong>{criticalityLabel(object.criticality)}</strong></div>
            <div><span>Właściciel</span><strong>{object.owner}</strong></div>
            <div><span>UPS</span><strong>{object.backupPowerHours}h</strong></div>
            <div><span>Odtworzenie</span><strong>{object.recoveryTimeHours}h</strong></div>
            <div className="map-ik-panel__meta-wide"><span>Kontakt</span><strong>{object.contactChannel}</strong></div>
          </div>

          {object.notes && (
            <div className="map-ik-panel__notes">{object.notes}</div>
          )}

          {attribution && (
            <div className="map-ik-panel__attribution">Źródło: {attribution}</div>
          )}

          <div className="map-ik-panel__section-title">
            <Camera size={13} />
            PODGLĄD CCTV — {activeCamera.code}
          </div>
          <div className="map-ik-panel__camera-subtitle">
            {activeCamera.label} · {activeCamera.zone}
          </div>

          <div className="map-ik-panel__live">
            <SimulatedCameraFeed
              seed={`${object.id}:${activeCamera.id}`}
              cameraIndex={activeCameraIndex}
              variant="cctv"
              mode="rgb"
              degraded={activeCamera.status === 'degraded'}
              offline={activeCamera.status === 'offline'}
              className="map-ik-panel__sim"
              overlay={(
                <div className="map-ik-panel__live-overlay">
                  <span className="map-ik-panel__live-badge">LIVE</span>
                  <span className="map-ik-panel__live-time">
                    {clock.toLocaleTimeString('pl-PL', { hour12: false })}
                  </span>
                </div>
              )}
            />
            <div className="map-ik-panel__live-status">
              <CameraStatusBadge status={activeCamera.status} />
            </div>
          </div>

          <div className="map-ik-cameras map-ik-cameras--compact">
            <div className="map-ik-cameras__label">Wybór kamery</div>
            <div className="map-ik-cameras__list">
              {media.cameras.map((camera, index) => {
                const isActive = activeCamera.id === camera.id
                return (
                  <button
                    key={camera.id}
                    type="button"
                    className={`map-ik-cameras__item${isActive ? ' is-active' : ''}`}
                    onClick={() => setActiveCameraId(camera.id)}
                  >
                    <div className="map-ik-cameras__item-icon" aria-hidden>
                      <Camera size={12} />
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="map-ik-cameras__item-body">
                      <div className="map-ik-cameras__item-head">
                        <strong>{camera.code}</strong>
                        <span className="map-ik-cameras__zone">{camera.zone}</span>
                      </div>
                      <div className="map-ik-cameras__item-title">{camera.label}</div>
                    </div>
                    <CameraStatusBadge status={camera.status} />
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full"
            disabled={activeCamera.status === 'offline'}
            onClick={() => setExpandedOpen(true)}
          >
            <Maximize2 size={12} />
            {activeCamera.status === 'offline' ? 'Kamera niedostępna' : 'Rozszerzony podgląd CCTV'}
          </Button>
        </div>
      </div>

      {expandedOpen && (
        <IkCameraExpandedView
          object={object}
          cameras={media.cameras}
          initialCamera={activeCamera}
          onClose={() => setExpandedOpen(false)}
        />
      )}
    </>
  )
}
