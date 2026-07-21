import React from 'react'

interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md'
}

export const Avatar: React.FC<AvatarProps> = ({ name, color, size = 'sm' }) => {
  const sz = size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]'
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-medium text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {name ? name[0].toUpperCase() : 'U'}
    </div>
  )
}
