import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'
import type { PublicCamera } from '@/data/publicCameras'

function HlsFeed({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    const tryPlay = () => {
      void video.play().catch(() => {})
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startLevel: -1,
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.addEventListener('loadedmetadata', tryPlay, { once: true })
    }

    return () => {
      hls?.destroy()
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      className="national-public-cams__video"
      autoPlay
      muted
      playsInline
      controls={false}
      disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
      onContextMenu={e => e.preventDefault()}
    />
  )
}

function SnapshotFeed({ src, intervalMs = 8000 }: { src: string; intervalMs?: number }) {
  const [tick, setTick] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    const timer = setInterval(() => setTick(value => value + 1), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, src])

  const separator = src.includes('?') ? '&' : '?'
  const imageSrc = `${src}${separator}t=${tick}`

  if (failed) {
    return (
      <div className="national-public-cams__video national-public-cams__snapshot national-public-cams__snapshot--error">
        Podgląd niedostępny
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt=""
      className="national-public-cams__video national-public-cams__snapshot"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onContextMenu={e => e.preventDefault()}
    />
  )
}

export function PublicCameraFeed({ camera }: { camera: PublicCamera }) {
  if (camera.feedKind === 'snapshot') {
    return <SnapshotFeed src={camera.streamUrl} />
  }

  return <HlsFeed src={camera.streamUrl} />
}
