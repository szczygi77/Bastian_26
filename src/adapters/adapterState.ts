export type AdapterFetchMode =
  | 'live'
  | 'cached'
  | 'missing_key'
  | 'error'
  | 'empty'
  | 'mock'

export interface AdapterState {
  fetchMode: AdapterFetchMode
  lastError?: string
}
