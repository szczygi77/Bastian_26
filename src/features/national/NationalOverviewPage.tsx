import { useEffect, useMemo, useState } from 'react'
import {
  Globe, MapPin, AlertTriangle, RefreshCw, Building2, Shield,
  Zap, Droplets, Wifi, TrainFront, Siren, Landmark, Activity, Layers, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { aggregateNationalThreat } from '@/services/nationalOverviewService'
import { getVoivodeshipBrand, LIVE_VOIVODESHIP_ID, SECTOR_CHIPS } from '@/data/voivodeshipBranding'
import { RegionEmblem } from '@/components/national/RegionEmblem'
import { RegionHeroImage } from '@/components/national/RegionHeroImage'
import { PublicCameraPanel } from '@/features/national/PublicCameraPanel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageShell } from '@/components/layout/PageShell'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { NationalRegionSummary } from '@/types'

const SECTOR_ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  droplets: Droplets,
  wifi: Wifi,
  train: TrainFront,
  siren: Siren,
  landmark: Landmark,
}

export function NationalOverviewPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRegionId, setSelectedRegionId] = useState(LIVE_VOIVODESHIP_ID)
  const {
    nationalRegions,
    refreshNationalOverview,
    refreshPublicDataSources,
    openIncidentCommand,
    incidents,
  } = useAppStore()

  useEffect(() => {
    void handleRefresh()
  }, [refreshNationalOverview, refreshPublicDataSources])

  useEffect(() => {
    if (nationalRegions.length === 0) return
    if (!nationalRegions.some(r => r.id === selectedRegionId)) {
      setSelectedRegionId(nationalRegions.find(r => r.isLiveRegion)?.id ?? nationalRegions[0].id)
    }
  }, [nationalRegions, selectedRegionId])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshPublicDataSources()
      refreshNationalOverview()
    } finally {
      setRefreshing(false)
    }
  }

  const nationalThreat = aggregateNationalThreat(nationalRegions)
  const liveRegion = nationalRegions.find(r => r.isLiveRegion)
  const selectedRegion = nationalRegions.find(r => r.id === selectedRegionId) ?? liveRegion ?? nationalRegions[0]
  const selectedBrand = selectedRegion ? getVoivodeshipBrand(selectedRegion.id) : null
  const openIncident = incidents.find(i => i.status === 'open')

  const sortedRegions = useMemo(
    () => [...nationalRegions].sort((a, b) => {
      if (a.id === LIVE_VOIVODESHIP_ID) return -1
      if (b.id === LIVE_VOIVODESHIP_ID) return 1
      return a.name.localeCompare(b.name, 'pl')
    }),
    [nationalRegions],
  )

  return (
    <PageShell className="national-page">
      <header className="national-header">
        <div className="national-header__brand">
          <span className="national-header__icon" aria-hidden>
            <Globe size={20} />
          </span>
          <div>
            <h1 className="national-header__title">Przegląd kraju</h1>
            <p className="national-header__sub">
              Wybierz województwo · {nationalRegions.length} regionów w monitoringu
            </p>
          </div>
        </div>
        <div className="national-header__actions">
          {liveRegion && liveRegion.openIncidents > 0 && openIncident && selectedRegion?.isLiveRegion && (
            <Button variant="primary" size="sm" onClick={() => openIncidentCommand(openIncident.id)}>
              Dowództwo — {liveRegion.name}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Odśwież
          </Button>
        </div>
      </header>

      {nationalRegions.length === 0 ? (
        <div className="national-empty">
          {refreshing ? 'Agregacja danych regionalnych…' : 'Brak danych regionalnych — użyj Odśwież.'}
        </div>
      ) : selectedRegion && selectedBrand ? (
        <>
          <div className="national-region-picker">
            <p className="national-region-picker__label">Wybierz województwo</p>
            <div className="national-region-strip" role="tablist" aria-label="Województwa">
            {sortedRegions.map(region => (
              <button
                key={region.id}
                type="button"
                role="tab"
                aria-selected={region.id === selectedRegionId}
                className={`national-region-tab${region.id === selectedRegionId ? ' is-active' : ''}${region.isLiveRegion ? ' is-live' : ''}`}
                onClick={() => setSelectedRegionId(region.id)}
              >
                <RegionEmblem regionId={region.id} size={36} live={region.isLiveRegion} />
                <span className="national-region-tab__name">{region.name}</span>
                {region.isLiveRegion && <span className="national-region-tab__live">LIVE</span>}
              </button>
            ))}
            </div>
          </div>

          <section className="national-spotlight">
            <RegionHeroImage
              regionId={selectedRegion.id}
              live={selectedRegion.isLiveRegion}
              variant="spotlight"
              className="national-spotlight__photo"
            />
            <div className="national-spotlight__overlay" aria-hidden />
            <div className="national-spotlight__content">
              <div className="national-spotlight__head">
                <RegionEmblem regionId={selectedRegion.id} size={76} live={selectedRegion.isLiveRegion} />
                <div className="national-spotlight__intro">
                  <div className="national-spotlight__eyebrow">
                    {selectedRegion.isLiveRegion ? 'Region operacyjny LIVE' : 'Agregat danych regionalnych'}
                  </div>
                  <h2 className="national-spotlight__title">Województwo {selectedRegion.name}</h2>
                  <p className="national-spotlight__meta">
                    <MapPin size={13} /> Stolica: {selectedBrand.capital} · {selectedBrand.tagline}
                  </p>
                  <p className="national-spotlight__caption">{selectedBrand.imageCaption}</p>
                  <div className="national-spotlight__chips">
                    {selectedBrand.highlights.map(item => (
                      <span key={item} className="national-spotlight__chip">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="national-spotlight__threat">
                  <span className="national-spotlight__threat-label">Zagrożenie regionu</span>
                  <strong className="national-spotlight__threat-value" style={{ color: selectedBrand.accent }}>
                    {selectedRegion.threatLevel}%
                  </strong>
                  <ProgressBar value={selectedRegion.threatLevel} accent="orange" fixedAccent thick />
                </div>
              </div>

              <div className="national-spotlight__stats">
                <SpotlightStat icon={Shield} label="Obiekty IK" value={String(selectedRegion.ikObjects)} />
                <SpotlightStat icon={AlertTriangle} label="Degraded" value={String(selectedRegion.degradedObjects)} />
                <SpotlightStat icon={Activity} label="Incydenty otwarte" value={`${selectedRegion.openIncidents}/${selectedRegion.incidentCount}`} />
                <SpotlightStat icon={Globe} label="Zaufanie źródeł" value={String(selectedRegion.trustScoreAvg)} />
              </div>

              {selectedRegion.isLiveRegion && selectedRegion.openIncidents > 0 && (
                <div className="national-spotlight__alert">
                  <AlertTriangle size={14} />
                  Aktywny incydent operacyjny — pełny drill-down dostępny w module Dowództwo
                </div>
              )}
            </div>
          </section>

          <PublicCameraPanel regionId={selectedRegion.id} regionName={selectedRegion.name} />

          <section className="national-hero national-hero--compact">
            <div className="national-hero__copy">
              <span className="national-hero__eyebrow">Wskaźnik zagrożenia kraju</span>
              <div className="national-hero__score-row">
                <strong className="national-hero__score">{nationalThreat}</strong>
                <span className="national-hero__score-max">/ 100</span>
              </div>
              <p className="national-hero__hint">
                Agregacja LIVE ({liveRegion?.name ?? '—'}) oraz regionów syntetycznych
              </p>
              <div className="national-hero__bar">
                <ProgressBar value={nationalThreat} accent="orange" fixedAccent thick />
              </div>
            </div>
          </section>

          <div className="national-region-grid">
            {sortedRegions.map(region => (
              <RegionCard
                key={region.id}
                region={region}
                selected={region.id === selectedRegionId}
                onSelect={() => setSelectedRegionId(region.id)}
              />
            ))}
          </div>

          <section className="national-sectors">
            <div className="national-sectors__head">
              <Layers size={16} />
              <div>
                <h2 className="national-sectors__title">Agregacja sektorowa</h2>
                <p className="national-sectors__sub">Status monitorowania infrastruktury krytycznej w skali kraju</p>
              </div>
            </div>
            <div className="national-sectors__grid">
              {SECTOR_CHIPS.map(sector => {
                const Icon = SECTOR_ICONS[sector.icon] ?? Shield
                return (
                  <div key={sector.id} className="national-sector-chip">
                    <span className="national-sector-chip__icon" aria-hidden>
                      <Icon size={16} />
                    </span>
                    <div>
                      <div className="national-sector-chip__label">{sector.label}</div>
                      <div className="national-sector-chip__status">Monitorowany</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="national-sectors__foot">
              <Building2 size={12} />
              Drill-down z pełnymi danymi operacyjnymi: <strong>Podkarpackie</strong> w tej instancji BASTION.
              Pozostałe {nationalRegions.length - 1} województw = syntetyczna agregacja baseline.
            </p>
          </section>
        </>
      ) : null}
    </PageShell>
  )
}

function SpotlightStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="national-spotlight-stat">
      <Icon size={15} />
      <span className="national-spotlight-stat__label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function RegionCard({
  region,
  selected,
  onSelect,
}: {
  region: NationalRegionSummary
  selected: boolean
  onSelect: () => void
}) {
  const brand = getVoivodeshipBrand(region.id)
  const threatAccent = region.threatLevel >= 60 ? 'danger' as const : region.threatLevel >= 35 ? 'orange' as const : 'green' as const

  return (
    <button
      type="button"
      className={`national-region-card${region.isLiveRegion ? ' is-live' : ''}${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <RegionHeroImage
        regionId={region.id}
        live={region.isLiveRegion}
        variant="banner"
        className="national-region-card__banner"
      />
      <div className="national-region-card__inner">
        <div className="national-region-card__head">
          <RegionEmblem regionId={region.id} size={52} live={region.isLiveRegion} />
          <div className="national-region-card__identity">
            <div className="national-region-card__name">{region.name}</div>
            <div className="national-region-card__capital">
              <MapPin size={11} /> {brand.capital}
            </div>
          </div>
          <Badge variant={region.isLiveRegion ? 'cyan' : 'muted'} dot={region.isLiveRegion}>
            {region.isLiveRegion ? 'LIVE' : 'Agregat'}
          </Badge>
        </div>

        <p className="national-region-card__tagline">{brand.tagline}</p>

        <div className="national-region-card__stats">
          <div className="national-region-stat">
            <Shield size={14} />
            <span className="national-region-stat__label">IK</span>
            <strong>{region.ikObjects}</strong>
          </div>
          <div className="national-region-stat">
            <Activity size={14} />
            <span className="national-region-stat__label">Inc.</span>
            <strong>{region.openIncidents}/{region.incidentCount}</strong>
          </div>
        </div>

        <div className="national-region-card__threat">
          <div className="national-region-card__threat-head">
            <span>Zagrożenie</span>
            <strong style={{ color: brand.accent }}>{region.threatLevel}%</strong>
          </div>
          <ProgressBar value={region.threatLevel} accent={threatAccent} fixedAccent />
        </div>

        <div className="national-region-card__cta">
          Zobacz szczegóły <ChevronRight size={12} />
        </div>
      </div>
    </button>
  )
}
