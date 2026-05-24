#!/usr/bin/env node
/**
 * Pobiera herby województw (COA) z Wikimedia Commons do public/regions/herbs/{id}.svg
 * Uruchom: npm run regions:fetch-emblems
 */
import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../public/regions/herbs')
const USER_AGENT = 'BASTION-RegionEmblems/1.0 (demo; local)'

const TITLES = {
  podkarpackie: 'POL województwo podkarpackie COA.svg',
  dolnoslaskie: 'POL województwo dolnośląskie COA.svg',
  'kujawsko-pomorskie': 'POL województwo kujawsko-pomorskie COA.svg',
  lodzkie: 'POL województwo łódzkie COA.svg',
  lubelskie: 'POL województwo lubelskie COA.svg',
  lubuskie: 'POL województwo lubuskie COA.svg',
  malopolskie: 'POL województwo małopolskie COA.svg',
  mazowieckie: 'POL województwo mazowieckie COA.svg',
  opolskie: 'POL województwo opolskie COA.svg',
  podlaskie: 'POL województwo podlaskie COA.svg',
  pomorskie: 'POL województwo pomorskie COA.svg',
  slaskie: 'POL województwo śląskie COA.svg',
  swietokrzyskie: 'POL województwo świętokrzyskie COA.svg',
  'warminsko-mazurskie': 'POL województwo warmińsko-mazurskie COA.svg',
  wielkopolskie: 'POL województwo wielkopolskie COA.svg',
  zachodniopomorskie: 'POL województwo zachodniopomorskie COA.svg',
}

mkdirSync(outDir, { recursive: true })

function fetchEmblems() {
  const titles = Object.values(TITLES).map(t => `File:${t}`).join('|')
  const args = [
    '-sG', 'https://commons.wikimedia.org/w/api.php',
    '-A', USER_AGENT,
    '--data-urlencode', 'action=query',
    '--data-urlencode', `titles=${titles}`,
    '--data-urlencode', 'prop=imageinfo',
    '--data-urlencode', 'iiprop=url',
    '--data-urlencode', 'format=json',
  ]
  const json = execFileSync('curl', args, { encoding: 'utf8' })
  const data = JSON.parse(json)
  const byTitle = Object.fromEntries(
    Object.entries(TITLES).map(([id, title]) => [title, id]),
  )

  for (const page of Object.values(data.query?.pages ?? {})) {
    if ('missing' in page) {
      console.warn(`[BASTION] Brak herbu: ${page.title}`)
      continue
    }
    const fileTitle = (page.title ?? '').replace(/^File:/, '')
    const id = byTitle[fileTitle]
    if (!id) continue

    const outPath = path.join(outDir, `${id}.svg`)
    if (existsSync(outPath)) {
      console.log(`[BASTION] ${id}.svg — już istnieje, pomijam`)
      continue
    }

    const url = page.imageinfo?.[0]?.url
    if (!url) {
      console.warn(`[BASTION] Brak URL dla ${id}`)
      continue
    }

    execFileSync('curl', ['-fsSL', '-A', USER_AGENT, url, '-o', outPath], { stdio: 'inherit' })
    console.log(`[BASTION] ${id}.svg <= ${fileTitle}`)
  }
}

fetchEmblems()
writeFileSync(path.join(outDir, '.gitkeep'), '')
console.log('[BASTION] Herby województw zaktualizowane.')
