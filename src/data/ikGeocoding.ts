/**
 * Geokodowanie obiektów IK — zapytania Overpass (OSM) + fallback Nominatim.
 */
export interface IkGeocodeSpec {
  id: string
  /** Fallback Nominatim */
  query: string
  /** Fragment Overpass QL (selektor w bbox) */
  overpass: string
  /** Dopasowanie wyniku po polu tags.name (i opcjonalnie operator/brand) */
  namePattern: RegExp
}

/** Bbox: south, west, north, east */
// Celowo węższy bbox niż „okolice” — żeby nie łapać Niska/Pysznicy.
export const STALOWA_WOLA_BBOX = { south: 50.53, west: 21.98, north: 50.61, east: 22.12 }

export const IK_GEOCODE_SPECS: IkGeocodeSpec[] = [
  {
    id: 'hsw',
    query: 'Huta Stalowa Wola',
    overpass: 'nwr["name"~"Huta Stalowa Wola",i];',
    namePattern: /huta\s*stalowa/i,
  },
  {
    id: 'elc',
    query: 'Elektrociepłownia Stalowa Wola',
    overpass: 'nwr["power"="plant"]["name"~"Elektrownia Stalowa Wola|Elektrociepłownia",i];',
    namePattern: /elektrownia|elektrociepłownia|tauron/i,
  },
  {
    id: 'szpital',
    query: 'Szpital Specjalistyczny Stalowa Wola',
    overpass: 'nwr["amenity"="hospital"]["name"~"Stalowa Wola",i];',
    namePattern: /szpital/i,
  },
  {
    id: 'wod',
    query: 'MPWiK Stalowa Wola',
    overpass: 'nwr["name"~"COP\\s*-\\s*Wodociągi|Wodociągi|MPWiK",i];',
    namePattern: /wodoci|mpwik|uzdatniania/i,
  },
  {
    id: 'most',
    query: 'Most na Sanie Stalowa Wola',
    // Mosty na Sanie często nie mają nazwy; łapiemy mosty/wiadukty i dobieramy najbliższy zweryfikowanej kotwicy.
    overpass: 'way["bridge"];',
    namePattern: /./,
  },
  {
    id: 'czk',
    query: 'Starostwo Powiatowe Stalowa Wola',
    overpass: 'nwr["amenity"="townhall"]["name"~"Starostwo powiatowe",i];',
    namePattern: /starostwo powiatowe/i,
  },
  {
    id: 'bts',
    query: 'maszt telekomunikacyjny Stalowa Wola',
    overpass: 'nwr["man_made"="mast"];',
    namePattern: /./,
  },
  {
    id: 'pkp',
    query: 'Stacja Stalowa Wola Rozwadów',
    overpass: 'nwr["railway"="station"]["name"~"Stalowa Wola Rozwadów|Rozwadów",i];',
    namePattern: /stalowa\s*wola|rozwadów/i,
  },
  {
    id: 'paliwo',
    query: 'PERN Stalowa Wola',
    overpass: 'nwr["name"~"PERN",i];',
    namePattern: /pern|paliw|rafiner/i,
  },
  {
    id: 'policja',
    query: 'Komenda Powiatowa Policji Stalowa Wola',
    overpass: 'nwr["amenity"="police"]["name"~"Stalowa Wola|Policji",i];',
    namePattern: /polic/i,
  },
  {
    id: 'psp',
    query: 'Państwowa Straż Pożarna Stalowa Wola',
    overpass: 'nwr["amenity"="fire_station"]["name"~"Stalowa Wola|Straż Pożarna",i];',
    namePattern: /straż\s*poż|psp|pożarn/i,
  },
  {
    id: 'osp',
    query: 'OSP Stalowa Wola',
    overpass: 'nwr["amenity"="fire_station"]["name"~"OSP",i];',
    namePattern: /\bosp\b/i,
  },
  {
    id: 'um',
    query: 'Urząd Miasta Stalowa Wola',
    overpass: 'nwr["amenity"="townhall"]["name"~"Urząd Miasta",i];',
    namePattern: /urząd miasta/i,
  },
]

/** Bazy dronów powiązane z obiektami IK (współrzędne synchronizowane po geokodowaniu). */
export const DRONE_IK_BASE_MAP: Record<string, string> = {
  'drone-pol-01': 'policja',
  'drone-pol-02': 'policja',
  'drone-psp-01': 'psp',
  'drone-psp-02': 'psp',
  'drone-osp-01': 'osp',
  'drone-crisis-01': 'czk',
}

/** Współrzędne zweryfikowane w OSM — fallback gdy API niedostępne. */
export const IK_VERIFIED_COORDINATES: Record<string, [number, number]> = {
  // Dane zweryfikowane na OSM (Overpass „out center”), aby punkty były stabilne offline.
  hsw: [50.54981, 22.054227],
  elc: [50.552222, 22.080709],
  szpital: [50.563532, 22.070282],
  wod: [50.548943, 22.040592],
  most: [50.5594, 22.0278],
  czk: [50.568255, 22.048054],
  bts: [50.568056, 22.058166],
  pkp: [50.591335, 22.041964],
  paliwo: [50.5912, 22.0678],
  policja: [50.566985, 22.056201],
  psp: [50.577217, 22.059097],
  osp: [50.5712, 22.0451],
  um: [50.565175, 22.063855],
}
