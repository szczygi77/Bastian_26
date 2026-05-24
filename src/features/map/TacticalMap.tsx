import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { fetchWeather } from '@/adapters/weatherAdapter'
import { fetchOpenSkyFlights } from '@/adapters/openskyAdapter'
import { fetchFIRMSAlerts } from '@/adapters/firmsAdapter'
import { envConfig } from '@/config/env'
import { MAP_LAYERS } from '@/config/mapLayers'
import type { FIRMSAlert, IKObject, WeatherData, OpenSkyFlight } from '@/types'
import { createIkMarkerHtml, createIkTooltipHtml } from '@/features/map/ikMapMarkers'
import { IkObjectDetailPanel } from '@/features/map/IkObjectDetailPanel'
import { MapOperationalHud } from '@/features/map/MapOperationalHud'
import { prefetchAllIkObjectMedia } from '@/hooks/useIkObjectMedia'
import { getCachedIkObjectMedia, subscribeIkObjectMedia } from '@/services/objectMediaService'

function createIKMarker(obj: IKObject, isAffected: boolean): L.Marker {
  return L.marker([obj.coordinates[0], obj.coordinates[1]], {
    icon: L.divIcon({
      html: createIkMarkerHtml(obj, isAffected),
      className: 'map-ik-marker-wrap',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    }),
    zIndexOffset: isAffected ? 1000 : obj.criticality * 100,
  })
}

interface LayerControls {
  ikObjects: boolean
  impactZones: boolean
  dependencyLinks: boolean
  aviation: boolean
  weather: boolean
  fires: boolean
}

export function TacticalMap({ incidentMode = false }: { incidentMode?: boolean } = {}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const ikMarkersByIdRef = useRef<Map<string, L.Marker>>(new Map())
  const linesRef = useRef<L.Polyline[]>([])
  const zonesRef = useRef<L.Circle[]>([])
  const flightMarkersRef = useRef<L.Marker[]>([])
  const fireMarkersRef = useRef<L.CircleMarker[]>([])
  const droneMarkersRef = useRef<L.Marker[]>([])
  const droneRoutesRef = useRef<L.Polyline[]>([])
  const sectorOverlaysRef = useRef<L.Circle[]>([])
  const baseLayersRef = useRef<Record<string, L.TileLayer>>({})

  const {
    ikObjects,
    cascadeResult: storeCascade,
    drones,
    missions,
    mapCenter,
    ikLocationsResolved,
    ikLocationsLoading,
    loadIkLocations,
    focusedIkObjectId,
    setFocusedIkObjectId,
    focusedDroneMissionId,
    setFocusedDroneMissionId,
    incidentMapFilter,
    containmentRecovery,
    operationalTelemetry,
    incidents,
  } = useAppStore()

  const cascadeResult = incidents.some(i => i.status === 'open' || i.status === 'contained')
    ? storeCascade
    : null
  const boundsFittedRef = useRef(false)

  const [layers, setLayers] = useState<LayerControls>({
    ikObjects: true,
    impactZones: true,
    dependencyLinks: true,
    aviation: false,
    weather: false,
    fires: false,
  })
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [flights, setFlights] = useState<OpenSkyFlight[]>([])
  const [fires, setFires] = useState<FIRMSAlert[]>([])
  const [selectedObj, setSelectedObj] = useState<IKObject | null>(null)
  const [loading, setLoading] = useState(false)
  const [ikMediaVersion, setIkMediaVersion] = useState(0)

  useEffect(() => {
    prefetchAllIkObjectMedia(ikObjects)
  }, [ikObjects])

  useEffect(() => {
    return subscribeIkObjectMedia(() => setIkMediaVersion(v => v + 1))
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    })

    const baseLayers: Record<string, L.TileLayer> = {}
    for (const layer of Object.values(MAP_LAYERS)) {
      baseLayers[layer.label] = L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: layer.maxZoom,
      })
    }
    baseLayersRef.current = baseLayers
    baseLayers[MAP_LAYERS.tacticalDark.label].addTo(map)

    L.control
      .layers(baseLayers, undefined, { position: 'topleft', collapsed: true })
      .addTo(map)
    L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map)

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  // Render IK objects
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    ikMarkersByIdRef.current.clear()
    linesRef.current.forEach(l => l.remove())
    linesRef.current = []
    zonesRef.current.forEach(z => z.remove())
    zonesRef.current = []

    if (!layers.ikObjects) return

    const filterSet = incidentMode && incidentMapFilter ? new Set(incidentMapFilter) : null
    const visibleObjects = filterSet
      ? ikObjects.filter(obj => filterSet.has(obj.id))
      : ikObjects

    const affectedIds = new Set(cascadeResult?.nodes.map(n => n.objectId) ?? [])
    if (incidentMode && cascadeResult) {
      affectedIds.add(cascadeResult.incidentObjectId)
    }

    for (const obj of visibleObjects) {
      const isAffected = affectedIds.has(obj.id)
      const cachedMedia = getCachedIkObjectMedia(obj.id)
      const marker = createIKMarker(obj, isAffected)
        .addTo(map)
        .bindTooltip(createIkTooltipHtml(obj, cachedMedia), {
          className: 'leaflet-bastion-tooltip leaflet-bastion-tooltip--rich',
          direction: 'top',
          opacity: 1,
          offset: [0, -18],
        })
        .on('click', () => setSelectedObj(obj))

      markersRef.current.push(marker)
      ikMarkersByIdRef.current.set(obj.id, marker)

      // Impact zones
      if (layers.impactZones && isAffected) {
        const cascadeNode = cascadeResult?.nodes.find(n => n.objectId === obj.id)
        const isRecovering = containmentRecovery?.recoveringNodeIds.includes(obj.id)
        const radius = cascadeNode ? (cascadeNode.impactScore / 100) * 800 : 300
        const zone = L.circle([obj.coordinates[0], obj.coordinates[1]], {
          radius,
          fillColor: isRecovering ? '#22C55E' : '#EF4444',
          fillOpacity: isRecovering ? 0.05 : 0.06,
          color: isRecovering ? '#22C55E' : '#EF4444',
          weight: isRecovering ? 1 : 1,
          dashArray: isRecovering ? '2 6' : '4 4',
        }).addTo(map)
        zonesRef.current.push(zone)
      }
    }

    // Dependency links
    if (layers.dependencyLinks) {
      for (const obj of ikObjects) {
        for (const depId of obj.dependencies) {
          const depObj = ikObjects.find(o => o.id === depId)
          if (!depObj) continue
          const isActive = affectedIds.has(obj.id) || affectedIds.has(depId)
          const isContained = containmentRecovery?.containedNodeIds.includes(obj.id)
            || containmentRecovery?.containedNodeIds.includes(depId)
          const line = L.polyline(
            [obj.coordinates, depObj.coordinates],
            {
              color: isContained ? '#22C55E' : isActive ? '#EF4444' : 'rgba(0,229,255,0.25)',
              weight: isActive ? 2.5 : 1,
              dashArray: isActive && !isContained ? undefined : '4 6',
              opacity: isActive ? 0.85 : 0.45,
            }
          ).addTo(map)
          linesRef.current.push(line)
        }
      }
    }
  }, [ikObjects, cascadeResult, layers, incidentMode, incidentMapFilter, containmentRecovery])

  // Sector stress overlays
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    sectorOverlaysRef.current.forEach(z => z.remove())
    sectorOverlaysRef.current = []

    const stress = operationalTelemetry.stressLevel
    if (stress < 20) return

    const sectors: Array<[number, number]> = [
      [mapCenter[0] + 0.06, mapCenter[1] + 0.04],
      [mapCenter[0] - 0.05, mapCenter[1] + 0.06],
      [mapCenter[0] + 0.02, mapCenter[1] - 0.07],
    ]

    for (const coords of sectors) {
      const overlay = L.circle(coords, {
        radius: 1200 + stress * 8,
        fillColor: '#FF8A1F',
        fillOpacity: 0.025 + stress * 0.0003,
        color: 'rgba(255,138,31,0.15)',
        weight: 1,
        dashArray: '8 12',
      }).addTo(map)
      sectorOverlaysRef.current.push(overlay)
    }
  }, [mapCenter, operationalTelemetry.stressLevel])

  useEffect(() => {
    for (const obj of ikObjects) {
      const marker = ikMarkersByIdRef.current.get(obj.id)
      const cachedMedia = getCachedIkObjectMedia(obj.id)
      if (!marker || !cachedMedia) continue
      marker.setTooltipContent(createIkTooltipHtml(obj, cachedMedia))
    }
  }, [ikMediaVersion, ikObjects])

  // Dopasuj widok mapy po geokodowaniu obiektów IK z OSM
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !ikLocationsResolved || boundsFittedRef.current) return

    const bounds = L.latLngBounds(ikObjects.map(o => o.coordinates))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
    boundsFittedRef.current = true
  }, [ikObjects, ikLocationsResolved])

  useEffect(() => {
    if (!focusedIkObjectId) return
    const obj = ikObjects.find(o => o.id === focusedIkObjectId)
    if (!obj) {
      setFocusedIkObjectId(null)
      return
    }

    setSelectedObj(obj)

    const map = mapInstance.current
    if (map) {
      map.flyTo(obj.coordinates, 15, { duration: 0.8 })
    }

    setFocusedIkObjectId(null)
  }, [focusedIkObjectId, ikObjects, setFocusedIkObjectId])

  const activeMissions = missions.filter(m => m.status !== 'completed')

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    droneMarkersRef.current.forEach(m => m.remove())
    droneRoutesRef.current.forEach(l => l.remove())
    droneMarkersRef.current = []
    droneRoutesRef.current = []

    for (const mission of activeMissions) {
      const drone = drones.find(d => d.id === mission.droneId)
      if (!drone) continue

      const route = L.polyline(
        [mission.routeOrigin, mission.targetCoordinates],
        { color: 'rgba(0,229,255,0.35)', weight: 2, dashArray: '5 7' },
      ).addTo(map)
      droneRoutesRef.current.push(route)

      const icon = L.divIcon({
        html: `<div class="map-drone-marker">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>`,
        className: 'map-drone-marker-wrap',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })

      const marker = L.marker(mission.currentPosition, { icon, zIndexOffset: 2000 })
        .addTo(map)
        .bindTooltip(
          `<div><b>${drone.model}</b><br/>${mission.type.replace(/_/g, ' ')} · ${mission.progressPercent.toFixed(0)}%<br/>${mission.status.replace(/_/g, ' ').toUpperCase()}</div>`,
          { className: 'leaflet-bastion-tooltip', direction: 'top', opacity: 1 },
        )
      droneMarkersRef.current.push(marker)
    }
  }, [activeMissions, drones])

  useEffect(() => {
    if (!focusedDroneMissionId) return
    const mission = missions.find(m => m.id === focusedDroneMissionId)
    if (!mission) {
      setFocusedDroneMissionId(null)
      return
    }

    const map = mapInstance.current
    if (map) {
      map.flyTo(mission.currentPosition, 15, { duration: 0.8 })
    }
    setFocusedDroneMissionId(null)
  }, [focusedDroneMissionId, missions, setFocusedDroneMissionId])

  // Aviation layer
  const loadFlights = useCallback(async () => {
    if (!layers.aviation) {
      flightMarkersRef.current.forEach(m => m.remove())
      flightMarkersRef.current = []
      return
    }
    setLoading(true)
    const data = await fetchOpenSkyFlights()
    setFlights(data)
    setLoading(false)
  }, [layers.aviation])

  useEffect(() => {
    loadFlights()
  }, [loadFlights])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    flightMarkersRef.current.forEach(m => m.remove())
    flightMarkersRef.current = []

    if (!layers.aviation) return
    for (const f of flights) {
      const icon = L.divIcon({
        html: `<div class="map-flight-icon" style="transform:rotate(${f.heading}deg)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>`,
        className: 'map-flight-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const m = L.marker([f.latitude, f.longitude], { icon })
        .addTo(map)
        .bindTooltip(`${f.callsign || f.icao24} · ${Math.round(f.altitude)}m · ${Math.round(f.velocity)}km/h`, {
          className: 'leaflet-bastion-tooltip',
          direction: 'top',
          opacity: 1,
        })
      flightMarkersRef.current.push(m)
    }
  }, [flights, layers.aviation])

  // Weather load
  useEffect(() => {
    if (!layers.weather) return
    fetchWeather().then(setWeather)
  }, [layers.weather])

  // NASA FIRMS fires
  useEffect(() => {
    if (!layers.fires) {
      fireMarkersRef.current.forEach(m => m.remove())
      fireMarkersRef.current = []
      return
    }
    fetchFIRMSAlerts(envConfig.firmsApiKey).then(setFires)
  }, [layers.fires])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !layers.fires) return

    fireMarkersRef.current.forEach(m => m.remove())
    fireMarkersRef.current = []

    for (const fire of fires) {
      const m = L.circleMarker([fire.latitude, fire.longitude], {
        radius: 8,
        fillColor: '#FF8A1F',
        color: '#EF4444',
        weight: 2,
        fillOpacity: 0.75,
      })
        .addTo(map)
        .bindTooltip(
          `FIRMS · ${fire.instrument}<br/>Conf: ${fire.confidence}% · ${fire.brightness}K`,
          { className: 'leaflet-bastion-tooltip', direction: 'top', opacity: 1 },
        )
      fireMarkersRef.current.push(m)
    }
  }, [fires, layers.fires])

  return (
    <div className={incidentMode ? 'tactical-map--incident h-full min-h-0' : 'h-full flex flex-col'}>
      {!incidentMode && (
        <div className="flex-shrink-0 flex items-center gap-4 px-4 py-3 glass border-b border-white/[0.06]">
          <span className="text-[10px] font-mono text-[#66778B] uppercase tracking-wider mr-2">LAYERS</span>
          {(Object.keys(layers) as (keyof LayerControls)[]).map(key => (
            <Switch
              key={key}
              checked={layers[key]}
              onChange={val => setLayers(l => ({ ...l, [key]: val }))}
              label={key.replace(/([A-Z])/g, ' $1').toUpperCase()}
              accent="cyan"
            />
          ))}
          <Button
            variant="secondary"
            size="sm"
            loading={ikLocationsLoading}
            onClick={() => {
              boundsFittedRef.current = false
              loadIkLocations(true)
            }}
          >
            Sync IK (OSM)
          </Button>
          <Button variant="secondary" size="sm" loading={loading} onClick={loadFlights} className="ml-auto">
            Sync Aviation
          </Button>
          {ikLocationsLoading && (
            <span className="text-[10px] font-mono text-[#00E5FF]">Geokodowanie OSM…</span>
          )}
          {ikLocationsResolved && !ikLocationsLoading && (
            <span className="text-[10px] font-mono text-[#66778B]">IK · OSM/Nominatim</span>
          )}
          {weather && layers.weather && (
            <div className="text-[10px] font-mono text-[#94A3B8] ml-4">
              {weather.temperature.toFixed(1)}°C · w10m {weather.windSpeed} km/h
              {weather.windSpeed180m != null && ` · w180m ${weather.windSpeed180m} km/h`}
              {weather.cloudCover != null && ` · chm. ${weather.cloudCover}%`}
              {weather.rainMm != null && weather.rainMm > 0 && ` · opad ${weather.rainMm} mm`}
              {' · '}{weather.condition}
            </div>
          )}
        </div>
      )}

      <div className={incidentMode ? 'tactical-map__viewport' : 'flex-1 relative'}>
        <div ref={mapRef} className="absolute inset-0" />
        <MapOperationalHud />

        {selectedObj && !incidentMode && (
          <IkObjectDetailPanel object={selectedObj} onClose={() => setSelectedObj(null)} />
        )}

        {activeMissions.length > 0 && !incidentMode && (
          <div className="absolute bottom-4 left-4 glass-panel ui-panel z-[1000]" style={{ padding: '14px 16px', maxWidth: 320 }}>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5FF] mb-2">
              DRONY W MISJI ({activeMissions.length})
            </div>
            <div className="ui-stack" style={{ gap: 8 }}>
              {activeMissions.map(mission => {
                const drone = drones.find(d => d.id === mission.droneId)
                return (
                  <div key={mission.id} className="text-[10px] font-mono text-[#94A3B8]">
                    <span className="text-[#00E5FF]">{drone?.model ?? mission.droneId}</span>
                    {' · '}{mission.progressPercent.toFixed(0)}% · {mission.status.replace(/_/g, ' ')}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
