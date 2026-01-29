/**
 * ConnectionStatus Component
 * 
 * Displays real-time connection status with indicators for connected, 
 * disconnected, and reconnecting states. Provides user feedback about
 * WebSocket connection health.
 * 
 * Requirements: 3.3, 3.4, 7.2
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react';
import { realtimeHandler } from '../../services/realtimeHandler';
import '../../styles/messaging-design-tokens.css';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  variant?: 'inline' | 'floating' | 'banner';
}

/**
 * ConnectionStatus Component
 * 
 * Shows the current WebSocket connection status with appropriate icons
 * and messages. Automatically updates when connection state changes.
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showText = true,
  variant = 'inline'
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Initial state
    setIsConnected(realtimeHandler.isConnected());
    setReconnectAttempts(realtimeHandler.getReconnectAttempts());

    // Listen for connection changes
    const unsubscribeConnection = realtimeHandler.onConnectionChange((connected) => {
      setIsConnected(connected);
      
      if (connected) {
        setIsReconnecting(false);
        setReconnectAttempts(0);
      } else {
        setIsReconnecting(true);
        // Update reconnect attempts periodically while disconnected
        const interval = setInterval(() => {
          const attempts = realtimeHandler.getReconnectAttempts();
          setReconnectAttempts(attempts);
          
          // Stop checking if connected or max attempts reached
          if (realtimeHandler.isConnected() || attempts >= 10) {
            clearInterval(interval);
            setIsReconnecting(false);
          }
        }, 1000);

        return () => clearInterval(interval);
      }
    });

    // Listen for errors
    const unsubscribeError = realtimeHandler.onError((error) => {
      console.error('Connection error:', error);
      setIsReconnecting(true);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
    };
  }, []);

  // Don't show anything if connected and no issues
  if (isConnected && !isReconnecting && variant !== 'banner') {
    return null;
  }

  const getStatusIcon = () => {
    if (isConnected) {
      return <Wifi className="w-4 h-4" style={{ color: 'var(--messaging-success-600)' }} />;
    } else if (isReconnecting) {
      return (
        <RotateCcw 
          className="w-4 h-4 animate-spin" 
          style={{ color: 'var(--messaging-warning-600)' }} 
        />
      );
    } else {
      return <WifiOff className="w-4 h-4" style={{ color: 'var(--messaging-error-600)' }} />;
    }
  };

  const getStatusText = () => {
    if (isConnected) {
      return 'Connected';
    } else if (isReconnecting) {
      return reconnectAttempts > 0 
        ? `Reconnecting... (${reconnectAttempts}/10)`
        : 'Reconnecting...';
    } else {
      return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    if (isConnected) {
      return 'var(--messaging-success-600)';
    } else if (isReconnecting) {
      return 'var(--messaging-warning-600)';
    } else {
      return 'var(--messaging-error-600)';
    }
  };

  const baseClasses = `flex items-center gap-2 ${className}`;

  if (variant === 'floating') {
    return (
      <div 
        className={`${baseClasses} fixed bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg z-50 transition-all duration-300`}
        style={{
          backgroundColor: 'white',
          borderColor: getStatusColor(),
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: 'var(--messaging-radius-lg)',
          boxShadow: 'var(--messaging-shadow-lg)'
        }}
      >
        {getStatusIcon()}
        {showText && (
          <span 
            className="text-sm font-medium"
            style={{ 
              color: getStatusColor(),
              fontSize: 'var(--messaging-font-size-sm)',
              fontWeight: 'var(--messaging-font-weight-medium)'
            }}
          >
            {getStatusText()}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'banner' && (!isConnected || isReconnecting)) {
    return (
      <div 
        className={`${baseClasses} w-full px-4 py-2 border-b justify-center`}
        style={{
          backgroundColor: isConnected 
            ? 'var(--messaging-success-50)' 
            : isReconnecting 
              ? 'var(--messaging-warning-50)'
              : 'var(--messaging-error-50)',
          borderColor: getStatusColor(),
          color: getStatusColor()
        }}
      >
        {getStatusIcon()}
        {showText && (
          <span 
            className="text-sm font-medium"
            style={{ 
              fontSize: 'var(--messaging-font-size-sm)',
              fontWeight: 'var(--messaging-font-weight-medium)'
            }}
          >
            {getStatusText()}
          </span>
        )}
        {!isConnected && !isReconnecting && (
          <AlertCircle className="w-4 h-4 ml-2" />
        )}
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={baseClasses}>
      {getStatusIcon()}
      {showText && (
        <span 
          className="text-sm"
          style={{ 
            color: getStatusColor(),
            fontSize: 'var(--messaging-font-size-sm)'
          }}
        >
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;