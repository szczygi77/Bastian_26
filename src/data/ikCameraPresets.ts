import type { IKCategory } from '@/types'

export interface CameraPreset {
  code: string
  label: string
  description: string
  zone: string
}

const CATEGORY_FALLBACK: Record<IKCategory, CameraPreset[]> = {
  energy: [
    { code: 'CAM-01', label: 'Wejście techniczne', description: 'Główny wjazd na teren obiektu', zone: 'PERIMETER N' },
    { code: 'CAM-02', label: 'Hala maszynowa', description: 'Strefa produkcyjna / agregaty', zone: 'TECH' },
    { code: 'CAM-03', label: 'Perimeter zachód', description: 'Ogrodzenie — patrol nocny', zone: 'PERIMETER W' },
  ],
  water: [
    { code: 'CAM-01', label: 'Studnia główna', description: 'Wejście do strefy uzdatniania', zone: 'TECH' },
    { code: 'CAM-02', label: 'Zbiornik retencyjny', description: 'Monitoring poziomu wody', zone: 'RESERVOIR' },
    { code: 'CAM-03', label: 'Brama wjazdowa', description: 'Dostawy i logistyka', zone: 'GATE' },
  ],
  transport: [
    { code: 'CAM-01', label: 'Peron główny', description: 'Ruch pasażerski i peron', zone: 'PLATFORM' },
    { code: 'CAM-02', label: 'Hala dworcowa', description: 'Wejście i hol', zone: 'LOBBY' },
    { code: 'CAM-03', label: 'Tory — widok E', description: 'Sektor torowy i manewry', zone: 'TRACKS' },
  ],
  telecommunications: [
    { code: 'CAM-01', label: 'Podstawa masztu', description: 'Obiekt techniczny BTS', zone: 'MAST' },
    { code: 'CAM-02', label: 'Perimeter ogrodzenia', description: 'Dostęp do strefy radiowej', zone: 'FENCE' },
  ],
  military: [
    { code: 'CAM-01', label: 'Brama główna', description: 'Kontrola wjazdu — ochrona', zone: 'GATE' },
    { code: 'CAM-02', label: 'Hala montażowa', description: 'Strefa produkcyjna', zone: 'PRODUCTION' },
    { code: 'CAM-03', label: 'Perimeter południe', description: 'Patrol zewnętrzny', zone: 'PERIMETER S' },
  ],
  emergency: [
    { code: 'CAM-01', label: 'SOR — wejście', description: 'Ratownictwo medyczne 24/7', zone: 'ER' },
    { code: 'CAM-02', label: 'Parking ratunkowy', description: 'Karetki i dojazd', zone: 'PARKING' },
    { code: 'CAM-03', label: 'Wejcie szpitalne', description: 'Recepcja i hol', zone: 'LOBBY' },
  ],
  government: [
    { code: 'CAM-01', label: 'Wejście główne', description: 'Recepcja i kontrola dostępu', zone: 'LOBBY' },
    { code: 'CAM-02', label: 'Parking urzędu', description: 'Strefa odwiedzających', zone: 'PARKING' },
    { code: 'CAM-03', label: 'Tył budynku', description: 'Dostawy i zaplecze', zone: 'REAR' },
  ],
  fuel: [
    { code: 'CAM-01', label: 'Brama wjazdowa', description: 'Kontrola tankowców', zone: 'GATE' },
    { code: 'CAM-02', label: 'Zbiorniki', description: 'Strefa magazynowa paliw', zone: 'TANKS' },
    { code: 'CAM-03', label: 'Perimeter', description: 'Ogrodzenie obiektu', zone: 'FENCE' },
  ],
}

/** Kamery CCTV dopasowane do obiektów IK w Stalowej Woli. */
const OBJECT_PRESETS: Partial<Record<string, CameraPreset[]>> = {
  hsw: [
    { code: 'HSW-CAM-01', label: 'Brama główna Północ', description: 'Wjazd od strony centrum — kontrola ochrony', zone: 'GATE N' },
    { code: 'HSW-CAM-02', label: 'Hala produkcyjna A', description: 'Montaż podwozi i kadłubów', zone: 'HALL A' },
    { code: 'HSW-CAM-03', label: 'Perimeter Zachód', description: 'Ogrodzenie — patrol nocny', zone: 'PERIMETER W' },
  ],
  elc: [
    { code: 'ELC-CAM-01', label: 'Turbina i komin', description: 'Blok energetyczny — widok ogólny', zone: 'TURBINE' },
    { code: 'ELC-CAM-02', label: 'Plac techniczny', description: 'Dostawy paliwa i serwis', zone: 'YARD' },
    { code: 'ELC-CAM-03', label: 'Rozdzielnia HV', description: 'Strefa wysokiego napięcia', zone: 'HV' },
  ],
  szpital: [
    { code: 'SZP-CAM-01', label: 'SOR — wejście', description: 'Ratownictwo medyczne, dojazd karetek', zone: 'ER' },
    { code: 'SZP-CAM-02', label: 'Parking ratunkowy', description: 'Strefa ambulansów', zone: 'PARKING' },
  ],
  wod: [
    { code: 'WOD-CAM-01', label: 'Studnia główna', description: 'Uzdatnianie wody — COP Wodociągi', zone: 'PLANT' },
    { code: 'WOD-CAM-02', label: 'Brama wjazdowa', description: 'Logistyka i serwis', zone: 'GATE' },
  ],
  most: [
    { code: 'MOST-CAM-01', label: 'Przeprawa — widok N', description: 'Most na Sanie, strona północna', zone: 'BRIDGE N' },
    { code: 'MOST-CAM-02', label: 'Przeprawa — widok S', description: 'Monitoring ruchu na moście', zone: 'BRIDGE S' },
  ],
  czk: [
    { code: 'CZK-CAM-01', label: 'Wejście Starostwo', description: 'Recepcja i kontrola dostępu', zone: 'LOBBY' },
    { code: 'CZK-CAM-02', label: 'Sala operacyjna CZK', description: 'Centrum koordynacji kryzysowej', zone: 'OPS' },
  ],
  bts: [
    { code: 'BTS-CAM-01', label: 'Maszt — podstawa', description: 'Obiekt radiowy, strefa ogrodzona', zone: 'MAST' },
  ],
  pkp: [
    { code: 'PKP-CAM-01', label: 'Peron 1', description: 'Stacja Stalowa Wola Rozwadów', zone: 'PLATFORM' },
    { code: 'PKP-CAM-02', label: 'Hala dworcowa', description: 'Wejście główne pasażerów', zone: 'LOBBY' },
    { code: 'PKP-CAM-03', label: 'Tory — wschód', description: 'Sektor torowy i manewry', zone: 'TRACKS E' },
  ],
  paliwo: [
    { code: 'PERN-CAM-01', label: 'Brama PERN', description: 'Kontrola wjazdu cystern', zone: 'GATE' },
    { code: 'PERN-CAM-02', label: 'Zbiorniki magazynowe', description: 'Strefa składowania paliw', zone: 'TANKS' },
  ],
  policja: [
    { code: 'KPP-CAM-01', label: 'Front komendy', description: 'Wejście główne KPP', zone: 'LOBBY' },
    { code: 'KPP-CAM-02', label: 'Parking służbowy', description: 'Pojazdy patrolowe', zone: 'PARKING' },
  ],
  psp: [
    { code: 'PSP-CAM-01', label: 'Garaż wozów bojowych', description: 'Wyjazd z remizy', zone: 'GARAGE' },
    { code: 'PSP-CAM-02', label: 'Plac aparatu', description: 'Manewry i ćwiczenia', zone: 'YARD' },
    { code: 'PSP-CAM-03', label: 'Wejście remizy', description: 'Hol i dyżurka', zone: 'LOBBY' },
  ],
  osp: [
    { code: 'OSP-CAM-01', label: 'Remiza OSP', description: 'Garaż i wyjazd', zone: 'GARAGE' },
  ],
  um: [
    { code: 'UM-CAM-01', label: 'Wejście Urzędu Miasta', description: 'Hol główny i recepcja', zone: 'LOBBY' },
    { code: 'UM-CAM-02', label: 'Parking urzędu', description: 'Strefa odwiedzających', zone: 'PARKING' },
  ],
}

export function getCameraPresets(
  objectId: string,
  category: IKCategory,
  count: number,
): CameraPreset[] {
  const source = OBJECT_PRESETS[objectId] ?? CATEGORY_FALLBACK[category]
  return Array.from({ length: count }, (_, i) =>
    source[i] ?? {
      code: `CAM-${String(i + 1).padStart(2, '0')}`,
      label: `Kamera ${i + 1}`,
      description: 'Monitoring perimetru obiektu',
      zone: 'PERIMETER',
    },
  )
}

export function formatCameraTitle(preset: CameraPreset): string {
  return `${preset.code} · ${preset.label}`
}
