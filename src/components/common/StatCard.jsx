const colorMap = {
  blue:   'border-blue-200 bg-blue-50',
  green:  'border-green-200 bg-green-50',
  orange: 'border-orange-200 bg-orange-50',
  teal:   'border-teal-200 bg-teal-50',
  purple: 'border-purple-200 bg-purple-50',
  red:    'border-red-200 bg-red-50',
}
const valueColorMap = {
  blue:   'text-blue-700',
  green:  'text-green-700',
  orange: 'text-orange-700',
  teal:   'text-teal-700',
  purple: 'text-purple-700',
  red:    'text-red-700',
}

export default function StatCard({ label, value, sub, color = 'blue', icon: Icon }) {
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
        {Icon && <Icon size={16} className={`${valueColorMap[color]} opacity-60`} />}
      </div>
      <div className={`text-2xl font-bold ${valueColorMap[color]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}
