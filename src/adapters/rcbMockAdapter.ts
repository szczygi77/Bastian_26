export interface RCBLink {
  status: 'connected' | 'degraded' | 'offline'
  lastHeartbeat: Date
  reportQueueLength: number
  encryptionLevel: string
}

export function getRCBLinkStatus(): RCBLink {
  return {
    status: 'connected',
    lastHeartbeat: new Date(Date.now() - 30000),
    reportQueueLength: 0,
    encryptionLevel: 'AES-256 / TLS 1.3 (PIONIER)',
  }
}

export async function sendIncidentReport(reportJson: string): Promise<{ success: boolean; ackId: string }> {
  await new Promise(r => setTimeout(r, 800))
  return {
    success: true,
    ackId: `RCB-${Date.now().toString(36).toUpperCase()}`,
  }
}
