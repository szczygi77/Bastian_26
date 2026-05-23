/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CDSE_CLIENT_ID?: string
  readonly VITE_CDSE_CLIENT_SECRET?: string
  readonly VITE_FIRMS_API_KEY?: string
  readonly VITE_OPENSKY_BEARER_TOKEN?: string
  readonly VITE_OPENSKY_USERNAME?: string
  readonly VITE_OPENSKY_PASSWORD?: string
  readonly VITE_OPENAI_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
