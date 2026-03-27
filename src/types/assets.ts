import { Machine, Site } from './schema';

export type { Machine, Site };

export interface AssetHealth {
  machine_id: string;
  status: 'healthy' | 'warning' | 'critical';
  last_check: string;
  next_maintenance: string;
}

export interface AssetLocation {
  id: string;
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}
