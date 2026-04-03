import { getAvatarColor } from '../../lib/constants'

export default function Avatar({ name, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs'
  return (
    <div className={`${sizeClass} ${getAvatarColor(name)} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {name?.charAt(0) || '?'}
    </div>
  )
}
