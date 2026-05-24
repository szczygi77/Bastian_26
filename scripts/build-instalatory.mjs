#!/usr/bin/env node
/**
 * Buduje instalatory Electron i kopiuje je do INSTALATORY/{macos,windows,linux}.
 * Uruchom na docelowym OS albo z pełnym toolchain (electron-builder cross-compile).
 */
import { spawnSync } from 'child_process'
import {
  copyFileSync,
  cpSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { createHash } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { isMacOS, isWindows, isLinux, root } from './platform.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const instalatoryRoot = path.join(root, 'INSTALATORY')
const releaseDir = path.join(root, 'release')

const npm = isWindows ? 'npm.cmd' : 'npm'
const npx = isWindows ? 'npx.cmd' : 'npx'

function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function ensureIcons() {
  const iconPng = path.join(root, 'public', 'icon.png')
  if (existsSync(iconPng)) return
  console.log('[BASTION] Brak icon.png — generuję ikony...')
  run('node', ['scripts/generate-app-icon.mjs'])
}

function buildTargets() {
  const args = ['electron-builder', '--publish', 'never']
  if (process.argv.includes('--copy-only')) {
    return null
  }
  if (process.argv.includes('--all') || process.argv.includes('--mac') || process.argv.includes('--win') || process.argv.includes('--linux')) {
    if (process.argv.includes('--all') || (!process.argv.includes('--mac') && !process.argv.includes('--win') && !process.argv.includes('--linux'))) {
      args.push('--mac', '--win', '--linux')
    } else {
      if (process.argv.includes('--mac')) args.push('--mac')
      if (process.argv.includes('--win')) args.push('--win')
      if (process.argv.includes('--linux')) args.push('--linux')
    }
  } else if (isMacOS) {
    args.push('--mac', '--win', '--linux')
  } else if (isWindows) {
    args.push('--win')
  } else if (isLinux) {
    args.push('--linux')
  } else {
    args.push('--mac', '--win', '--linux')
  }
  return args
}

function isArtifact(name) {
  return /\.(dmg|exe|AppImage|deb|rpm|blockmap|zip)$/i.test(name)
}

function shouldSkipWindowsArtifact(name) {
  const lower = name.toLowerCase()
  if (!lower.endsWith('.exe')) return false
  // Uniwersalne NSIS (x64+arm64 w jednym pliku) — zostawiamy wersje z arch w nazwie.
  return /-win\.exe$/i.test(name) && !/-win-(x64|arm64|ia32)\.exe$/i.test(name)
}

function classifyArtifact(name) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.dmg')) return 'macos'
  if (lower.endsWith('.exe')) return 'windows'
  if (lower.endsWith('.zip') && lower.includes('win')) return 'windows'
  if (lower.endsWith('.appimage') || lower.endsWith('.deb') || lower.endsWith('.rpm')) return 'linux'
  return null
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(filePath)
      .on('data', chunk => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

async function ensureWindowsPortableZip() {
  const version = JSON.parse(readPackageVersion()).version
  const portableName = `BASTION-${version}-win-x64-portable.zip`
  const dest = path.join(instalatoryRoot, 'windows', portableName)
  const unpacked = path.join(releaseDir, 'win-unpacked')
  if (existsSync(dest) && statSync(dest).size > 50 * 1024 * 1024) return null
  if (!existsSync(path.join(unpacked, 'BASTION.exe'))) return null

  console.log('[BASTION] Pakuję portable ZIP z release/win-unpacked …')
  rmSync(dest, { force: true })
  const zipResult = spawnSync('zip', ['-r', '-q', dest, '.'], {
    cwd: unpacked,
    stdio: 'inherit',
  })
  if (zipResult.status !== 0) {
    console.warn('[BASTION] Nie udało się utworzyć portable ZIP (brak zip?)')
    return null
  }
  return { platform: 'windows', name: portableName }
}

function clearDir(dir) {
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.')) continue
      if (/^README\.md$/i.test(entry)) continue
      if (/^INSTALUJ\.(bat|command|sh)$/i.test(entry)) continue
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) rmSync(full, { recursive: true, force: true })
      else rmSync(full)
    }
  } else {
    mkdirSync(dir, { recursive: true })
  }
}

function copyArtifacts() {
  const dirs = {
    macos: path.join(instalatoryRoot, 'macos'),
    windows: path.join(instalatoryRoot, 'windows'),
    linux: path.join(instalatoryRoot, 'linux'),
  }
  for (const dir of Object.values(dirs)) clearDir(dir)

  if (!existsSync(releaseDir)) {
    console.warn('[BASTION] Brak katalogu release/ — nic do skopiowania.')
    return { copied: [], missing: ['macos', 'windows', 'linux'] }
  }

  const copied = []
  const foundPlatforms = new Set()

  for (const name of readdirSync(releaseDir)) {
    if (!isArtifact(name)) continue
    if (name.endsWith('.blockmap')) continue
    if (shouldSkipWindowsArtifact(name)) continue
    const src = path.join(releaseDir, name)
    const size = statSync(src).size
    if (size < 1024 * 1024) {
      console.warn(`[BASTION] Pomijam uszkodzony artefakt (${size} B): ${name}`)
      continue
    }
    const platform = classifyArtifact(name)
    if (!platform) continue
    const dest = path.join(dirs[platform], name)
    copyFileSync(src, dest)
    copied.push({ platform, name, sizeBytes: size })
    foundPlatforms.add(platform)
    console.log(`[BASTION] → INSTALATORY/${platform}/${name}`)
  }

  return { copied, missing: ['macos', 'windows', 'linux'].filter(p => !foundPlatforms.has(p)) }
}

async function enrichManifest(copied, missing) {
  const artifacts = []
  for (const item of copied) {
    const filePath = path.join(instalatoryRoot, item.platform, item.name)
    const sizeBytes = statSync(filePath).size
    const sha256 = await sha256File(filePath)
    artifacts.push({ ...item, sizeBytes, sha256 })
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    version: JSON.parse(readPackageVersion()).version,
    buildHost: `${process.platform}-${process.arch}`,
    artifacts,
    missingPlatforms: missing,
    windowsNotes: {
      requiredOs: 'Windows 10/11 64-bit (Intel/AMD) lub Windows 11 ARM64',
      lfsWarning: 'Plik .exe musi mieć ~125 MB. Jeśli ma ~130 B — pobierz przez git lfs pull lub GitLab → Download raw.',
      portableFallback: 'BASTION-*-win-x64-portable.zip — rozpakuj i uruchom BASTION.exe bez instalatora',
    },
  }
  writeFileSync(
    path.join(instalatoryRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
}

function readPackageVersion() {
  return readFileSync(path.join(root, 'package.json'), 'utf8')
}

console.log('[BASTION] === Budowa instalatorów → INSTALATORY/ ===')
ensureIcons()

const copyOnly = process.argv.includes('--copy-only')
if (!copyOnly) {
  console.log('[BASTION] Kompilacja renderera (ELECTRON=true)...')
  run(npm, ['run', 'build'], { ELECTRON: 'true' })

  const ebArgs = buildTargets()
  if (ebArgs) {
    console.log('[BASTION] Pakowanie:', ebArgs.join(' '))
    run(npx, ebArgs)
  }
} else {
  console.log('[BASTION] Tryb --copy-only (bez przebudowy)')
}

mkdirSync(instalatoryRoot, { recursive: true })
let { copied, missing } = copyArtifacts()

const portable = await ensureWindowsPortableZip()
if (portable && !copied.some(c => c.name === portable.name)) {
  copied.push({ ...portable, sizeBytes: statSync(path.join(instalatoryRoot, 'windows', portable.name)).size })
  missing = missing.filter(p => p !== 'windows')
  console.log(`[BASTION] → INSTALATORY/windows/${portable.name}`)
}

await enrichManifest(copied, missing)

if (missing.length > 0) {
  console.log('\n[BASTION] Uwaga: brak artefaktów dla:', missing.join(', '))
  console.log('  macOS:   npm run instalatory:build')
  console.log('  Windows: npm run instalatory:build  (na Windows)')
  console.log('  Linux:   npm run instalatory:build  (na Linux/Fedora)')
  console.log('  Wszystkie: npm run instalatory:build -- --all  (wymaga toolchain cross-compile)\n')
}

console.log('[BASTION] Gotowe. Zobacz INSTALATORY/README.md')
process.exit(0)
