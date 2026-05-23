export interface ElectronAPI {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
