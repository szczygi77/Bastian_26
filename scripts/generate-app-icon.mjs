#!/usr/bin/env node
/**
 * Generuje kwadratową icon.png (1024×1024) i icon.icns dla macOS.
 * Źródło: public/logoBezTekstuIkona-removebg-preview.png
 */
import { execFileSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const src = path.join(publicDir, 'logoBezTekstuIkona-removebg-preview.png')
const iconPng = path.join(publicDir, 'icon.png')
const iconIcns = path.join(publicDir, 'icon.icns')
const iconset = path.join(root, 'build', 'icon.iconset')

const py = `
from PIL import Image
from pathlib import Path
src = Path(${JSON.stringify(src)})
out = Path(${JSON.stringify(iconPng)})
logo = Image.open(src).convert('RGBA')
size = 1024
canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
max_dim = int(size * 0.94)
logo.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
x = (size - logo.width) // 2
y = (size - logo.height) // 2
canvas.paste(logo, (x, y), logo)
canvas.save(out)
print(out)
`

execFileSync('python3', ['-c', py], { stdio: 'inherit' })

rmSync(iconset, { recursive: true, force: true })
mkdirSync(iconset, { recursive: true })

const sizes = [
  [16, 'icon_16x16.png'],
  [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],
  [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],
  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],
  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],
  [1024, 'icon_512x512@2x.png'],
]

for (const [dim, name] of sizes) {
  execFileSync('sips', ['-z', String(dim), String(dim), iconPng, '--out', path.join(iconset, name)], {
    stdio: 'ignore',
  })
}

execFileSync('iconutil', ['-c', 'icns', iconset, '-o', iconIcns], { stdio: 'inherit' })
console.log('[BASTION] Generated', iconPng, 'and', iconIcns)
