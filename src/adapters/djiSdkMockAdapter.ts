export interface DJISDKAdapter {
  initialize(droneId: string): Promise<boolean>
  takeoff(droneId: string): Promise<boolean>
  goTo(droneId: string, lat: number, lon: number, altitude: number): Promise<boolean>
  startMission(droneId: string, missionType: string): Promise<boolean>
  returnToBase(droneId: string): Promise<boolean>
}

export const djiSdkMockAdapter: DJISDKAdapter = {
  async initialize(droneId) {
    await new Promise(r => setTimeout(r, 600))
    console.log(`[DJI SDK MOCK] Initialized ${droneId}`)
    return true
  },
  async takeoff(droneId) {
    await new Promise(r => setTimeout(r, 1200))
    console.log(`[DJI SDK MOCK] Takeoff ${droneId}`)
    return true
  },
  async goTo(droneId, lat, lon, altitude) {
    await new Promise(r => setTimeout(r, 400))
    console.log(`[DJI SDK MOCK] ${droneId} → [${lat.toFixed(4)}, ${lon.toFixed(4)}] alt=${altitude}m`)
    return true
  },
  async startMission(droneId, missionType) {
    await new Promise(r => setTimeout(r, 800))
    console.log(`[DJI SDK MOCK] Mission "${missionType}" started on ${droneId}`)
    return true
  },
  async returnToBase(droneId) {
    await new Promise(r => setTimeout(r, 600))
    console.log(`[DJI SDK MOCK] ${droneId} returning to base`)
    return true
  },
}
