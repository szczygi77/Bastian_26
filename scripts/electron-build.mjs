import { spawnSync } from 'child_process'
import { isWindows, root } from './platform.mjs'

const npm = isWindows ? 'npm.cmd' : 'npm'
const npx = isWindows ? 'npx.cmd' : 'npx'

console.log('[BASTION] Building renderer (ELECTRON=true)...')
const build = spawnSync(npm, ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ELECTRON: 'true' },
  shell: isWindows,
})

if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

console.log('[BASTION] Packaging with electron-builder...')
const pack = spawnSync(npx, ['electron-builder'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWindows,
})

process.exit(pack.status ?? 0)
