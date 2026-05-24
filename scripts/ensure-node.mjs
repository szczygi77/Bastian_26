import { pathToFileURL } from 'url'

const MIN_NODE = '20.19.0'
const RECOMMENDED_NODE = '22'

function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = String(version).replace(/^v/, '').split('.').map(Number)
  return { major, minor, patch }
}

export function isNodeVersionSupported(version = process.versions.node) {
  const { major, minor } = parseVersion(version)
  if (major >= 23) return true
  if (major === 22) return minor >= 12
  if (major === 20) return minor >= 19
  return false
}

export function ensureNodeVersion() {
  if (isNodeVersionSupported()) return

  const current = process.versions.node
  console.error('')
  console.error('[BASTION] Wymagany Node.js 20.19+ lub 22.12+ (Vite 8).')
  console.error(`[BASTION] Aktywna wersja: v${current}`)
  console.error('')
  console.error('  nvm install 22 && nvm use')
  console.error('  # albo: fnm use / volta install node@22')
  console.error('')
  console.error(`Minimalna wersja: v${MIN_NODE}, zalecana: v${RECOMMENDED_NODE}`)
  console.error('')
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureNodeVersion()
}
