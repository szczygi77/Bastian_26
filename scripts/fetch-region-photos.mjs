#!/usr/bin/env node
/**
 * Pobiera zdjęcia województw z Wikimedia Commons do public/regions/{id}.jpg
 * Uruchom: npm run regions:fetch-photos
 */
import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../public/regions')
const USER_AGENT = 'BASTION-RegionPhotos/1.0 (demo; contact: local)'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const QUERIES = {
  podkarpackie: 'San river Stalowa Wola Poland',
  dolnoslaskie: 'Wroclaw Market Square Poland',
  'kujawsko-pomorskie': 'Torun Old Town Poland',
  lodzkie: 'Lodz Piotrkowska Poland',
  lubelskie: 'Lublin Old Town Poland',
  lubuskie: 'Gorzow Wielkopolski Poland',
  malopolskie: 'Wawel Castle Krakow',
  mazowieckie: 'Palace of Culture and Science Warsaw',
  opolskie: 'Opole Poland town hall',
  podlaskie: 'Bialystok Branicki Palace Poland',
  pomorskie: 'Gdansk Zuraw Motlawa',
  slaskie: 'Spodek Katowice',
  swietokrzyskie: 'Kielce Poland',
  'warminsko-mazurskie': 'Olsztyn Old Town Poland',
  wielkopolskie: 'Poznan Old Market Town Hall',
  zachodniopomorskie: 'Szczecin Wały Chrobrego',
}

mkdirSync(outDir, { recursive: true })

function wikimediaSearch(query) {
  const args = [
    '-sG', 'https://commons.wikimedia.org/w/api.php',
    '-A', USER_AGENT,
    '--data-urlencode', 'action=query',
    '--data-urlencode', 'generator=search',
    '--data-urlencode', `gsrsearch=${query}`,
    '--data-urlencode', 'gsrnamespace=6',
    '--data-urlencode', 'gsrlimit=8',
    '--data-urlencode', 'prop=imageinfo',
    '--data-urlencode', 'iiprop=url',
    '--data-urlencode', 'iiurlwidth=1280',
    '--data-urlencode', 'format=json',
  ]
  const json = execFileSync('curl', args, { encoding: 'utf8' })
  if (json.startsWith('You are making too many requests')) {
    throw new Error('Wikimedia rate limit')
  }
  const data = JSON.parse(json)
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
  for (const page of pages) {
    const title = page.title ?? ''
    if (/logo|flag|coat|herb|icon/i.test(title)) continue
    const info = page.imageinfo?.[0]
    const url = info?.thumburl ?? info?.url
    if (url) return { title, url }
  }
  return null
}

for (const [id, query] of Object.entries(QUERIES)) {
  const outPath = path.join(outDir, `${id}.jpg`)
  if (existsSync(outPath)) {
    console.log(`[BASTION] ${id}.jpg — już istnieje, pomijam`)
    continue
  }

  await sleep(1500)

  let hit = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      hit = wikimediaSearch(query)
      break
    } catch (error) {
      const waitMs = 4000 * (attempt + 1)
      console.warn(`[BASTION] Rate limit dla ${id}, czekam ${waitMs}ms…`)
      await sleep(waitMs)
    }
  }

  if (!hit) {
    console.warn(`[BASTION] Brak zdjęcia dla ${id} (${query})`)
    continue
  }
  execFileSync('curl', ['-fsSL', '-A', USER_AGENT, hit.url, '-o', outPath], { stdio: 'inherit' })
  console.log(`[BASTION] ${id}.jpg <= ${hit.title}`)
}

writeFileSync(path.join(outDir, '.gitkeep'), '')
console.log('[BASTION] Zdjęcia regionów zaktualizowane.')
