export type PublicCameraFeedKind = 'hls' | 'snapshot'

export interface PublicCamera {
  id: string
  voivodeshipId: string
  slug: string
  code: string
  /** Dokładna nazwa miejscowości (z polskimi znakami) */
  city: string
  label: string
  description: string
  feedKind: PublicCameraFeedKind
  streamUrl: string
}

const WEBCAMERA = 'WebCamera.pl'

function camHls(
  voivodeshipId: string,
  slug: string,
  code: string,
  city: string,
  label: string,
  description: string,
  streamUrl: string,
): PublicCamera {
  return {
    id: `${voivodeshipId}-${slug}`,
    voivodeshipId,
    slug,
    code,
    city,
    label,
    description,
    feedKind: 'hls',
    streamUrl,
  }
}

function camSnapshot(
  voivodeshipId: string,
  slug: string,
  code: string,
  city: string,
  label: string,
  description: string,
  streamUrl: string,
): PublicCamera {
  return {
    id: `${voivodeshipId}-${slug}`,
    voivodeshipId,
    slug,
    code,
    city,
    label,
    description,
    feedKind: 'snapshot',
    streamUrl,
  }
}

/** Publiczne kamery na żywo — HLS (WebCamera.pl, TVK Stella i inne źródła publiczne) */
export const PUBLIC_CAMERAS: PublicCamera[] = [
  camHls('podkarpackie', 'stalowa-wola-popieluszki', 'PUB-PK01', 'Stalowa Wola', 'ul. Popiełuszki — centrum', 'Rejon operacyjny LIVE · TVK Stella',
    'https://stream.tvkstella.pl/stella/kamera3.m3u8'),
  camHls('podkarpackie', 'stalowa-wola-okulickiego', 'PUB-PK07', 'Stalowa Wola', 'ul. Okulickiego', 'Monitoring miejski · TVK Stella',
    'https://stream.tvkstella.pl/stella/kamera1.m3u8'),
  camHls('podkarpackie', 'stalowa-wola-1-sierpnia', 'PUB-PK08', 'Stalowa Wola', 'ul. 1-go Sierpnia', 'Węzeł komunikacyjny · TVK Stella',
    'https://stream.tvkstella.pl/stella/kamera4.m3u8'),
  camHls('podkarpackie', 'rzeszow', 'PUB-PK02', 'Rzeszów', 'Stary Rynek i Ratusz', 'Centrum województwa · źródło publiczne',
    'https://hoktastream5.webcamera.pl/rzeszow_cam_b3e146/rzeszow_cam_b3e146.stream/playlist.m3u8'),
  camHls('podkarpackie', 'przemysl-rynek', 'PUB-PK03', 'Przemyśl', 'Rynek — centrum', 'Korytarz wschodni · monitoring miejski',
    'https://hoktastream1.webcamera.pl/toya_cam_d7ae32/toya_cam_d7ae32.stream/playlist.m3u8'),
  camHls('podkarpackie', 'przemysl-plac-niepodleglosci', 'PUB-PK04', 'Przemyśl', 'Plac Niepodległości', 'Widok na plac główny',
    'https://hoktastream1.webcamera.pl/toya_cam_cc8799/toya_cam_cc8799.stream/playlist.m3u8'),
  camHls('podkarpackie', 'zapora-wodna-w-solinie', 'PUB-PK05', 'Solina', 'Zapora wodna', 'Jezioro Solińskie · infrastruktura wodna',
    'https://hoktastream4.webcamera.pl/pkl_cam_683a26/pkl_cam_683a26.stream/playlist.m3u8'),
  camHls('podkarpackie', 'polanczyk', 'PUB-PK06', 'Polańczyk', 'Jezioro Solińskie', 'Panorama zbiornika · monitoring pogodowy',
    'https://hoktastream1.webcamera.pl/polanczyk_cam_aa8511/polanczyk_cam_aa8511.stream/playlist.m3u8'),

  camHls('lubelskie', 'zamosc', 'PUB-LU01', 'Zamość', 'Rynek Wielki', 'UNESCO · historyczne centrum Lubelszczyzny',
    'https://hoktastream4.webcamera.pl/zamosc_cam_7cc632/zamosc_cam_7cc632.stream/playlist.m3u8'),

  camHls('mazowieckie', 'warszawa', 'PUB-MZ01', 'Warszawa', 'Pałac Kultury i Nauki', 'Centrum stolicy · agregat strategiczny',
    'https://hoktastream2.webcamera.pl/warszawa_cam_d0fc4d/warszawa_cam_d0fc4d.stream/playlist.m3u8'),

  camHls('malopolskie', 'krakow-mogilska-umk', 'PUB-MA01', 'Kraków', 'Panorama miasta — Mogilska', 'Wawel i centrum · sektor energetyczny',
    'https://hoktastream1.webcamera.pl/krakow_cam_66c146/krakow_cam_66c146.stream/playlist.m3u8'),
  camHls('malopolskie', 'krakow-rynek', 'PUB-MA02', 'Kraków', 'Rynek Główny', 'Stare Miasto · widok na Sukiennice',
    'https://hoktastream1.webcamera.pl/krakow_cam_da9ab3/krakow_cam_da9ab3.stream/playlist.m3u8'),
  camHls('malopolskie', 'zakopane', 'PUB-MA03', 'Zakopane', 'Krupówki — deptak', 'Podhale · monitoring turystyczny',
    'https://hoktastream4.webcamera.pl/zakopane_cam_cd5b2d_reklamy/zakopane_cam_cd5b2d_reklamy.stream/playlist.m3u8'),
  camHls('malopolskie', 'krupowki', 'PUB-MA04', 'Zakopane', 'Krupówki — środek deptaku', 'Tatry · ruch turystyczny',
    'https://hoktastream2.webcamera.pl/krupowki2_cam_305cd7/krupowki2_cam_305cd7.stream/playlist.m3u8'),
  camHls('malopolskie', 'tarnow', 'PUB-MA05', 'Tarnów', 'Rynek Miejski', 'Małopolska · starówka',
    'https://hoktastream3.webcamera.pl/tarnow_cam_d0e19c/tarnow_cam_d0e19c.stream/playlist.m3u8'),

  camHls('slaskie', 'katowice-rynek', 'PUB-ŚL01', 'Katowice', 'Rynek — centrum GOP', 'Hub przemysłowy · agregat Śląska',
    'https://hoktastream2.webcamera.pl/katowice_cam_88da9e/katowice_cam_88da9e.stream/playlist.m3u8'),
  camHls('slaskie', 'gliwice', 'PUB-ŚL02', 'Gliwice', 'Centrum miasta', 'GOP · monitoring pogodowy',
    'https://hoktastream3.webcamera.pl/gliwice_cam_c28bda/gliwice_cam_c28bda.stream/playlist.m3u8'),
  camHls('slaskie', 'bielsko-biala', 'PUB-ŚL03', 'Bielsko-Biała', 'Plac Bolesława Chrobrego', 'Podbeskidzie · centrum',
    'https://hoktastream1.webcamera.pl/bielsko_cam_1c4da5/bielsko_cam_1c4da5.stream/playlist.m3u8'),
  camHls('slaskie', 'ustron', 'PUB-ŚL04', 'Ustroń', 'Rynek — centrum', 'Beskidy · monitoring turystyczny',
    'https://hoktastream1.webcamera.pl/nocowanie_cam_a470d8/nocowanie_cam_a470d8.stream/playlist.m3u8'),
  camHls('slaskie', 'wisla', 'PUB-ŚL05', 'Wisła', 'Deptak — centrum', 'Stok narciarski · Beskid Śląski',
    'https://hoktastream1.webcamera.pl/wisla_cam_e154be/wisla_cam_e154be.stream/playlist.m3u8'),

  camHls('pomorskie', 'gdansk-stare-miasto', 'PUB-PM01', 'Gdańsk', 'Stare Miasto — Motława', 'Port i wybrzeże · węzły łączności',
    'https://hoktastream2.webcamera.pl/gdansk_cam_9e790c/gdansk_cam_9e790c.stream/playlist.m3u8'),
  camHls('pomorskie', 'gdansk-motlawa', 'PUB-PM02', 'Gdańsk', 'Motława — nabrzeże', 'Widok na Żuraw i nabrzeże portowe',
    'https://hoktastream2.webcamera.pl/umgdansk_cam_11161c/umgdansk_cam_11161c.stream/playlist.m3u8'),
  camHls('pomorskie', 'gdansk-dlugi-targ', 'PUB-PM03', 'Gdańsk', 'Długi Targ', 'Stare Miasto · Długi Targ',
    'https://hoktastream4.webcamera.pl/umgdansk_cam_2e4f1b/umgdansk_cam_2e4f1b.stream/playlist.m3u8'),
  camHls('pomorskie', 'sopot-molo', 'PUB-PM04', 'Sopot', 'Molo — Bałtyk', 'Wybrzeże · monitoring nadmorski',
    'https://hoktastream1.webcamera.pl/sopot_cam_e1c28f/sopot_cam_e1c28f.stream/playlist.m3u8'),
  camHls('pomorskie', 'gdynia', 'PUB-PM05', 'Gdynia', 'Skwer Kościuszki — port', 'Port · promy Stena Line',
    'https://hoktastream1.webcamera.pl/gdynia_cam_b3ccea/gdynia_cam_b3ccea.stream/playlist.m3u8'),
  camHls('pomorskie', 'hel', 'PUB-PM06', 'Hel', 'Bulwar — plaża', 'Półwysep Helski · Bałtyk',
    'https://hoktastream1.webcamera.pl/hel_cam_cf55ee/hel_cam_cf55ee.stream/playlist.m3u8'),
  camHls('pomorskie', 'wladyslawowo', 'PUB-PM07', 'Władysławowo', 'Plaża — morze', 'Pobrzeże · sezon nadmorski',
    'https://hoktastream2.webcamera.pl/wladyslawowo_cam_459a14/wladyslawowo_cam_459a14.stream/playlist.m3u8'),
  camHls('pomorskie', 'leba', 'PUB-PM08', 'Łeba', 'Plaża i wydmy', 'Słowiński Park Narodowy · wybrzeże',
    'https://hoktastream4.webcamera.pl/leba_cam_0d3c03/leba_cam_0d3c03.stream/playlist.m3u8'),

  camHls('wielkopolskie', 'poznan-stary-rynek', 'PUB-WP01', 'Poznań', 'Stary Rynek — Ratusz', 'Hub logistyczny · centrum Wielkopolski',
    'https://hoktastream2.webcamera.pl/poznan_cam_a2ec1b/poznan_cam_a2ec1b.stream/playlist.m3u8'),

  camHls('dolnoslaskie', 'wroclaw-rynek', 'PUB-DŚ01', 'Wrocław', 'Rynek — Stare Miasto', 'Centrum Dolnego Śląska',
    'https://hoktastream2.webcamera.pl/wroclaw_cam_181113/wroclaw_cam_181113.stream/playlist.m3u8'),
  camHls('dolnoslaskie', 'jelenia-gora', 'PUB-DŚ02', 'Jelenia Góra', 'Panorama miasta', 'Sudety · monitoring regionalny',
    'https://hoktastream4.webcamera.pl/jeleniagora_cam_73a10c/jeleniagora_cam_73a10c.stream/playlist.m3u8'),

  camHls('kujawsko-pomorskie', 'bydgoszcz', 'PUB-KP01', 'Bydgoszcz', 'Rynek — centrum', 'Kujawy · węzły mostowe',
    'https://hoktastream3.webcamera.pl/bydgoszcz_cam_406fa8/bydgoszcz_cam_406fa8.stream/playlist.m3u8'),
  camHls('kujawsko-pomorskie', 'torun-rynek', 'PUB-KP02', 'Toruń', 'Rynek Staromiejski', 'UNESCO · historyczne centrum regionu',
    'https://hoktastream3.webcamera.pl/torun_cam_41fa74/torun_cam_41fa74.stream/playlist.m3u8'),

  camHls('lodzkie', 'lodz-piotrkowska', 'PUB-ŁD01', 'Łódź', 'Ulica Piotrkowska', 'Deptak · hub logistyczny Łódzkiego',
    'https://hoktastream3.webcamera.pl/lodz_cam_42fb00/lodz_cam_42fb00.stream/playlist.m3u8'),
  camHls('lodzkie', 'lodz-manufaktura', 'PUB-ŁD02', 'Łódź', 'Manufaktura — centrum', 'Kompleks przemysłowy · monitoring miejski',
    'https://hoktastream1.webcamera.pl/toya_cam_5e36c3/toya_cam_5e36c3.stream/playlist.m3u8'),

  camHls('lubuskie', 'gorzow-wielkopolski', 'PUB-LB01', 'Gorzów Wielkopolski', 'Centrum — nad Wartą', 'Stolica województwa · perimetr zachodni',
    'https://hoktastream4.webcamera.pl/gorzow_cam_0e7519/gorzow_cam_0e7519.stream/playlist.m3u8'),

  camHls('opolskie', 'opole', 'PUB-OP01', 'Opole', 'Rynek — centrum miasta', 'Opolskie · monitoring transgraniczny',
    'https://hoktastream4.webcamera.pl/opole_cam_8b53d4/opole_cam_8b53d4.stream/playlist.m3u8'),

  camHls('podlaskie', 'bialystok-rynek-kosciuszki', 'PUB-PD01', 'Białystok', 'Rynek Kościuszki', 'Perimetr wschodni · centrum Podlasia',
    'https://hoktastream3.webcamera.pl/bialystok_cam_4fc01a/bialystok_cam_4fc01a.stream/playlist.m3u8'),

  camHls('swietokrzyskie', 'kielce-rynek', 'PUB-ŚK01', 'Kielce', 'Rynek — centrum miasta', 'Kielecka Starówka · monitoring miejski',
    'https://hoktastream4.webcamera.pl/kielcerynek_cam_6913aa/kielcerynek_cam_6913aa.stream/playlist.m3u8'),
  camHls('swietokrzyskie', 'stadion-kielce', 'PUB-ŚK02', 'Kielce', 'STADION ski — stok narciarski', 'Centrum sportowe · warunki na stoku',
    'https://hoktastream1.webcamera.pl/kielce_cam_bb23d4/kielce_cam_bb23d4.stream/playlist.m3u8'),
  camHls('swietokrzyskie', 'kielce-sienkiewicza', 'PUB-ŚK03', 'Kielce', 'ul. Sienkiewicza', 'Deptak · centrum handlowe',
    'https://nazywo.emkielce.pl/live/test/21/21-radio/index.m3u8'),
  camHls('swietokrzyskie', 'kielce-pomnik-sienkiewicza', 'PUB-ŚK04', 'Kielce', 'Pomnik Henryka Sienkiewicza', 'Centrum · punkt widokowy',
    'https://nazywo.emkielce.pl/live/test/13/13-radio/index.m3u8'),
  camHls('swietokrzyskie', 'kielce-telegraf', 'PUB-ŚK05', 'Kielce', 'Telegraf — panorama miasta', 'Widok na Kielce z wysokości',
    'https://nazywo.emkielce.pl/live/test/31/31-radio/index.m3u8'),
  camHls('swietokrzyskie', 'starachowice', 'PUB-ŚK06', 'Starachowice', 'Skwer Halnego — Zalew Pasternik', 'Region przemysłowy · monitoring miejski',
    'https://hoktastream1.webcamera.pl/starachowice_cam_11ce7e/starachowice_cam_11ce7e.stream/playlist.m3u8'),
  camHls('swietokrzyskie', 'busko-zdroj-teznia', 'PUB-ŚK07', 'Busko-Zdrój', 'Tężnia solankowa', 'Uzdrowisko · sektor turystyczny',
    'https://nazywo.emkielce.pl/live/test/25/25-radio/index.m3u8'),

  camHls('warminsko-mazurskie', 'olsztyn', 'PUB-WM01', 'Olsztyn', 'Centrum — Warmia', 'Stolica regionu · infrastruktura północna',
    'https://hoktastream2.webcamera.pl/olsztyn_cam_43a997/olsztyn_cam_43a997.stream/playlist.m3u8'),
  camHls('warminsko-mazurskie', 'mikolajki', 'PUB-WM02', 'Mikołajki', 'Port — Jezioro Mikołajskie', 'Mazury · sektor turystyczny',
    'https://hoktastream1.webcamera.pl/skywind_cam_267ae1/skywind_cam_267ae1.stream/playlist.m3u8'),

  camHls('zachodniopomorskie', 'szczecin', 'PUB-ZP01', 'Szczecin', 'Bulwary Szczecińskie', 'Port zachodni · Odra',
    'https://hoktastream3.webcamera.pl/szczecin_cam_141876/szczecin_cam_141876.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'kolobrzeg', 'PUB-ZP02', 'Kołobrzeg', 'Plaża — molo', 'Wybrzeże · monitoring nadmorski',
    'https://hoktastream5.webcamera.pl/nocowanie_cam_a32dd1/nocowanie_cam_a32dd1.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'kolobrzeg-latarnia', 'PUB-ZP03', 'Kołobrzeg', 'Latarnia morska', 'Port · Bałtyk',
    'https://hoktastream1.webcamera.pl/toya_cam_65488b/toya_cam_65488b.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'miedzyzdroje', 'PUB-ZP04', 'Międzyzdroje', 'Plaża wschodnia', 'Wyspa Wolin · sektor turystyczny',
    'https://hoktastream1.webcamera.pl/miedzyzdroje_cam_613997/miedzyzdroje_cam_613997.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'swinoujscie', 'PUB-ZP05', 'Świnoujście', 'Plaża — port', 'Wybrzeże · terminal promowy',
    'https://hoktastream4.webcamera.pl/swinoujscie_cam_3be0ba/swinoujscie_cam_3be0ba.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'rewal', 'PUB-ZP06', 'Rewal', 'Deptak — plaża', 'Nadmorski ruch turystyczny',
    'https://hoktastream1.webcamera.pl/gminarewal_cam_a95d00/gminarewal_cam_a95d00.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'darlowo', 'PUB-ZP07', 'Darłowo', 'Plaża — port', 'Wybrzeże · monitoring nadmorski',
    'https://hoktastream1.webcamera.pl/darlowo_cam_dc4e72/darlowo_cam_dc4e72.stream/playlist.m3u8'),
  camHls('zachodniopomorskie', 'mielno', 'PUB-ZP08', 'Mielno', 'Plaża — nadmorski deptak', 'Bałtyk · sezon wypoczynkowy',
    'https://hoktastream4.webcamera.pl/mielno_cam_0e2e7c/mielno_cam_0e2e7c.stream/playlist.m3u8'),
]

export function getPublicCamerasForRegion(voivodeshipId: string): PublicCamera[] {
  return PUBLIC_CAMERAS.filter(camera => camera.voivodeshipId === voivodeshipId)
}

export const PUBLIC_CAMERA_SOURCE = WEBCAMERA
