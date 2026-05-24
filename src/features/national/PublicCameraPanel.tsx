import { useEffect, useMemo, useState } from 'react'
import { Camera, MapPin, Video } from 'lucide-react'
import {
  getPublicCamerasForRegion,
  PUBLIC_CAMERA_SOURCE,
  type PublicCamera,
} from '@/data/publicCameras'
import { PublicCameraFeed } from '@/features/national/PublicCameraFeed'

function CameraLocation({ city }: { city: string }) {
  return (
    <span className="national-public-cams__location">
      <MapPin size={12} aria-hidden />
      {city}
    </span>
  )
}

export function PublicCameraPanel({
  regionId,
  regionName,
}: {
  regionId: string
  regionName: string
}) {
  const cameras = useMemo(() => getPublicCamerasForRegion(regionId), [regionId])
  const [activeCamera, setActiveCamera] = useState<PublicCamera | null>(() => cameras[0] ?? null)
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    setActiveCamera(cameras[0] ?? null)
  }, [cameras])

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (cameras.length === 0 || !activeCamera) return null

  const activeIndex = Math.max(0, cameras.findIndex(c => c.id === activeCamera.id))

  return (
    <section className="national-public-cams" aria-labelledby="national-public-cams-title">
      <div className="national-public-cams__head">
        <span className="national-public-cams__icon" aria-hidden>
          <Video size={16} />
        </span>
        <div>
          <h2 id="national-public-cams-title" className="national-public-cams__title">
            Kamery publiczne na żywo
          </h2>
          <p className="national-public-cams__sub">
            Podgląd z publicznych źródeł · {regionName} · {cameras.length}{' '}
            {cameras.length === 1 ? 'kamera' : cameras.length < 5 ? 'kamery' : 'kamer'}
          </p>
        </div>
        <div className="national-public-cams__source">
          <span className="national-public-cams__source-badge">Źródło publiczne</span>
          <span className="national-public-cams__source-name">{PUBLIC_CAMERA_SOURCE}</span>
        </div>
      </div>

      <div className="national-public-cams__layout">
        <div className="national-public-cams__viewer">
          <div
            className="map-ik-panel__live national-public-cams__feed"
            onClick={e => e.preventDefault()}
            onAuxClick={e => e.preventDefault()}
          >
            <PublicCameraFeed key={activeCamera.id} camera={activeCamera} />
            <div className="map-ik-panel__live-overlay national-public-cams__feed-shield">
              <span className="map-ik-panel__live-badge">LIVE</span>
              <span className="map-ik-panel__live-time">
                {clock.toLocaleTimeString('pl-PL', { hour12: false })}
              </span>
              <span className="national-public-cams__feed-location">
                <MapPin size={11} aria-hidden />
                {activeCamera.city}
              </span>
              <span className="national-public-cams__feed-code">{activeCamera.code}</span>
            </div>
          </div>

          <div className="national-public-cams__feed-meta">
            <CameraLocation city={activeCamera.city} />
            <strong>{activeCamera.label}</strong>
            <p>{activeCamera.description}</p>
          </div>
        </div>

        <aside className="national-public-cams__sidebar">
          <div className="map-ik-cameras map-ik-cameras--compact">
            <div className="map-ik-cameras__label">Wybór kamery ({cameras.length})</div>
            <div className="map-ik-cameras__list">
              {cameras.map((camera, index) => {
                const isActive = activeCamera.id === camera.id
                return (
                  <button
                    key={camera.id}
                    type="button"
                    className={`map-ik-cameras__item${isActive ? ' is-active' : ''}`}
                    onClick={() => setActiveCamera(camera)}
                  >
                    <div className="map-ik-cameras__item-icon" aria-hidden>
                      <Camera size={14} />
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="map-ik-cameras__item-body">
                      <div className="map-ik-cameras__item-head">
                        <strong>{camera.code}</strong>
                        <CameraLocation city={camera.city} />
                      </div>
                      <div className="map-ik-cameras__item-title">{camera.label}</div>
                      <div className="map-ik-cameras__item-desc">{camera.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="national-public-cams__hint">
            Strumień {activeCamera.feedKind === 'snapshot' ? 'snapshot' : 'HLS'} · {PUBLIC_CAMERA_SOURCE}. Kamera {String(activeIndex + 1).padStart(2, '0')} z{' '}
            {String(cameras.length).padStart(2, '0')} · autoplay
          </p>
        </aside>
      </div>
    </section>
  )
}
