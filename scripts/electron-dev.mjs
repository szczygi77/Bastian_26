import { spawn, execFileSync } from 'child_process'
import waitOn from 'wait-on'
import {
  isWindows,
  resolveElectronExecutable,
  resolveEsbuildExecutable,
  resolveViteScript,
  root,
} from './platform.mjs'

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:3000'
const DEV_SERVER_HOST = new URL(DEV_SERVER_URL).host

function buildElectronMain() {
  console.log('[BASTION] Building Electron main...')
  try {
    execFileSync(
      resolveEsbuildExecutable(),
      [
        'electron/main.ts',
        'electron/preload.ts',
        '--bundle=false',
        '--platform=node',
        '--target=node20',
        '--outdir=dist-electron',
        '--format=esm',
      ],
      { cwd: root, stdio: 'inherit' },
    )
  } catch (error) {
    console.error('[BASTION] esbuild failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
  console.log('[BASTION] Electron main built OK.')
}

function startVite() {
  console.log('[BASTION] Starting Vite dev server...')
  return spawn(process.execPath, [resolveViteScript()], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
    shell: false,
  })
}

function startElectron() {
  console.log('[BASTION] Launching Electron...')
  const electronPath = resolveElectronExecutable()
  const electronEnv = {
    ...process.env,
    VITE_DEV_SERVER_URL: DEV_SERVER_URL,
    NODE_ENV: 'development',
    ELECTRON_OVERRIDE_APP_NAME: 'BASTION',
  }

  return spawn(electronPath, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: electronEnv,
    shell: false,
  })
}

function killProcess(child, label) {
  if (!child || child.killed) return
  try {
    if (isWindows) {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore', shell: true })
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    console.warn(`[BASTION] Could not stop ${label}`)
  }
}

async function main() {
  buildElectronMain()

  const vite = startVite()
  let electron = null
  let shuttingDown = false

  const shutdown = (code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    killProcess(electron, 'Electron')
    killProcess(vite, 'Vite')
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  vite.on('error', error => {
    console.error('[BASTION] Vite failed:', error)
    shutdown(1)
  })

  vite.on('exit', code => {
    if (!shuttingDown) {
      console.log(`[BASTION] Vite exited (${code ?? 0})`)
      shutdown(code ?? 0)
    }
  })

  try {
    await waitOn({
      resources: [`http-get://${DEV_SERVER_HOST}`],
      timeout: 90_000,
      interval: 250,
      window: 1000,
    })
  } catch (error) {
    console.error('[BASTION] Vite dev server did not start in time:', error)
    shutdown(1)
    return
  }

  electron = startElectron()

  electron.on('close', code => {
    console.log(`[BASTION] Electron closed (${code ?? 0})`)
    shutdown(code ?? 0)
  })

  electron.on('error', error => {
    console.error('[BASTION] Electron failed:', error)
    shutdown(1)
  })
}

main().catch(error => {
  console.error('[BASTION] Dev launcher failed:', error)
  process.exit(1)
})
