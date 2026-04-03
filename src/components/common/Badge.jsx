import { getVerdictBadgeClass, getStatusBadgeClass } from '../../lib/constants'

export function VerdictBadge({ verdict }) {
  if (!verdict) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getVerdictBadgeClass(verdict)}`}>
      {verdict}
    </span>
  )
}

export function StatusBadge({ status }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(status)}`}>
      {status}
    </span>
  )
}

export function Badge({ label, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
