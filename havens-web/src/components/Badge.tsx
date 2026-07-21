import React from 'react'

interface BadgeProps {
  label: string
  bg: string
  text: string
}

export const Badge: React.FC<BadgeProps> = ({ label, bg, text }) => {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}>
      {label}
    </span>
  )
}
