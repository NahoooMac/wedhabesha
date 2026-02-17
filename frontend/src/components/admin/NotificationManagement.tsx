import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, Users, Store, AlertCircle, Info, MessageSquare, CheckCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface NotificationForm {
  recipient_type: 'all' | 'couples' | 'vendors' | 'specific';
  specific_user_id?: string;
  notification_type: 'announcement' | 'message' | 'alert' | 'info';
  title: string;
  message: string;
  link?: string;
}

interface UserCounts {
  total: number;
  couples: number;
  vendors: number;
}

const NotificationManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<NotificationForm>({
    recipient_type: 'all',
    notification_type: 'announcement',
    title: '',
    message: '',
    link: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch user counts
  const { data: userCounts } = useQuery<UserCounts>({
    queryKey: ['user-counts'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/users/counts');
      return response as UserCounts;
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: NotificationForm) => {
      return await apiClient.post('/api/admin/notifications/broadcast', data);
    },
    onSuccess: () => {
      setShowSuccess(true);
      setFormData({
        recipient_type: 'all',
        notification_type: 'announcement',
        title: '',
        message: '',
        link: '',
      });
      setTimeout(() => setShowSuccess(false), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendNotificationMutation.mutate(formData);
  };

  const getRecipientCount = () => {
    if (!userCounts) return 0;
    switch (formData.recipient_type) {
      case 'all':
        return userCounts.total || 0;
      case 'couples':
        return userCounts.couples || 0;
      case 'vendors':
        return userCounts.vendors || 0;
      case 'specific':
        return 1;
      default:
        return 0;
    }
  };

  const notificationTypes = [
    {
      value: 'announcement',
      label: 'Announcement',
      icon: Bell,
      color: 'blue',
      description: 'Platform updates, new features, system maintenance',
    },
    {
      value: 'alert',
      label: 'Alert',
      icon: AlertCircle,
      color: 'amber',
      description: 'Important warnings, urgent actions required',
    },
    {
      value: 'info',
      label: 'Information',
      icon: Info,
      color: 'slate',
      description: 'Tips, suggestions, helpful information',
    },
    {
      value: 'message',
      label: 'Message',
      icon: MessageSquare,
      color: 'green',
      description: 'Direct messages, updates, communications',
    },
  ];

  const recipientTypes = [
    {
      value: 'all',
      label: 'All Users',
      icon: Users,
      description: 'Send to all couples and vendors',
    },
    {
      value: 'couples',
      label: 'Couples Only',
      icon: Users,
      description: 'Send to all couples',
    },
    {
      value: 'vendors',
      label: 'Vendors Only',
      icon: Store,
      description: 'Send to all vendors',
    },
    {
      value: 'specific',
      label: 'Specific User',
      icon: Users,
      description: 'Send to a specific user by ID',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Send notifications to users across the platform
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl">
          <Bell className="w-5 h-5" />
          <span className="font-semibold">{getRecipientCount()} Recipients</span>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-100">Notification Sent Successfully!</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your notification has been delivered to {getRecipientCount()} user{getRecipientCount() !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Selection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Select Recipients</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipientTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.recipient_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, recipient_type: type.value as any })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${isSelected ? 'text-rose-900 dark:text-rose-100' : 'text-slate-900 dark:text-white'}`}>
                        {type.label}
                      </h4>
                      <p className={`text-sm ${isSelected ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        {type.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Specific User ID Input */}
          {formData.recipient_type === 'specific' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={formData.specific_user_id || ''}
                onChange={(e) => setFormData({ ...formData, specific_user_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                placeholder="Enter user ID"
                required
              />
            </div>
          )}
        </div>

        {/* Notification Type */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notification Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notificationTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.notification_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, notification_type: type.value as any })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? `bg-${type.color}-100 dark:bg-${type.color}-900/40` : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Icon className={`w-5 h-5 ${isSelected ? `text-${type.color}-600 dark:text-${type.color}-400` : 'text-slate-600 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${isSelected ? `text-${type.color}-900 dark:text-${type.color}-100` : 'text-slate-900 dark:text-white'}`}>
                        {type.label}
                      </h4>
                      <p className={`text-sm ${isSelected ? `text-${type.color}-700 dark:text-${type.color}-300` : 'text-slate-600 dark:text-slate-400'}`}>
                        {type.description}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle className={`w-5 h-5 text-${type.color}-600 dark:text-${type.color}-400 flex-shrink-0`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification Content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notification Content</h3>
          
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                placeholder="Enter notification title"
                required
                maxLength={100}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                placeholder="Enter notification message"
                required
                maxLength={500}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formData.message.length}/500 characters
              </p>
            </div>

            {/* Link (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Link (Optional)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-rose-500 dark:focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                placeholder="https://example.com/page"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Optional link for users to navigate to
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Preview</h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {formData.notification_type === 'announcement' && <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                {formData.notification_type === 'alert' && <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                {formData.notification_type === 'info' && <Info className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
                {formData.notification_type === 'message' && <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {formData.title || 'Notification Title'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {formData.message || 'Notification message will appear here...'}
                </p>
                {formData.link && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                    🔗 {formData.link}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This notification will be sent to <span className="font-semibold text-slate-900 dark:text-white">{getRecipientCount()} user{getRecipientCount() !== 1 ? 's' : ''}</span>
          </p>
          <button
            type="submit"
            disabled={sendNotificationMutation.isPending || !formData.title || !formData.message}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-500/30"
          >
            <Send className="w-5 h-5" />
            {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationManagement;
