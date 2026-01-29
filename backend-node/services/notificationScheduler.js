/**
 * Notification Scheduler Service
 * 
 * Schedules and runs periodic checks for unread messages
 * and sends SMS notifications via AfroSMS.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

const afroSmsService = require('./afroSmsService');

class NotificationScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkInterval = parseInt(process.env.SMS_CHECK_INTERVAL_MINUTES || '60') * 60 * 1000; // Default: 1 hour
  }

  /**
   * Start the notification scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⏭️  Notification scheduler is already running');
      return;
    }

    console.log(`🚀 Starting notification scheduler (checking every ${this.checkInterval / 60000} minutes)`);

    // Run immediately on start
    this.runCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, this.checkInterval);

    this.isRunning = true;
  }

  /**
   * Stop the notification scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⏭️  Notification scheduler is not running');
      return;
    }

    console.log('🛑 Stopping notification scheduler');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Run a single check for unread messages
   */
  async runCheck() {
    try {
      console.log('🔍 Running scheduled check for unread messages...');
      
      const result = await afroSmsService.checkAndNotifyUnreadMessages();
      
      if (result.success) {
        console.log(`✅ Check complete: ${result.notificationsSent} notifications sent, ${result.errors} errors`);
      } else {
        console.error('❌ Check failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ Error running scheduled check:', error);
      return {
        success: false,
        notificationsSent: 0,
        errors: 1,
        error: error.message
      };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      checkIntervalMinutes: this.checkInterval / 60000
    };
  }

  /**
   * Update check interval (requires restart)
   */
  setCheckInterval(minutes) {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    this.checkInterval = minutes * 60 * 1000;
    console.log(`✅ Check interval updated to ${minutes} minutes`);

    if (wasRunning) {
      this.start();
    }
  }
}

// Create singleton instance
const notificationScheduler = new NotificationScheduler();

module.exports = notificationScheduler;
