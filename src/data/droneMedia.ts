import type { MissionType } from '@/types'

const FEED_IMAGES: Record<MissionType, { rgb: string; thermal: string }> = {
  reconnaissance: {
    rgb: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=960&h=540&fit=crop&q=80',
    thermal: 'https://images.unsplash.com/photo-1513828583688-c52646db1d51?w=960&h=540&fit=crop&q=80',
  },
  thermal_inspection: {
    rgb: 'https://images.unsplash.com/photo-1504917593497-41f8037c4f70?w=960&h=540&fit=crop&q=80',
    thermal: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=960&h=540&fit=crop&q=80',
  },
  perimeter_monitoring: {
    rgb: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=960&h=540&fit=crop&q=80',
    thermal: 'https://images.unsplash.com/photo-1513828583688-c52646db1d51?w=960&h=540&fit=crop&q=80',
  },
  communication_relay: {
    rgb: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=960&h=540&fit=crop&q=80',
    thermal: 'https://images.unsplash.com/photo-1513828583688-c52646db1d51?w=960&h=540&fit=crop&q=80',
  },
  fire_assessment: {
    rgb: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=960&h=540&fit=crop&q=80',
    thermal: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=960&h=540&fit=crop&q=80',
  },
  medical_delivery: {
    rgb: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=960&h=540&fit=crop&q=80',
    thermal: 'https://images.unsplash.com/photo-1513828583688-c52646db1d51?w=960&h=540&fit=crop&q=80',
  },
}

export function getDroneFeedImage(missionType: MissionType, mode: 'rgb' | 'thermal' = 'rgb'): string {
  return FEED_IMAGES[missionType][mode]
}

export function feedModeForMission(missionType: MissionType): 'rgb' | 'thermal' {
  return missionType === 'thermal_inspection' || missionType === 'fire_assessment' ? 'thermal' : 'rgb'
}
