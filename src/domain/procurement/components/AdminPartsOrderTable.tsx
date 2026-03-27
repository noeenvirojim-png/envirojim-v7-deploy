import { getPartsOrders } from '../actions/parts_orders';
import { ArrivalDateEditor } from './ArrivalDateEditor';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from './StatusBadge';

export default async function AdminPartsOrderTable() {
  const orders = await getPartsOrders();

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Pièce</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date d'arrivée prévue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="text-xs font-mono">{order.id.slice(0, 8)}</TableCell>
              <TableCell>
                <div className="font-medium">{order.part?.name || order.part_name_override}</div>
                <div className="text-xs text-muted-foreground">{order.part?.part_number || 'No Part #'}</div>
              </TableCell>
              <TableCell>{order.supplier_name}</TableCell>
              <TableCell>
                <StatusBadge status={order.status as any} />
              </TableCell>
              <TableCell>
                <ArrivalDateEditor 
                  orderId={order.id} 
                  currentDate={order.expected_arrival} 
                />
              </TableCell>
            </TableRow>
          ))}
          {(!orders || orders.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                Aucune commande à gérer.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
