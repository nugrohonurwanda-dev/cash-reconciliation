// src/components/shifts/StatusBadge.tsx
import { STATUS_CONFIG } from '@/lib/constants'

interface Props {
  status: string
}

export default function StatusBadge({ status }: Props) {
  const c = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
  }
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${c.color}`}
    >
      {c.label}
    </span>
  )
}