import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// 1. Build electron main
console.log('[BASTION] Building Electron main...')
const build = spawn(
  'node', ['node_modules/.bin/esbuild',
    'electron/main.ts', 'electron/preload.ts',
    '--bundle=false', '--platform=node', '--target=node20',
    '--outdir=dist-electron', '--format=esm'],
  { cwd: root, stdio: 'inherit' }
)

build.on('close', () => {
  // 2. Start Vite
  console.log('[BASTION] Starting Vite dev server...')
  const vite = spawn('node', ['node_modules/.bin/vite'], {
    cwd: root, stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  })

  // 3. Wait ~3s then launch Electron
  setTimeout(() => {
    console.log('[BASTION] Launching Electron...')
    const electron = spawn(
      'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
      ['.'],
      {
        cwd: root, stdio: 'inherit',
        env: {
          ...process.env,
          VITE_DEV_SERVER_URL: 'http://localhost:3000',
          NODE_ENV: 'development',
        }
      }
    )

    electron.on('close', () => {
      vite.kill()
      process.exit(0)
    })
  }, 3000)
})
