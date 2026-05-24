import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureNodeVersion } from './ensure-node.mjs'

ensureNodeVersion()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const root = path.join(__dirname, '..')

const require = createRequire(import.meta.url)

export const isWindows = process.platform === 'win32'
export const isMacOS = process.platform === 'darwin'
export const isLinux = process.platform === 'linux'

/** Ścieżka do binarki Electron (macOS / Windows / Linux). */
export function resolveElectronExecutable() {
  return require('electron')
}

/** Uruchamia lokalny bin z node_modules/.bin (obsługa .cmd na Windows). */
export function localBin(name) {
  const base = path.join(root, 'node_modules', '.bin', name)
  return isWindows ? `${base}.cmd` : base
}

/** Natywny bin esbuild. */
export function resolveEsbuildExecutable() {
  const base = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild')
  return isWindows ? `${base}.exe` : base
}

/** Vite jako skrypt Node — działa identycznie na każdym OS. */
export function resolveViteScript() {
  return path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
}

export function npmRun(args, env = {}) {
  const npm = isWindows ? 'npm.cmd' : 'npm'
  return { command: npm, args: ['run', ...args], env: { ...process.env, ...env } }
}
