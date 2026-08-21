import React, { useState } from 'react';

interface AvatarProps {
  name?: string;
  color?: string;
  photoUrl?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  color = '#2D5A3D',
  photoUrl,
  src,
  size = 'sm',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = photoUrl || src;

  let sizeClass = 'w-6 h-6 text-[10px]';
  if (size === 'xs') sizeClass = 'w-5 h-5 text-[9px]';
  else if (size === 'sm') sizeClass = 'w-6 h-6 text-[10px]';
  else if (size === 'md') sizeClass = 'w-8 h-8 text-xs';
  else if (size === 'lg') sizeClass = 'w-10 h-10 text-sm';
  else if (size === 'xl') sizeClass = 'w-12 h-12 text-base';

  const initial = name ? name[0].toUpperCase() : 'U';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden border border-white/40 shadow-xs ${className}`}
      style={{ backgroundColor: color }}
    >
      {imageUrl && !hasError ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};
