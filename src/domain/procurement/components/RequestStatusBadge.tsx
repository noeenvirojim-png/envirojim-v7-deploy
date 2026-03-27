import { Badge } from "@/components/ui/badge"

type RequestStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SENT' | 'QUOTE_READY' | 'WAITING_PO' | 'CONFIRMED' | 'RECEIVED_HQ' | 'SHIPPED' | 'DELIVERED' | 'INVOICED'

interface RequestStatusBadgeProps {
    status: string
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
    const normalizedStatus = status as RequestStatus

    switch (normalizedStatus) {
        case 'QUOTE_READY':
        case 'CONFIRMED':
        case 'DELIVERED':
            return <Badge variant="success">{status.replace('_', ' ')}</Badge>

        case 'PENDING_APPROVAL':
        case 'WAITING_PO':
            return <Badge variant="warning">{status.replace('_', ' ')}</Badge>

        case 'SHIPPED':
        case 'RECEIVED_HQ':
        case 'SENT':
            return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">{status.replace('_', ' ')}</Badge>

        case 'DRAFT':
        default:
            return <Badge variant="secondary">{status.replace('_', ' ')}</Badge>
    }
}
