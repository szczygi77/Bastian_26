import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(async ({ command }) => {
  const isElectron = process.env.ELECTRON === 'true'

  const electronPlugins = isElectron
    ? await Promise.all([
        import('vite-plugin-electron').then(m => m.default([
          {
            entry: 'electron/main.ts',
            vite: { build: { outDir: 'dist-electron', sourcemap: command === 'serve' } },
          },
          {
            entry: 'electron/preload.ts',
            onstart: (options: { reload: () => void }) => options.reload(),
            vite: { build: { outDir: 'dist-electron', sourcemap: command === 'serve' } },
          },
        ])),
        import('vite-plugin-electron-renderer').then(m => m.default()),
      ])
    : []

  return {
    plugins: [react(), tailwindcss(), ...electronPlugins],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { port: 3000 },
  }
})
