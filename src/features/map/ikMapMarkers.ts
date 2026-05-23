import type { IKCategory, IKObject } from '@/types'
import type { IKObjectMedia } from '@/data/ikObjectMedia'
import { getIkObjectMedia } from '@/data/ikObjectMedia'
import { criticalityLabel, statusColor } from '@/utils/format'

const CATEGORY_SVG: Record<IKCategory, string> = {
  energy: '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/>',
  water: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  transport: '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  telecommunications: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>',
  military: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  emergency: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  government: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  fuel: '<line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="22" x2="4" y2="10"/><path d="M6 10h6l4-4v12H6z"/><path d="M18 6h2v4h-2z"/>',
}

const CATEGORY_LABELS: Record<IKCategory, string> = {
  energy: 'Energia',
  water: 'Woda',
  transport: 'Transport',
  telecommunications: 'Telekomunikacja',
  military: 'Obrona',
  emergency: 'Ratownictwo',
  government: 'Administracja',
  fuel: 'Paliwa',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function getIkCategoryLabel(category: IKCategory): string {
  return CATEGORY_LABELS[category]
}

export function createIkMarkerHtml(obj: IKObject, isAffected: boolean): string {
  const color = isAffected ? '#EF4444' : statusColor(obj.status)
  const svgPath = CATEGORY_SVG[obj.category]

  return `<div class="map-ik-marker${isAffected ? ' map-ik-marker--affected' : ''}" style="--marker-color:${color}">
    <div class="map-ik-marker__ring"></div>
    <div class="map-ik-marker__icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgPath}</svg>
    </div>
  </div>`
}

export function createIkTooltipHtml(obj: IKObject, mediaOverride?: IKObjectMedia): string {
  const media = mediaOverride ?? getIkObjectMedia(obj.id, obj.category, obj.criticality)
  const statusLabel = obj.status.replace(/_/g, ' ').toUpperCase()
  const onlineCameras = media.cameras.filter(c => c.status === 'online').length

  const imageHtml = media.heroAvailable && media.heroImage
    ? `<img src="${escapeHtml(media.heroImage)}" alt="${escapeHtml(obj.name)}" loading="lazy" />`
    : '<div class="map-ik-tooltip__image-empty"><span>Brak zdjęcia obiektu</span></div>'

  return `<div class="map-ik-tooltip">
    <div class="map-ik-tooltip__image${media.heroAvailable && media.heroImage ? '' : ' map-ik-tooltip__image--empty'}">
      ${imageHtml}
      <span class="map-ik-tooltip__badge">${escapeHtml(obj.shortName)}</span>
    </div>
    <div class="map-ik-tooltip__body">
      <div class="map-ik-tooltip__title">${escapeHtml(obj.name)}</div>
      <div class="map-ik-tooltip__subtitle">${escapeHtml(getIkCategoryLabel(obj.category))} · ${escapeHtml(obj.owner)}</div>
      <div class="map-ik-tooltip__grid">
        <div><span>Status</span><strong style="color:${statusColor(obj.status)}">${statusLabel}</strong></div>
        <div><span>Krytyczność</span><strong>${criticalityLabel(obj.criticality)}</strong></div>
        <div><span>UPS</span><strong>${obj.backupPowerHours}h</strong></div>
        <div><span>CCTV</span><strong>${onlineCameras}/${media.cameras.length} online</strong></div>
      </div>
      ${obj.notes ? `<div class="map-ik-tooltip__notes">${escapeHtml(obj.notes)}</div>` : ''}
      <div class="map-ik-tooltip__hint">Kliknij marker — podgląd CCTV i szczegóły</div>
    </div>
  </div>`
}
