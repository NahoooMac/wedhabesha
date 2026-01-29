import { NotificationPreferences } from '../types/messaging';

/**
 * Browser Notification Service
 * Handles browser notifications, sounds, and unread count management
 */
class NotificationService {
  private notificationSound: HTMLAudioElement | null = null;
  private isNotificationPermissionGranted = false;
  private unreadCount = 0;
  private originalTitle = document.title;
  private titleUpdateInterval: NodeJS.Timeout | null = null;
  private preferences: NotificationPreferences = {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    soundEnabled: true,
    quietHours: {
      start: '22:00',
      end: '08:00'
    }
  };

  constructor() {
    this.initializeNotificationSound();
    this.checkNotificationPermission();
    this.loadPreferences();
  }

  /**
   * Initialize notification sound
   */
  private initializeNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      this.createNotificationSound();
    } catch (error) {
      console.warn('Failed to initialize notification sound:', error);
    }
  }

  /**
   * Create a simple notification sound using Web Audio API
   */
  private createNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a simple notification tone
      const createTone = (frequency: number, duration: number, delay: number = 0) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
            
            oscillator.onended = () => resolve();
          }, delay);
        });
      };

      // Store the sound creation function
      this.notificationSound = {
        play: async () => {
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          // Play a pleasant two-tone notification
          await createTone(800, 0.15, 0);
          await createTone(600, 0.15, 100);
        }
      } as any;

    } catch (error) {
      console.warn('Web Audio API not supported, using fallback sound');
      this.createFallbackSound();
    }
  }

  /**
   * Create fallback sound using HTML5 Audio
   */
  private createFallbackSound(): void {
    // Create a data URL for a simple beep sound
    const audioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
    
    this.notificationSound = new Audio(audioData);
    this.notificationSound.volume = 0.3;
  }

  /**
   * Check and request notification permission
   */
  private async checkNotificationPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      this.isNotificationPermissionGranted = true;
    } else if (Notification.permission === 'default') {
      // Don't request permission automatically - let user enable it
      this.isNotificationPermissionGranted = false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.isNotificationPermissionGranted = permission === 'granted';
      return this.isNotificationPermissionGranted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Show browser notification for new message
   */
  async showMessageNotification(
    senderName: string,
    messagePreview: string,
    threadId: string
  ): Promise<void> {
    // Check if notifications are enabled and not in quiet hours
    if (!this.preferences.pushNotifications || this.isInQuietHours()) {
      return;
    }

    // Check if permission is granted
    if (!this.isNotificationPermissionGranted) {
      return;
    }

    try {
      const notification = new Notification(`New message from ${senderName}`, {
        body: messagePreview,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: `message-${threadId}`, // Prevent duplicate notifications for same thread
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        // Navigate to the thread (this could be enhanced with routing)
        notification.close();
      };

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Play notification sound
   */
  async playNotificationSound(): Promise<void> {
    if (!this.preferences.soundEnabled || this.isInQuietHours()) {
      return;
    }

    try {
      if (this.notificationSound && typeof this.notificationSound.play === 'function') {
        await this.notificationSound.play();
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Update unread count and page title
   */
  updateUnreadCount(count: number): void {
    this.unreadCount = count;
    this.updatePageTitle();
  }

  /**
   * Increment unread count
   */
  incrementUnreadCount(): void {
    this.unreadCount++;
    this.updatePageTitle();
  }

  /**
   * Decrement unread count
   */
  decrementUnreadCount(): void {
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.updatePageTitle();
  }

  /**
   * Reset unread count
   */
  resetUnreadCount(): void {
    this.unreadCount = 0;
    this.updatePageTitle();
  }

  /**
   * Update page title with unread count
   */
  private updatePageTitle(): void {
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) ${this.originalTitle}`;
      
      // Start blinking title if not already blinking
      if (!this.titleUpdateInterval) {
        this.startTitleBlinking();
      }
    } else {
      document.title = this.originalTitle;
      this.stopTitleBlinking();
    }
  }

  /**
   * Start blinking title for attention
   */
  private startTitleBlinking(): void {
    let isOriginal = true;
    this.titleUpdateInterval = setInterval(() => {
      if (this.unreadCount > 0) {
        document.title = isOriginal 
          ? `(${this.unreadCount}) ${this.originalTitle}`
          : `🔔 New Messages - ${this.originalTitle}`;
        isOriginal = !isOriginal;
      }
    }, 1500);
  }

  /**
   * Stop blinking title
   */
  private stopTitleBlinking(): void {
    if (this.titleUpdateInterval) {
      clearInterval(this.titleUpdateInterval);
      this.titleUpdateInterval = null;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(): boolean {
    if (!this.preferences.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Load notification preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('notificationPreferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
  }

  /**
   * Save notification preferences to localStorage
   */
  savePreferences(preferences: Partial<NotificationPreferences>): void {
    try {
      this.preferences = { ...this.preferences, ...preferences };
      localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Get current notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Handle page visibility change
   */
  handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // User returned to the page, stop title blinking
      this.stopTitleBlinking();
      if (this.unreadCount > 0) {
        document.title = `(${this.unreadCount}) ${this.originalTitle}`;
      }
    }
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.stopTitleBlinking();
    document.title = this.originalTitle;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;