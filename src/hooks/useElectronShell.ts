import { useEffect, useState } from 'react'

export const MAC_TITLEBAR_HEIGHT = 44
export const TOPBAR_HEIGHT = 55
export const SIDEBAR_BRAND_HEIGHT = 80

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
    topbarHeight: TOPBAR_HEIGHT,
    sidebarBrandHeight: SIDEBAR_BRAND_HEIGHT,
    /** @deprecated use topbarHeight / sidebarBrandHeight */
    chromeHeaderHeight: TOPBAR_HEIGHT,
    sidebarCollapsedWidth: isMacOS ? 80 : 72,
  }
}
