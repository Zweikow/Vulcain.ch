import { OrderStatus } from '@prisma/client'

const CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  A_TRAITER: {
    label: 'À traiter',
    className:
      'bg-[#FFF8E1] dark:bg-[#3d2a0a] text-text-warning dark:text-[#FF9800]',
  },
  EN_PREPARATION: {
    label: 'En préparation',
    className:
      'bg-[#E3F2FD] dark:bg-[#1a2a3d] text-[#1565C0] dark:text-[#64B5F6]',
  },
  EXPEDIEE: {
    label: 'Expédiée',
    className:
      'bg-[#E8F5E9] dark:bg-[#1e3326] text-text-success dark:text-[#81C784]',
  },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-pill ${className}`}>
      {label}
    </span>
  )
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  A_TRAITER: 'À traiter',
  EN_PREPARATION: 'En préparation',
  EXPEDIEE: 'Expédiée',
}
