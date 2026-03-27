import { getPartsOrders } from '../actions/parts_orders';
import { StatusBadge } from './StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';

export default async function PartsOrderTable() {
  const orders = await getPartsOrders();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pièce</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Date Commande</TableHead>
            <TableHead>Arrivée Prévue</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Tracking</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.part?.name || order.part_name_override}
                <div className="text-xs text-muted-foreground">{order.part?.part_number}</div>
              </TableCell>
              <TableCell>{order.supplier_name}</TableCell>
              <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
              <TableCell>{order.expected_arrival ? new Date(order.expected_arrival).toLocaleDateString() : 'TBD'}</TableCell>
              <TableCell>
                <StatusBadge status={order.status as any} />
              </TableCell>
              <TableCell>
                {order.tracking_url ? (
                  <a 
                    href={order.tracking_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {order.tracking_number || 'Lien'}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">{order.tracking_number || '-'}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {orders?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                Aucune commande en cours.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
