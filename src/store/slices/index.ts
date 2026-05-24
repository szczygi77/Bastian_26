/**
 * Store domain slices — selectors grouped by operational concern.
 * State/actions remain in useAppStore; shallow selectors limit rerenders per screen.
 */
export {
  useIncidentState,
  useGraphState,
  usePublicDataState,
  useOperationalState,
  useUiState,
  useAuditState,
  useSkyMarshalState,
  useSystemState,
  selectActiveIncident,
} from '@/store/selectors'

export type { AppState } from '@/store/types'
