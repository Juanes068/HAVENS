import React from 'react'

interface SectionHeadingProps {
  children: React.ReactNode
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ children }) => {
  return (
    <h1 className="text-3xl text-charcoal leading-tight font-serif font-semibold">
      {children}
    </h1>
  )
}
