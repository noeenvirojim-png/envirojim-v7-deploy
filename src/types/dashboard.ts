import { Organization, Site, Machine } from './schema';

export type { Organization, Site, Machine };

export interface DashboardAlerts {
  criticalTickets: number;
  machineWarnings: number;
  overdueMaintenance: number;
}

export interface DashboardMetrics {
  activeMachines: number;
  openTickets: number;
  pendingWorkOrders: number;
  partsAwaitingApproval: number;
  clientCount: number;
  dealerCount: number;
  inventoryCount: number;
  alerts: DashboardAlerts;
}

export interface DashboardViewProps {
  metrics: DashboardMetrics;
}
