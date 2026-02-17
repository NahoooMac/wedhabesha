import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, AlertCircle, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';

interface Notification {
  id: string;
  type: 'announcement' | 'message' | 'alert' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationDropdownProps {
  userId: string;
  userType: 'COUPLE' | 'VENDOR';
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId, userType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const previousNotificationsRef = useRef<Notification[]>([]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setBrowserNotificationsEnabled(permission === 'granted');
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setBrowserNotificationsEnabled(true);
    }
  }, []);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<{ notifications: Notification[] }>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/notifications/${userId}`);
      return response as { notifications: Notification[] };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications: Notification[] = notificationsData?.notifications || [];

  // Show browser notifications for new unread messages
  useEffect(() => {
    if (!browserNotificationsEnabled || notifications.length === 0) return;

    const previousNotifications = previousNotificationsRef.current;
    const newNotifications = notifications.filter(
      (notification: Notification) =>
        !notification.read &&
        !previousNotifications.some((prev: Notification) => prev.id === notification.id)
    );

    newNotifications.forEach((notification: Notification) => {
      if (notification.type === 'message') {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: notification.id,
        });

        browserNotification.onclick = () => {
          window.focus();
          handleNotificationClick(notification);
          browserNotification.close();
        };
      }
    });

    previousNotificationsRef.current = notifications;
  }, [notifications, browserNotificationsEnabled]);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.put(`/api/v1/notifications/${userId}/read-all`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Close dropdown after clicking
    setIsOpen(false);
    
    // Handle message notifications - redirect to Messages section
    if (notification.type === 'message') {
      if (userType === 'VENDOR') {
        // Navigate to vendor dashboard Messages tab
        navigate('/vendor/dashboard');
        // Use setTimeout to ensure navigation completes before triggering view change
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('changeVendorView', { detail: { view: 'messages' } }));
        }, 100);
      } else {
        // Navigate to couple dashboard Messages tab (communication tab with vendors subtab)
        navigate('/dashboard');
        // Use setTimeout to ensure navigation completes before triggering tab change
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('changeDashboardTab', { detail: { tab: 'communication', subTab: 'vendors' } }));
        }, 100);
      }
    } else if (notification.link) {
      // For non-message notifications, use the provided link
      navigate(notification.link);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-rose-200 dark:border-rose-900 border-t-rose-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">No notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      !notification.read ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0 mt-1.5"></div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page if it exists
                }}
                className="w-full text-center text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
