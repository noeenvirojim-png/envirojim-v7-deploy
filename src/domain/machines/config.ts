/**
 * Machine Configuration
 * Semi-generic machine definitions with subsystem keywords for diagnosis
 */

export interface MachineConfig {
  slug: string
  name: string
  subsystemMap: Record<string, string[]>
  defaultProblemSubsystems: string[]
}

export const MACHINE_CONFIGS: Record<string, MachineConfig> = {
  VB750: {
    slug: 'VB750',
    name: 'VB750',
    subsystemMap: {
      'Motor overheating': ['Cooling', 'Drivetrain'],
      'Shredding unit not cutting': ['Drivetrain', 'Hydraulics'],
      'Control system not responding': ['Electrical'],
      'Hydraulic pressure loss': ['Hydraulics'],
    },
    defaultProblemSubsystems: ['Drivetrain', 'Hydraulics'],
  },
  VC500: {
    slug: 'VC500',
    name: 'VC500 Shredder',
    subsystemMap: {
      'Conveyor jammed': ['Drivetrain', 'Hydraulics'],
      'Blade wear detected': ['Drivetrain'],
      'Control panel offline': ['Electrical'],
      'Pressure drop': ['Hydraulics'],
    },
    defaultProblemSubsystems: ['Drivetrain', 'Hydraulics'],
  },
  HA250: {
    slug: 'HA250',
    name: 'HA250 Hammer Mill',
    subsystemMap: {
      'Feed not advancing': ['Drivetrain'],
      'Vibration excessive': ['Chassis'],
      'Temperature high': ['Cooling'],
    },
    defaultProblemSubsystems: ['Drivetrain'],
  },
  PT100: {
    slug: 'PT100',
    name: 'PT100 Compressor',
    subsystemMap: {
      'Low pressure output': ['Hydraulics', 'Drivetrain'],
      'Excessive heat': ['Cooling'],
      'Motor noise': ['Drivetrain'],
    },
    defaultProblemSubsystems: ['Drivetrain'],
  },
}

export function getMachineConfig(machineSlug: string): MachineConfig {
  return MACHINE_CONFIGS[machineSlug] || {
    slug: machineSlug,
    name: machineSlug,
    subsystemMap: {},
    defaultProblemSubsystems: ['Drivetrain', 'Hydraulics'],
  }
}
