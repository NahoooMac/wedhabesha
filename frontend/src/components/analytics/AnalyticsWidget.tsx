import React from 'react';
import { Card } from '../ui/Card';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface AnalyticsWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    label: string;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink';
  isLoading?: boolean;
  onClick?: () => void;
}

const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  isLoading = false,
  onClick
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40',
      icon: 'text-blue-600 dark:text-blue-400',
      shadow: 'shadow-blue-500/20'
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      shadow: 'shadow-emerald-500/20'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40',
      icon: 'text-amber-600 dark:text-amber-400',
      shadow: 'shadow-amber-500/20'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40',
      icon: 'text-red-600 dark:text-red-400',
      shadow: 'shadow-red-500/20'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40',
      icon: 'text-purple-600 dark:text-purple-400',
      shadow: 'shadow-purple-500/20'
    },
    pink: {
      bg: 'bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40',
      icon: 'text-pink-600 dark:text-pink-400',
      shadow: 'shadow-pink-500/20'
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      case 'neutral':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          </div>
          <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center">
              {getTrendIcon()}
              <span className={`text-sm ml-1 ${getTrendColor()}`}>
                {trend.value} {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-14 h-14 ${colorClasses[color].bg} rounded-2xl flex items-center justify-center shadow-lg ${colorClasses[color].shadow}`}>
            <div className={`w-7 h-7 ${colorClasses[color].icon}`}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AnalyticsWidget;