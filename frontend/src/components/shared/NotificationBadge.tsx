import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'green' | 'amber';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  className = '', 
  size = 'sm',
  color = 'red'
}) => {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  };

  const colorClasses = {
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    amber: 'bg-amber-500 text-white'
  };

  const displayCount = count > 9 ? '9+' : count.toString();

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        ${className}
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-bold 
        border-2 
        border-white 
        dark:border-slate-900
        shadow-sm
        animate-pulse
      `}
    >
      {displayCount}
    </div>
  );
};

export default NotificationBadge;