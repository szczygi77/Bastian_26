import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import { useAppStore } from '@/store/useAppStore'
import { STALOWA_WOLA_CENTER } from '@/data/stalowa-wola'
import { statusColor, criticalityLabel } from '@/utils/format'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { StatusBadge } from '@/components/ui/Badge'
import { fetchWeather } from '@/adapters/weatherAdapter'
import { fetchOpenSkyFlights } from '@/adapters/openskyAdapter'
import { fetchFIRMSAlerts } from '@/adapters/firmsAdapter'
import { envConfig } from '@/config/env'
import { MAP_LAYERS } from '@/config/mapLayers'
import type { FIRMSAlert, IKObject, WeatherData, OpenSkyFlight } from '@/types'

function createIKMarker(obj: IKObject, isAffected: boolean): L.CircleMarker {
  const color = isAffected ? '#EF4444' : statusColor(obj.status)
  const radius = 6 + obj.criticality * 1.5

  return L.circleMarker([obj.coordinates[0], obj.coordinates[1]], {
    radius,
    fillColor: color,
    color: isAffected ? '#EF4444' : 'rgba(255,255,255,0.3)',
    weight: isAffected ? 2 : 1,
    fillOpacity: 0.85,
    opacity: 1,
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

export function TacticalMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const linesRef = useRef<L.Polyline[]>([])
  const zonesRef = useRef<L.Circle[]>([])
  const flightMarkersRef = useRef<L.Marker[]>([])
  const fireMarkersRef = useRef<L.CircleMarker[]>([])
  const baseLayersRef = useRef<Record<string, L.TileLayer>>({})

  const { ikObjects, cascadeResult, drones } = useAppStore()

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

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: STALOWA_WOLA_CENTER,
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
    linesRef.current.forEach(l => l.remove())
    linesRef.current = []
    zonesRef.current.forEach(z => z.remove())
    zonesRef.current = []

    if (!layers.ikObjects) return

    const affectedIds = new Set(cascadeResult?.nodes.map(n => n.objectId) ?? [])

    for (const obj of ikObjects) {
      const isAffected = affectedIds.has(obj.id)
      const marker = createIKMarker(obj, isAffected)
        .addTo(map)
        .bindTooltip(
          `<div style="font-family:monospace;font-size:11px;color:#E6EDF3">
            <b>${obj.shortName}</b> — ${obj.name}<br/>
            Status: ${obj.status}<br/>
            Criticality: ${criticalityLabel(obj.criticality)}<br/>
            UPS: ${obj.backupPowerHours}h
          </div>`,
          { className: 'leaflet-bastion-tooltip' }
        )
        .on('click', () => setSelectedObj(obj))

      markersRef.current.push(marker)

      // Impact zones
      if (layers.impactZones && isAffected) {
        const cascadeNode = cascadeResult?.nodes.find(n => n.objectId === obj.id)
        const radius = cascadeNode ? (cascadeNode.impactScore / 100) * 800 : 300
        const zone = L.circle([obj.coordinates[0], obj.coordinates[1]], {
          radius,
          fillColor: '#EF4444',
          fillOpacity: 0.06,
          color: '#EF4444',
          weight: 1,
          dashArray: '4 4',
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
          const line = L.polyline(
            [obj.coordinates, depObj.coordinates],
            {
              color: isActive ? '#EF4444' : 'rgba(0,229,255,0.25)',
              weight: isActive ? 2 : 1,
              dashArray: isActive ? undefined : '4 6',
            }
          ).addTo(map)
          linesRef.current.push(line)
        }
      }
    }
  }, [ikObjects, cascadeResult, layers])

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
        html: `<div style="color:#00E5FF;font-size:14px;transform:rotate(${f.heading}deg)">✈</div>`,
        className: '',
        iconSize: [16, 16],
      })
      const m = L.marker([f.latitude, f.longitude], { icon })
        .addTo(map)
        .bindTooltip(`${f.callsign || f.icao24} · ${Math.round(f.altitude)}m · ${Math.round(f.velocity)}km/h`)
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
          `FIRMS · ${fire.instrument}<br/>Conf: ${fire.confidence}% · ${fire.brightness}K`
        )
      fireMarkersRef.current.push(m)
    }
  }, [fires, layers.fires])

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
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
        <Button variant="secondary" size="sm" loading={loading} onClick={loadFlights} className="ml-auto">
          Sync Aviation
        </Button>
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

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />

        {/* Object detail panel */}
        {selectedObj && (
          <div className="absolute top-4 right-4 w-72 glass-strong rounded-[14px] p-4 border border-white/12 z-[1000]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] font-mono font-bold text-[#00E5FF] uppercase">{selectedObj.shortName}</div>
              <button onClick={() => setSelectedObj(null)} className="text-[#66778B] hover:text-[#94A3B8] text-xs">✕</button>
            </div>
            <div className="space-y-2 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-[#66778B]">Status</span>
                <StatusBadge status={selectedObj.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-[#66778B]">Criticality</span>
                <span className="text-[#E6EDF3]">{criticalityLabel(selectedObj.criticality)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66778B]">Backup Power</span>
                <span className="text-[#E6EDF3]">{selectedObj.backupPowerHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66778B]">Recovery</span>
                <span className="text-[#E6EDF3]">{selectedObj.recoveryTimeHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#66778B]">Contact</span>
                <span className="text-[#94A3B8] text-right">{selectedObj.contactChannel}</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="text-[#66778B] mb-1">Risk Profile</div>
                {Object.entries(selectedObj.riskProfile).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    <span className="text-[#66778B] w-14 capitalize">{k}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded">
                      <div className="h-full bg-[#EF4444] rounded" style={{ width: `${v}%` }} />
                    </div>
                    <span className="text-[#94A3B8] w-7">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active drones on map indicator */}
        {drones.filter(d => d.status === 'on_mission').length > 0 && (
          <div className="absolute bottom-4 left-4 glass rounded-[14px] px-3 py-2 border border-[#00E5FF]/20 z-[1000]">
            <span className="text-[10px] font-mono text-[#00E5FF]">
              {drones.filter(d => d.status === 'on_mission').length} DRONES ON MISSION
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
