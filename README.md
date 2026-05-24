# BASTION Enterprise Command Center

**SpaceShield 2026 · Zespół m&m**

Offline-first platforma świadomości sytuacyjnej infrastruktury krytycznej — dla defence, dual-use i crisis management.

---

## Uruchomienie

Wymagania: **Node.js 20.19+ lub 22.12+** (Vite 8), npm 10+ (Windows / macOS / Linux).

```bash
nvm use              # projekt ma .nvmrc → Node 22
cp .env.example .env   # uzupełnij klucze API — plik .env nie trafia do gita
npm install
```

| Tryb | Komenda | Opis |
|------|---------|------|
| Przeglądarka | `npm run dev` | http://localhost:3000 |
| Desktop (dev) | `npm start` lub `npm run electron:dev` | Electron + hot reload |
| Instalator | `npm run electron:build` | `.dmg` (macOS), `.exe` (Windows), `.AppImage` / `.deb` (Linux) |

### macOS
```bash
npm run electron:dev
# build: npm run electron:build  →  release/BASTION-*.dmg
# ikony Dock: npm run icons:generate  (wymaga python3 + Pillow, opcjonalnie iconutil)
```

### Windows (PowerShell / CMD)
```powershell
npm run electron:dev
# build: npm run electron:build  →  release\BASTION-Setup-*.exe
```

### Linux
```bash
npm run electron:dev
# build: npm run electron:build  →  release/BASTION-*.AppImage lub .deb
# AppImage: chmod +x BASTION-*.AppImage && ./BASTION-*.AppImage
```

Na Linuxie, jeśli Electron nie startuje w dev, doinstaluj zależności GTK (np. Ubuntu/Debian):
`sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libasound2t64`

W trybie **LIVE** aplikacja pobiera m.in. Open-Meteo, OpenSky, NASA FIRMS (opcjonalny klucz) oraz metadane Sentinel-1 z Copernicus Data Space (wymaga `VITE_CDSE_CLIENT_ID` i `VITE_CDSE_CLIENT_SECRET`).

**Zdjęcia obiektów IK** (mapa, tooltips, panel szczegółów):

1. Ustaw `VITE_GOOGLE_MAPS_API_KEY` w `.env` (Places API + Street View + Static Maps).
2. Pobierz zdjęcia dla wszystkich 13 punktów na mapie:
   ```bash
   npm run media:fetch-google
   ```
   Pliki trafiają do `public/media/ik/` (`{id}.jpg` + `manifest.json`) i są używane offline w aplikacji.
3. Bez klucza / bez pobranych plików — runtime próbuje Google API, potem fallback Wikimedia / Wikipedia / OSM.

---

## Architektura

```
bastion-enterprise/
├── electron/           # Electron main + preload (IPC)
├── src/
│   ├── app/            # App.tsx — routing view-based (bez React Router)
│   ├── features/       # 11 modułów operacyjnych
│   │   ├── dashboard/  # Command Dashboard
│   │   ├── map/        # Tactical Map (Leaflet + public API layers)
│   │   ├── graph/      # Dependency Graph (D3.js + BFS/DFS)
│   │   ├── scenarios/  # Scenario Engine (9 scenariuszy)
│   │   ├── alerts/     # Alert Center (lifecycle alertów)
│   │   ├── ai/         # Decision Support (rule-based, nie chatbot)
│   │   ├── skymarshal/ # SkyMarshal (koordynacja dronów służb)
│   │   ├── audit/      # Audit Log (immutable, eksport CSV/JSON)
│   │   ├── compliance/ # Compliance Center (10 regulacji)
│   │   ├── system/     # System Status (health, connections)
│   │   └── reports/    # Report Generator (5 typów, JSON/HTML/PDF)
│   ├── services/       # Silniki logiki (cascade, graph, skymarshal, audit...)
│   ├── adapters/       # Data adapters (real + mock fallback)
│   ├── data/           # Statyczne dane Stalowej Woli (13 obiektów IK)
│   ├── store/          # Zustand global state
│   └── types/          # TypeScript interfaces
```

---

## Tryby systemu

### LIVE MODE
- Pobiera realne publiczne dane: Open-Meteo, OpenSky Network, NASA FIRMS, OSM/Overpass
- Aktualizuje warstwy mapy w czasie rzeczywistym
- Synchronizuje cache lokalny (IndexedDB)
- Każde przełączenie trybu logowane w Audit Log

### SIMULATION MODE
- Używa lokalnych danych (dane Stalowej Woli)
- Bezpieczny tryb szkoleń i prezentacji
- Widoczny pomarańczowy banner "SIMULATION MODE"
- Wszelkie akcje logowane z tagiem `simulation`

---

## Publiczne źródła danych

| Źródło | Adapter | Status |
|--------|---------|--------|
| Open-Meteo | `weatherAdapter.ts` | ✅ Real fetch |
| OpenSky Network | `openskyAdapter.ts` | ✅ Real fetch |
| NASA FIRMS | `firmsAdapter.ts` | ✅ Real (klucz API opcjonalny) |
| OSM / Overpass | `osmAdapter.ts` | ✅ Tiles via CartoDB Dark |
| Sentinel-1 SAR (CDSE) | `sentinelAdapter.ts` | ✅ OAuth + katalog OData (`.env`) |
| RCB / PIONIER | `rcbMockAdapter.ts` | 🔒 Mock (system niejawny) |
| TETRA | `tetraMockAdapter.ts` | 🔒 Mock |
| MAVLink / DJI SDK | `mavlinkMockAdapter.ts` | 🔒 Mock (adaptery gotowe) |

---

## Offline-first

- **IndexedDB**: cache danych publicznych + alerty + audit log
- **Degraded mode**: orange banner, sync queue widoczna
- **Sync queue**: eskalacje i raporty czekają na reconnect
- **Graceful fallback**: każdy adapter ma `mock fallback` gdy API niedostępne

---

## Moduł SkyMarshal

Koordynacja **istniejących** dronów służb — nie własna flota:

| Służba | Model | Protokół | Payload |
|--------|-------|----------|---------|
| Policja (2x) | DJI Matrice 300 RTK | DJI SDK | Thermal, RGB, Spotlight |
| PSP (2x) | DJI M30T | DJI SDK | Thermal, RGB, Rangefinder |
| OSP | DJI Mini 3 Pro | DJI SDK | RGB 4K |
| Jedn. Kryzysowa | Autel EVO II Pro | MAVLink | Thermal, Gas sensor |

Scoring dronów (35% distance + 30% battery + 25% payload + 10% availability).
Misje: reconnaissance, thermal inspection, perimeter monitoring, communication relay, fire assessment, medical delivery.

---

## Compliance

| Regulacja | Status |
|-----------|--------|
| KSC | ✅ Zgodny |
| NIS2 Art. 21 | ✅ Zgodny |
| NIS2 Art. 23 | ⚠️ Częściowy (raportowanie CSIRT) |
| CER | ✅ Zgodny |
| RODO | ⚠️ Częściowy (DPIA przed wdrożeniem) |
| EU AI Act Annex III | ⚠️ Częściowy (rejestracja EU AI DB) |
| KRI | ✅ Zgodny |
| STANAG 4559/4607 | 🔍 Do przeglądu (pilot MON) |
| ISA/IEC 62443 | ⚠️ Częściowy (audyt przed SCADA) |
| ISO 27001 | ⚠️ Częściowy (certyfikacja) |

---

## 14 silników analitycznych

| # | Silnik | Plik | Rola |
|---|--------|------|------|
| 1 | Cascade Engine | `cascadeEngine.ts` | Propagacja BFS kaskady IK |
| 2 | Graph Engine | `graphEngine.ts` | Analiza grafu zależności |
| 3 | Recommendation Engine | `recommendationEngine.ts` | Regułowe rekomendacje operacyjne (<4s SLA) |
| 4 | Alert Engine | `alertEngine.ts` | Lifecycle i grupowanie alertów |
| 5 | Scenario Engine | `scenarioEngine.ts` / `cinematicScenarioFlow.ts` | Orkiestracja 9 scenariuszy |
| 6 | SkyMarshal Engine | `skymarshalEngine.ts` | Scoring i dispatch dronów służb |
| 7 | Execution Pipeline | `executionPipelineService.ts` | Workflow approve → execute (human-in-the-loop) |
| 8 | Threat Detection | `threatDetectionService.ts` | 4 kategorie detekcji regułowej (AUTO-DETECT) |
| 9 | Source Trust | `sourceTrustService.ts` | Trust score źródeł publicznych |
| 10 | Cascade Simulation | `cascadeSimulationService.ts` | Containment i symulacja redukcji ryzyka |
| 11 | Operational Telemetry | `operationalTelemetryService.ts` | Puls operacyjny i presja propagacji |
| 12 | Audit Chain Verifier | `auditLogService.ts` | Łańcuch SHA-256 + weryfikacja integralności |
| 13 | Public API Orchestrator | `apiOrchestrator.ts` / `publicApiCache` | Sync LIVE/CACHED/offline queue |
| 14 | Simulated Camera Engine | `simulatedCameraEngine.ts` | Analiza klatki regułowa (ruch, strefy) |

---

## Demo flow (hackathon — 12 kroków)

1. **Login CL5** → `mjr. Andrzej Kowalski (DOWÓDCA)` → PIN: `1234`
2. **Uruchom pełne demo** → scenariusz blackout z Dashboard
3. **Auto-detekcja** → panel „Wykryte zagrożenia” (4 kategorie) + badge AUTO-DETECT
4. **ICM** → alerty powiązane z incydentem, eskalacja z TETRA MOCK ACK (~2s)
5. **Rekomendacja** → badge czasu generowania (<4s lokalnie)
6. **Approve** → human-in-the-loop przed wykonaniem akcji
7. **Containment** → graf z redukcją węzłów dotkniętych
8. **SkyMarshal** → dispatch najlepszego drona (THERMAL INSPECTION)
9. **Raport PDF (RCB)** → format NIS2 Art. 23 (24h/72h)
10. **Audit Log** → „Zweryfikuj integralność” (SHA-256 chain)
11. **Tryb SIMULATION** → pomarańczowy banner + badge MOCK na TETRA/RCB
12. **Mapa IK** → 3 kamery HLS LIVE (Stalowa Wola) + 10 symulowanych z badge źródła

### Checklist testów jury

| Test | Oczekiwany wynik |
|------|------------------|
| Login CL5 → pełny flow | Wszystkie 12 kroków demo flow = done |
| Login CL2 → approve rekomendacji | Przycisk disabled + tooltip „Wymagany poziom CL4” |
| Utrata sieci (DevTools offline) | Banner offline, sync queue, cache IndexedDB |
| Tryb SIMULATION | Pomarańczowy banner globalny, TETRA MOCK badge |
| Stalowa Wola HLS (HSW/ELC/MOST) | Odtwarzanie strumienia TVK Stella w panelu IK |
| PDF raportu RCB | Plik `.pdf` pobiera się z nagłówkami NIS2 |
| Audit chain verify | Przycisk zwraca OK + liczba wpisów SHA-256 |
| RBAC eskalacja CL2 | Blokada eskalacji alertu (< CL3) |

---

## Demo flow (legacy — 11 kroków)

1. **Login** → wybierz `mjr. Andrzej Kowalski (DOWÓDCA)` → PIN: `1234`
2. **Dashboard** → sprawdź threat level, status systemów, sync statusy
3. **Tactical Map** → włącz warstwy: IK Objects + Dependency Links + Aviation
4. **Dependency Graph** → zbadaj graf zależności Stalowej Woli
5. **Scenarios** → wybierz `Sabotaż Elektrociepłowni` → `LAUNCH SCENARIO`
6. **Graf kaskadowy** → obserwuj propagację BFS od ELC przez HSW → szpital → CZK
7. **Alert Center** → filtruj `critical` → acknowledge → escalate (TETRA MOCK · ćwiczenie)
8. **Decision Support** → zatwierdź rekomendowane działania
9. **SkyMarshal** → wybierz misję `THERMAL INSPECTION` → cel: ELC → `DISPATCH BEST DRONE`
10. **Audit Log** → sprawdź zapis wszystkich akcji operatora + weryfikacja SHA-256
11. **Reports** → generuj `INCIDENT REPORT` → pobierz HTML / JSON / PDF

---

## Bezpieczeństwo

- On-premise deployment (no public cloud)
- TLS 1.3 + AES-256 (wskaźniki w UI)
- RBAC 5 ról: Operator, Analyst, Commander, Admin, Auditor
- MFA-ready (login screen)
- HSM-ready (key management placeholder)
- Audit log immutable-style, retencja 5 lat (wymóg KSC)
- Testy penetracyjne: min. 1x rok (wymóg operacyjny)
