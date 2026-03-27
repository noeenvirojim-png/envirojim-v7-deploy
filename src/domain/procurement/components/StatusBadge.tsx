import React from 'react';
import { Badge } from '@/components/ui/badge';

export type PartOrderStatus = 'ORDERED' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED';

interface StatusBadgeProps {
  status: PartOrderStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variants: Record<PartOrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
    ORDERED: 'secondary',
    SHIPPED: 'default',
    IN_TRANSIT: 'default', // Or a custom orange if available
    DELIVERED: 'outline', // success equivalent
  };

  const labels: Record<PartOrderStatus, string> = {
    ORDERED: 'Commandé',
    SHIPPED: 'Expédié',
    IN_TRANSIT: 'En Transit',
    DELIVERED: 'Livré',
  };

  return (
    <Badge variant={variants[status]}>
      {labels[status]}
    </Badge>
  );
};
