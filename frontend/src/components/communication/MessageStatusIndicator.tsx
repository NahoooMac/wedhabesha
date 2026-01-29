import React from 'react';
import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusIndicatorProps {
  status: MessageDeliveryStatus;
  timestamp?: Date | string;
  showTimestamp?: boolean;
  size?: 'sm' | 'md';
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  timestamp,
  showTimestamp = false,
  size = 'sm'
}) => {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const renderIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className={`${iconSize} text-gray-400 animate-pulse`} />;
      case 'sent':
        return <Check className={`${iconSize} text-gray-400`} />;
      case 'delivered':
        return <CheckCheck className={`${iconSize} text-gray-400`} />;
      case 'read':
        return <CheckCheck className={`${iconSize} text-blue-500`} />;
      case 'failed':
        return <XCircle className={`${iconSize} text-red-500`} />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center gap-1">
      {renderIcon()}
      {showTimestamp && timestamp && (
        <span className="text-[10px] text-gray-500">
          {formatTime(timestamp)}
        </span>
      )}
    </div>
  );
};

export default MessageStatusIndicator;
