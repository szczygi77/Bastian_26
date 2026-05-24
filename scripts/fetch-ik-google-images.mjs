#!/usr/bin/env node
/**
 * Pobiera zdjęcia Google Maps dla wszystkich obiektów IK na mapie.
 * Wymaga VITE_GOOGLE_MAPS_API_KEY w .env (Places + Street View + Static Maps).
 *
 *   npm run media:fetch-google
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { IK_MEDIA_TARGETS } from './ik-media-targets.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'media', 'ik')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const vars = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    vars[key] = val
  }
  return vars
}

function streetViewUrl(key, lat, lng, heading = 0) {
  const params = new URLSearchParams({
    size: '960x540',
    location: `${lat},${lng}`,
    fov: '80',
    heading: String(heading),
    pitch: '5',
    key,
  })
  return `https://maps.googleapis.com/maps/api/streetview?${params}`
}

function satelliteUrl(key, lat, lng) {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '17',
    size: '960x540',
    maptype: 'satellite',
    key,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`
}

async function hasStreetView(key, lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) return false
  const data = await res.json()
  return data.status === 'OK'
}

async function fetchPlacePhoto(key, query, lat, lng) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.photos',
    },
    body: JSON.stringify({
      textQuery: `${query}, Stalowa Wola, Polska`,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 900,
        },
      },
      maxResultCount: 1,
    }),
  })
  if (!res.ok) return null

  const data = await res.json()
  const place = data.places?.[0]
  const photoName = place?.photos?.[0]?.name
  if (!photoName) return null

  const photoParams = new URLSearchParams({
    maxHeightPx: '540',
    maxWidthPx: '960',
    key,
  })

  return {
    url: `https://places.googleapis.com/v1/${photoName}/media?${photoParams}`,
    source: 'google_places',
    attribution: `Google Maps · ${place.displayName?.text ?? query}`,
  }
}

async function resolveImageUrl(key, target) {
  const { lat, lng, query, name } = target

  const place = await fetchPlacePhoto(key, query, lat, lng)
  if (place) return place

  if (await hasStreetView(key, lat, lng)) {
    return {
      url: streetViewUrl(key, lat, lng, 0),
      source: 'streetview',
      attribution: 'Google Street View',
    }
  }

  return {
    url: satelliteUrl(key, lat, lng),
    source: 'google_satellite',
    attribution: 'Google Maps (satelita)',
  }
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} dla ${url}`)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('image')) {
    throw new Error(`Odpowiedź nie jest obrazem (${contentType})`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1024) throw new Error('Plik zbyt mały — prawdopodobnie błąd API')
  fs.writeFileSync(destPath, buf)
}

async function main() {
  const env = loadEnvFile(path.join(ROOT, '.env'))
  const key = env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) {
    console.error('[BASTION] Brak VITE_GOOGLE_MAPS_API_KEY w pliku .env')
    console.error('        Skopiuj .env.example → .env i uzupełnij klucz Google Maps.')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const manifest = {}
  let ok = 0
  let fail = 0

  for (const target of IK_MEDIA_TARGETS) {
    const fileName = `${target.id}.jpg`
    const destPath = path.join(OUT_DIR, fileName)
    process.stdout.write(`[${target.id}] ${target.shortName ?? target.name} … `)

    try {
      const resolved = await resolveImageUrl(key, target)
      await downloadToFile(resolved.url, destPath)
      manifest[target.id] = {
        file: fileName,
        source: resolved.source,
        attribution: resolved.attribution,
      }
      console.log(`OK (${resolved.source})`)
      ok++
    } catch (err) {
      console.log(`BŁĄD: ${err.message}`)
      fail++
    }

    await new Promise(r => setTimeout(r, 350))
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), items: manifest }, null, 2),
  )

  console.log('')
  console.log(`[BASTION] Gotowe: ${ok} zdjęć, ${fail} błędów → public/media/ik/`)
  if (fail > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
