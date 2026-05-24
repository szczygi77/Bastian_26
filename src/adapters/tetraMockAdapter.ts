export interface TetraChannel {
  id: number
  name: string
  status: 'active' | 'busy' | 'offline'
}

export interface TetraLinkStatus {
  status: 'connected' | 'degraded' | 'offline'
  lastHeartbeat: Date
  activeChannels: number
  encryption: string
  channels: TetraChannel[]
  isMock: boolean
}

export interface TetraBroadcastResult {
  success: boolean
  ackId: string
  ackAt: Date
  channelId: number
  mock: true
  simulationLabel: string
}

const CHANNELS: TetraChannel[] = [
  { id: 1, name: 'CMD — Dowództwo', status: 'active' },
  { id: 2, name: 'PSP — Straż Pożarna', status: 'active' },
  { id: 3, name: 'POL — Policja', status: 'active' },
  { id: 4, name: 'MED — Ratownictwo', status: 'busy' },
  { id: 5, name: 'RCB — Koordynacja', status: 'active' },
  { id: 6, name: 'MON — Wojsko', status: 'offline' },
  { id: 7, name: 'TECH — Serwis IK', status: 'active' },
  { id: 8, name: 'LOG — Logistyka', status: 'active' },
  { id: 9, name: 'RES — Rezerwa', status: 'active' },
]

export function getTetraLinkStatus(online: boolean, simulationMode = false): TetraLinkStatus {
  if (!online) {
    return {
      status: 'offline',
      lastHeartbeat: new Date(Date.now() - 120_000),
      activeChannels: 0,
      encryption: 'AES-256 (TETRA E2E)',
      channels: CHANNELS.map(ch => ({ ...ch, status: 'offline' as const })),
      isMock: true,
    }
  }

  const active = CHANNELS.filter(ch => ch.status !== 'offline').length
  return {
    status: simulationMode ? 'degraded' : active >= 7 ? 'connected' : 'degraded',
    lastHeartbeat: new Date(Date.now() - 8000),
    activeChannels: active,
    encryption: 'AES-256 (TETRA E2E)',
    channels: CHANNELS,
    isMock: true,
  }
}

/** Symulowany broadcast TETRA — opóźnienie ACK ~2s, zawsze oznaczony jako MOCK / ćwiczenie */
export async function broadcastTetraAlert(
  message: string,
  channelId = 1,
): Promise<TetraBroadcastResult> {
  await new Promise(resolve => setTimeout(resolve, 2000))
  const channel = CHANNELS.find(ch => ch.id === channelId)
  if (!channel || channel.status === 'offline') {
    return {
      success: false,
      ackId: '',
      ackAt: new Date(),
      channelId,
      mock: true,
      simulationLabel: 'TETRA MOCK · ćwiczenie',
    }
  }
  return {
    success: true,
    ackId: `TETRA-MOCK-CH${channelId}-${Date.now().toString(36).toUpperCase()}`,
    ackAt: new Date(),
    channelId,
    mock: true,
    simulationLabel: 'TETRA MOCK · ćwiczenie',
  }
}
