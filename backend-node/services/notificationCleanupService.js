const { query } = require('../config/database');

/**
 * NotificationCleanupService - Handles automatic cleanup of read notifications
 * 
 * Automatically removes read notifications after 24 hours to keep the notification
 * list clean while preserving unread notifications indefinitely.
 */
class NotificationCleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.cleanupIntervalMs = 60 * 60 * 1000; // Run every hour
  }

  /**
   * Start the automatic cleanup service
   */
  start() {
    if (this.cleanupInterval) {
      console.log('⚠️ Notification cleanup service is already running');
      return;
    }

    console.log('🧹 Starting notification cleanup service...');
    
    // Run cleanup immediately on start
    this.cleanupReadNotifications();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupReadNotifications();
    }, this.cleanupIntervalMs);

    console.log('✅ Notification cleanup service started (runs every hour)');
  }

  /**
   * Stop the automatic cleanup service
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Notification cleanup service stopped');
    }
  }

  /**
   * Clean up read notifications older than 24 hours
   * Keeps unread notifications indefinitely
   */
  async cleanupReadNotifications() {
    try {
      console.log('🧹 Running notification cleanup...');

      // Delete read notifications older than 24 hours
      const deleteQuery = `
        DELETE FROM notifications
        WHERE is_read = 1
        AND datetime(updated_at) <= datetime('now', '-24 hours')
      `;

      const result = await query(deleteQuery);
      const deletedCount = result.changes || 0;

      if (deletedCount > 0) {
        console.log(`✅ Cleaned up ${deletedCount} read notifications older than 24 hours`);
      } else {
        console.log('✅ No read notifications to clean up');
      }

      return {
        success: true,
        deletedCount: deletedCount
      };

    } catch (error) {
      console.error('❌ Failed to cleanup read notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      // Count read notifications older than 24 hours
      const countQuery = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE is_read = 1
        AND datetime(updated_at) <= datetime('now', '-24 hours')
      `;

      const result = await query(countQuery);
      const pendingCleanup = result.rows[0].count;

      // Count total notifications
      const totalQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
        FROM notifications
      `;

      const totalResult = await query(totalQuery);
      const stats = totalResult.rows[0];

      return {
        success: true,
        stats: {
          total: stats.total || 0,
          read: stats.read || 0,
          unread: stats.unread || 0,
          pendingCleanup: pendingCleanup
        }
      };

    } catch (error) {
      console.error('❌ Failed to get cleanup stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manual cleanup trigger (for testing or admin use)
   */
  async manualCleanup() {
    console.log('🧹 Manual notification cleanup triggered');
    return await this.cleanupReadNotifications();
  }
}

// Create singleton instance
const notificationCleanupService = new NotificationCleanupService();

module.exports = notificationCleanupService;
