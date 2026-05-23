import { useEffect, useState } from 'react'

export const MAC_TITLEBAR_HEIGHT = 40
export const MAC_CHROME_HEADER_HEIGHT = 72

export function useElectronShell() {
  const [isMacOS, setIsMacOS] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('electron-macos'),
  )

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    document.documentElement.classList.add('electron')
    void api.getPlatform().then(platform => {
      if (platform === 'darwin') {
        document.documentElement.classList.add('electron-macos')
        setIsMacOS(true)
      }
    })
  }, [])

  return {
    isElectron: typeof window !== 'undefined' && !!window.electronAPI,
    isMacOS,
    titlebarHeight: isMacOS ? MAC_TITLEBAR_HEIGHT : 0,
    chromeHeaderHeight: isMacOS ? MAC_CHROME_HEADER_HEIGHT : 48,
    sidebarCollapsedWidth: isMacOS ? 72 : 64,
  }
}
