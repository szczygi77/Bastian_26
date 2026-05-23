export interface MAVLinkAdapter {
  connect(droneId: string): Promise<boolean>
  sendCommand(droneId: string, command: string, params: Record<string, unknown>): Promise<boolean>
  getStatus(droneId: string): Promise<{ battery: number; coordinates: [number, number]; altitude: number }>
  disconnect(droneId: string): Promise<void>
}

export const mavlinkMockAdapter: MAVLinkAdapter = {
  async connect(droneId: string) {
    await new Promise(r => setTimeout(r, 500))
    console.log(`[MAVLink MOCK] Connected to drone ${droneId}`)
    return true
  },
  async sendCommand(droneId: string, command: string, params: Record<string, unknown>) {
    await new Promise(r => setTimeout(r, 300))
    console.log(`[MAVLink MOCK] Command ${command} sent to ${droneId}`, params)
    return true
  },
  async getStatus(droneId: string) {
    await new Promise(r => setTimeout(r, 200))
    return {
      battery: 85,
      coordinates: [50.58 + Math.random() * 0.02, 22.03 + Math.random() * 0.02] as [number, number],
      altitude: 50 + Math.random() * 150,
    }
  },
  async disconnect(droneId: string) {
    console.log(`[MAVLink MOCK] Disconnected from ${droneId}`)
  },
}
