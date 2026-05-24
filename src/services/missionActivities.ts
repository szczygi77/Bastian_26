import type {
  DroneMission,
  IKObject,
  MissionActivityStep,
  MissionFinding,
  MissionResult,
  MissionType,
  MissionVerdict,
} from '@/types'
import { generateId } from '@/utils/format'

const ACTIVITY_PLANS: Record<MissionType, Omit<MissionActivityStep, 'id'>[]> = {
  reconnaissance: [
    { label: 'Nawiązywanie łączności', description: 'Stabilizacja połączenia i kalibracja kamery RGB', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Skan 360° obszaru', description: 'Rotacyjny przegląd perymetru i dojazdów', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Identyfikacja obiektów', description: 'Detekcja pojazdów, grup i punktów dostępu', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Dokumentacja fotograficzna', description: 'Zapis materiału dowodowego do bazy incydentu', durationTicks: 1, feedMode: 'rgb' },
  ],
  thermal_inspection: [
    { label: 'Kalibracja termowizji', description: 'Ustawienie zakresu temperatur i kompensacja tła', durationTicks: 1, feedMode: 'thermal' },
    { label: 'Skan elewacji', description: 'Przegląd ścian i instalacji zewnętrznych', durationTicks: 2, feedMode: 'thermal' },
    { label: 'Analiza dachu i rurociągów', description: 'Wykrywanie punktów gorących i strat ciepła', durationTicks: 2, feedMode: 'thermal' },
    { label: 'Porównanie z profilem bazowym', description: 'Korelacja z modelem termicznym obiektu IK', durationTicks: 2, feedMode: 'thermal' },
    { label: 'Generowanie raportu termicznego', description: 'Eksport mapy ciepła do centrum operacyjnego', durationTicks: 1, feedMode: 'thermal' },
  ],
  perimeter_monitoring: [
    { label: 'Wejście na trasę patrolu', description: 'Wznoszenie do wysokości obserwacyjnej', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Patrol sektor A', description: 'Obserwacja północnej i wschodniej granicy', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Patrol sektor B', description: 'Obserwacja południowej i zachodniej granicy', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Inspekcja ogrodzenia', description: 'Weryfikacja ciągłości ogrodzenia i bram', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Monitoring ciągły', description: 'Utrzymanie pozycji i rejestracja ruchu', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Przekazanie do dispatch', description: 'Synchronizacja obrazu z centrum dowodzenia', durationTicks: 1, feedMode: 'rgb' },
  ],
  communication_relay: [
    { label: 'Wznoszenie na wysokość przekaźnika', description: 'Optymalizacja zasięgu radiowego', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Rozwinięcie modułu relay', description: 'Aktywacja anteny i wzmacniacza sygnału', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Test siły sygnału', description: 'Pomiar RSSI w kluczowych punktach terenu', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Test łączności głosowej', description: 'Potwierdzenie kanału z zespołami naziemnymi', durationTicks: 2, feedMode: 'rgb' },
  ],
  fire_assessment: [
    { label: 'Termiczny przegląd strefy', description: 'Mapowanie źródeł ciepła i frontu pożaru', durationTicks: 2, feedMode: 'thermal' },
    { label: 'Analiza dymu RGB', description: 'Ocena kierunku i gęstości kłębów dymu', durationTicks: 2, feedMode: 'rgb' },
    { label: 'Wektory rozprzestrzeniania', description: 'Modelowanie rozwoju pożaru względem wiatru', durationTicks: 2, feedMode: 'thermal' },
    { label: 'Strefy ewakuacji', description: 'Wyznaczenie buforów bezpieczeństwa dla służb', durationTicks: 2, feedMode: 'rgb' },
  ],
  medical_delivery: [
    { label: 'Podejście do strefy lądowania', description: 'Weryfikacja LZ i komunikacja z medykami', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Precyzyjne lądowanie', description: 'Touchdown w wyznaczonej strefie bezpiecznej', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Zrzut AED', description: 'Uwolnienie defibrylatora i potwierdzenie GPS', durationTicks: 1, feedMode: 'rgb' },
    { label: 'Powiadomienie ZRM', description: 'Przekazanie współrzędnych i statusu dostawy', durationTicks: 2, feedMode: 'rgb' },
  ],
}

export function getMissionActivityPlan(type: MissionType): MissionActivityStep[] {
  return ACTIVITY_PLANS[type].map((step, index) => ({
    ...step,
    id: `${type}-step-${index + 1}`,
  }))
}

export function totalOnSiteTicks(steps: MissionActivityStep[]): number {
  return steps.reduce((sum, step) => sum + step.durationTicks, 0)
}

function seededRand(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822519)
    h = Math.imul(h ^ (h >>> 13), 3266489917)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function createFindingForStep(
  missionId: string,
  step: MissionActivityStep,
  stepIndex: number,
  target: Pick<IKObject, 'id' | 'name' | 'shortName' | 'category' | 'criticality' | 'status'>,
  missionType: MissionType,
): MissionFinding {
  const rand = seededRand(`${missionId}:${step.id}:${target.id}`)
  const roll = rand()

  const templates: Record<MissionType, Array<{ severity: MissionFinding['severity']; message: string }>> = {
    reconnaissance: [
      { severity: 'info', message: `Zidentyfikowano ${2 + Math.floor(rand() * 4)} pojazdy w strefie ${target.shortName}` },
      { severity: 'info', message: `Odczytano ${1 + Math.floor(rand() * 3)} grupy osób przy perymetrze obiektu` },
      { severity: roll > 0.7 ? 'warning' : 'info', message: `Wykryto ${roll > 0.7 ? 'niespodziewany' : 'standardowy'} ruch przy bramie głównej` },
      { severity: 'info', message: 'Materiał foto przesłany do bazy incydentu — 24 ujęcia w 4K' },
    ],
    thermal_inspection: [
      { severity: 'info', message: 'Kalibracja termowizji zakończona — zakres −10°C do 120°C' },
      { severity: target.criticality >= 4 ? 'warning' : 'info', message: `Anomalia termiczna na elewacji ${target.shortName} (+${(3 + rand() * 8).toFixed(1)}°C)` },
      { severity: roll > 0.65 ? 'warning' : 'info', message: roll > 0.65 ? 'Punkt gorący na dachu — możliwa awaria instalacji' : 'Dach w normie termicznej' },
      { severity: 'info', message: `Porównanie z profilem IK: odchylenie ${(rand() * 12).toFixed(1)}%` },
      { severity: 'info', message: 'Raport termiczny wygenerowany i przesłany do analityka' },
    ],
    perimeter_monitoring: [
      { severity: 'info', message: 'Sektor A — brak naruszeń perymetru' },
      { severity: 'info', message: 'Sektor B — obserwacja ciągła, ruch pieszy w normie' },
      { severity: roll > 0.75 ? 'critical' : roll > 0.5 ? 'warning' : 'info', message: roll > 0.75 ? 'ALERT: wykryto próbę wejścia poza bramą B' : roll > 0.5 ? 'Podejrzany obiekt przy ogrodzeniu — weryfikacja' : 'Ogrodzenie ciągłe, bram zamknięte' },
      { severity: 'info', message: 'Monitoring aktywny — transmisja do centrum operacyjnego' },
      { severity: 'info', message: 'Patrol zakończony — przekazanie obrazu do dispatch' },
    ],
    communication_relay: [
      { severity: 'info', message: 'Moduł przekaźnikowy aktywny na wys. 85 m' },
      { severity: 'info', message: `RSSI w strefie ${target.shortName}: ${(-55 - rand() * 20).toFixed(0)} dBm` },
      { severity: roll > 0.4 ? 'info' : 'warning', message: roll > 0.4 ? 'Pokrycie łączności: 94% terenu operacyjnego' : 'Słabszy sygnał na zachodnim skraju — wymaga reposition' },
      { severity: 'info', message: 'Test głosowy OK — potwierdzone przez zespół naziemny' },
    ],
    fire_assessment: [
      { severity: target.status === 'under_attack' ? 'critical' : 'warning', message: `Front termiczny: ${(120 + rand() * 280).toFixed(0)}°C w strefie instalacji` },
      { severity: 'warning', message: `Kierunek dymu: ${['NE', 'E', 'SE', 'N'][Math.floor(rand() * 4)]} — prędkość ${(2 + rand() * 6).toFixed(1)} m/s` },
      { severity: 'critical', message: `Strefa zagrożenia rozszerza się o ${(15 + rand() * 25).toFixed(0)} m / 10 min` },
      { severity: 'warning', message: `Rekomendowana ewakuacja bufora ${(100 + rand() * 150).toFixed(0)} m wokół ${target.shortName}` },
    ],
    medical_delivery: [
      { severity: 'info', message: 'LZ wolna — potwierdzenie od zespołu medycznego' },
      { severity: 'info', message: 'Lądowanie precyzyjne zakończone sukcesem' },
      { severity: 'info', message: 'AED dostarczony — współrzędne przekazane do ZRM' },
      { severity: 'info', message: 'Zespół ratowniczy potwierdził odbiór sprzętu' },
    ],
  }

  const options = templates[missionType]
  const picked = options[Math.min(stepIndex, options.length - 1)]

  return {
    id: `finding-${generateId()}`,
    timestamp: new Date(),
    severity: picked.severity,
    message: picked.message,
  }
}

export function buildMissionResult(
  missionType: MissionType,
  target: Pick<IKObject, 'id' | 'name' | 'shortName' | 'category' | 'criticality' | 'status'>,
  findings: MissionFinding[],
): MissionResult {
  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const warningCount = findings.filter(f => f.severity === 'warning').length

  let verdict: MissionVerdict = 'success'
  if (criticalCount > 0) verdict = 'partial'
  if (missionType === 'medical_delivery') verdict = 'success'
  if (findings.length === 0) verdict = 'partial'

  const summaries: Record<MissionType, string> = {
    reconnaissance: `Rozpoznanie obiektu ${target.shortName} zakończone — zebrano dane o ruchu i perymetrze`,
    thermal_inspection: `Inspekcja termiczna ${target.shortName} — ${warningCount > 0 ? 'wykryto anomalie' : 'profil termiczny w normie'}`,
    perimeter_monitoring: `Patrol perymetru ${target.shortName} — ${criticalCount > 0 ? 'zarejestrowano naruszenie' : 'strefa zabezpieczona'}`,
    communication_relay: `Przekaźnik łączności nad ${target.shortName} — kanał operacyjny aktywny`,
    fire_assessment: `Ocena pożaru w rejonie ${target.shortName} — przekazano wektory rozwoju i strefy ewakuacji`,
    medical_delivery: `Dostawa AED do strefy ${target.shortName} — potwierdzony odbiór przez służby medyczne`,
  }

  const recommendations: Record<MissionType, string[]> = {
    reconnaissance: [
      'Utrzymać obserwację do zakończenia incydentu',
      warningCount > 0 ? 'Wysłać patrol naziemny do weryfikacji ruchu przy bramie' : 'Kontynuować monitoring z CCTV obiektu',
    ],
    thermal_inspection: [
      warningCount > 0 ? 'Zlecić inspekcję techniczną wykrytych punktów gorących' : 'Zaplanować rutynową inspekcję za 30 dni',
      'Dołączyć raport termiczny do dossier obiektu IK',
    ],
    perimeter_monitoring: [
      criticalCount > 0 ? 'Natychmiastowa interwencja patrolu naziemnego' : 'Utrzymać zdalny monitoring przez 2 h',
      'Zsynchronizować z nagraniami CCTV obiektu',
    ],
    communication_relay: [
      'Pozostawić relay aktywny do końca operacji',
      'Monitorować RSSI co 15 min',
    ],
    fire_assessment: [
      'Przekazać wektory rozprzestrzeniania do PSP',
      'Aktywować procedurę ewakuacji bufora wokół obiektu',
      target.criticality >= 4 ? 'Powiadomić operatora obiektu krytycznego' : 'Monitorować front co 5 min',
    ],
    medical_delivery: [
      'Potwierdzić status pacjenta z ZRM',
      'Przygotować drugi dron jako backup medyczny',
    ],
  }

  return {
    verdict,
    summary: summaries[missionType],
    details: findings.map(f => f.message),
    recommendations: recommendations[missionType],
    completedAt: new Date(),
  }
}

export function missionStatusLabel(status: DroneMission['status'], activityLabel?: string): string {
  if (status === 'on_site' && activityLabel) return activityLabel
  const labels: Record<DroneMission['status'], string> = {
    dispatched: 'Wysłany',
    en_route: 'W drodze do celu',
    on_site: 'Praca na miejscu',
    returning: 'Powrót na bazę',
    completed: 'Zakończona',
  }
  return labels[status]
}

/** Monotoniczny postęp całej misji (0→100), niezależny od pozycji na trasie powrotnej. */
export function getMissionDisplayProgress(mission: DroneMission): { value: number; label: string } {
  switch (mission.status) {
    case 'dispatched':
    case 'en_route':
      return { value: mission.progressPercent * 0.35, label: 'Lot do celu' }
    case 'on_site':
      return {
        value: 35 + (mission.activityProgress ?? 0) * 0.50,
        label: 'Postęp pracy na miejscu',
      }
    case 'returning':
      return {
        value: 85 + (mission.activityProgress ?? 100 - mission.progressPercent) * 0.15,
        label: 'Powrót na bazę',
      }
    case 'completed':
      return { value: 100, label: 'Misja zakończona' }
    default:
      return { value: mission.progressPercent, label: 'Postęp misji' }
  }
}

/** Postęp bieżącego odcinka trasy (lot w/out, powrót) — rośnie zawsze do przodu. */
export function getMissionLegProgress(mission: DroneMission): number {
  if (mission.status === 'returning') {
    return mission.activityProgress ?? 100 - mission.progressPercent
  }
  return mission.progressPercent
}
