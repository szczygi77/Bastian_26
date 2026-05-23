import { spawn, execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// 1. Build electron main with esbuild binary
console.log('[BASTION] Building Electron main...')
try {
  execFileSync(
    path.join(root, 'node_modules', '.bin', 'esbuild'),
    [
      'electron/main.ts', 'electron/preload.ts',
      '--bundle=false', '--platform=node', '--target=node20',
      '--outdir=dist-electron', '--format=esm',
    ],
    { cwd: root, stdio: 'inherit' }
  )
} catch (e) {
  console.error('[BASTION] esbuild failed:', e.message)
  process.exit(1)
}

console.log('[BASTION] Electron main built OK.')

// 2. Start Vite dev server
console.log('[BASTION] Starting Vite dev server...')
const vite = spawn(path.join(root, 'node_modules', '.bin', 'vite'), [], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
})

// 3. Wait 4s for Vite to be ready, then launch Electron
setTimeout(() => {
  console.log('[BASTION] Launching Electron...')
  const electron = spawn(
    path.join(root, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron'),
    ['.'],
    {
      cwd: root, stdio: 'inherit',
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:3000',
        NODE_ENV: 'development',
        ELECTRON_OVERRIDE_APP_NAME: 'BASTION',
      }
    }
  )

  electron.on('close', () => {
    vite.kill()
    process.exit(0)
  })
}, 4000)
