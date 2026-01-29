const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

/**
 * Load Testing Script for Couple-Vendor Messaging
 * 
 * Tests performance under load and monitors response times
 * Requirements: TR-5
 */

class MessagingLoadTester {
  constructor(baseUrl = 'http://localhost:3001', wsUrl = 'ws://localhost:3001') {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.authToken = null;
    this.metrics = {
      threadListRequests: [],
      messageRequests: [],
      sendMessageRequests: [],
      websocketConnections: [],
      errors: []
    };
  }

  /**
   * Authenticate and get token
   */
  async authenticate() {
    try {
      // This would normally use real authentication
      // For testing, we'll simulate with a test token
      this.authToken = 'test-token-for-load-testing';
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Test thread list loading performance
   */
  async testThreadListPerformance(iterations = 100) {
    console.log(`🔄 Testing thread list performance (${iterations} requests)...`);
    
    const promises = [];
    
    for (let i = 0; i < iterations; i++) {
      promises.push(this.measureThreadListRequest(i));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    this.metrics.threadListRequests = successful;
    
    if (failed.length > 0) {
      console.error(`❌ ${failed.length} thread list requests failed`);
      failed.forEach(f => this.metrics.errors.push(f.reason));
    }

    this.analyzeThreadListMetrics();
  }

  /**
   * Measure single thread list request
   */
  async measureThreadListRequest(requestId) {
    const startTime = performance.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/messaging/couple/threads`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        requestId,
        duration,
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        threadCount: response.data.threads ? response.data.threads.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      throw {
        requestId,
        duration,
        error: error.message,
        status: error.response?.status || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test message loading performance
   */
  async testMessageLoadingPerformance(threadId, iterations = 50) {
    console.log(`🔄 Testing message loading performance (${iterations} requests)...`);
    
    const promises = [];
    
    for (let i = 0; i < iterations; i++) {
      promises.push(this.measureMessageRequest(threadId, i));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    this.metrics.messageRequests = successful;
    
    if (failed.length > 0) {
      console.error(`❌ ${failed.length} message requests failed`);
      failed.forEach(f => this.metrics.errors.push(f.reason));
    }

    this.analyzeMessageMetrics();
  }

  /**
   * Measure single message request
   */
  async measureMessageRequest(threadId, requestId) {
    const startTime = performance.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/messaging/couple/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 50,
          offset: requestId * 10 // Vary offset for different data
        },
        timeout: 10000
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        requestId,
        threadId,
        duration,
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        messageCount: response.data.messages ? response.data.messages.length : 0,
        hasMore: response.data.hasMore,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      throw {
        requestId,
        threadId,
        duration,
        error: error.message,
        status: error.response?.status || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test message sending performance
   */
  async testMessageSendingPerformance(threadId, iterations = 20) {
    console.log(`🔄 Testing message sending performance (${iterations} messages)...`);
    
    const promises = [];
    
    for (let i = 0; i < iterations; i++) {
      promises.push(this.measureSendMessage(threadId, i));
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    this.metrics.sendMessageRequests = successful;
    
    if (failed.length > 0) {
      console.error(`❌ ${failed.length} send message requests failed`);
      failed.forEach(f => this.metrics.errors.push(f.reason));
    }

    this.analyzeSendMessageMetrics();
  }

  /**
   * Measure single message send
   */
  async measureSendMessage(threadId, requestId) {
    const startTime = performance.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/messaging/couple/messages`, {
        threadId,
        content: `Load test message ${requestId} - ${new Date().toISOString()}`,
        messageType: 'text'
      }, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        requestId,
        threadId,
        duration,
        status: response.status,
        messageId: response.data.message?.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      throw {
        requestId,
        threadId,
        duration,
        error: error.message,
        status: error.response?.status || 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test WebSocket connection performance
   */
  async testWebSocketPerformance(connections = 10) {
    console.log(`🔄 Testing WebSocket performance (${connections} connections)...`);
    
    const promises = [];
    
    for (let i = 0; i < connections; i++) {
      promises.push(this.measureWebSocketConnection(i));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    this.metrics.websocketConnections = successful;
    
    if (failed.length > 0) {
      console.error(`❌ ${failed.length} WebSocket connections failed`);
      failed.forEach(f => this.metrics.errors.push(f.reason));
    }

    this.analyzeWebSocketMetrics();
  }

  /**
   * Measure WebSocket connection
   */
  async measureWebSocketConnection(connectionId) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      let connected = false;
      
      const ws = new WebSocket(this.wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const timeout = setTimeout(() => {
        if (!connected) {
          ws.close();
          reject({
            connectionId,
            error: 'Connection timeout',
            duration: performance.now() - startTime,
            timestamp: new Date().toISOString()
          });
        }
      }, 5000);

      ws.on('open', () => {
        connected = true;
        clearTimeout(timeout);
        
        const connectTime = performance.now() - startTime;
        
        // Test message sending
        const messageStartTime = performance.now();
        ws.send(JSON.stringify({
          type: 'couple:join',
          data: { coupleId: 'test-couple-1' }
        }));

        ws.on('message', (data) => {
          const messageEndTime = performance.now();
          const messageRoundTrip = messageEndTime - messageStartTime;
          
          ws.close();
          
          resolve({
            connectionId,
            connectDuration: connectTime,
            messageRoundTrip,
            totalDuration: messageEndTime - startTime,
            timestamp: new Date().toISOString()
          });
        });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject({
          connectionId,
          error: error.message,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  /**
   * Analyze thread list metrics
   */
  analyzeThreadListMetrics() {
    const durations = this.metrics.threadListRequests.map(r => r.duration);
    
    console.log('\n📊 Thread List Performance Analysis:');
    console.log(`Total requests: ${durations.length}`);
    console.log(`Average response time: ${this.average(durations).toFixed(2)}ms`);
    console.log(`Median response time: ${this.median(durations).toFixed(2)}ms`);
    console.log(`95th percentile: ${this.percentile(durations, 95).toFixed(2)}ms`);
    console.log(`99th percentile: ${this.percentile(durations, 99).toFixed(2)}ms`);
    console.log(`Min response time: ${Math.min(...durations).toFixed(2)}ms`);
    console.log(`Max response time: ${Math.max(...durations).toFixed(2)}ms`);
    
    const slowRequests = durations.filter(d => d > 3000).length;
    console.log(`Requests > 3s: ${slowRequests} (${(slowRequests / durations.length * 100).toFixed(1)}%)`);
  }

  /**
   * Analyze message metrics
   */
  analyzeMessageMetrics() {
    const durations = this.metrics.messageRequests.map(r => r.duration);
    
    console.log('\n📊 Message Loading Performance Analysis:');
    console.log(`Total requests: ${durations.length}`);
    console.log(`Average response time: ${this.average(durations).toFixed(2)}ms`);
    console.log(`Median response time: ${this.median(durations).toFixed(2)}ms`);
    console.log(`95th percentile: ${this.percentile(durations, 95).toFixed(2)}ms`);
    console.log(`99th percentile: ${this.percentile(durations, 99).toFixed(2)}ms`);
    
    const slowRequests = durations.filter(d => d > 3000).length;
    console.log(`Requests > 3s: ${slowRequests} (${(slowRequests / durations.length * 100).toFixed(1)}%)`);
  }

  /**
   * Analyze send message metrics
   */
  analyzeSendMessageMetrics() {
    const durations = this.metrics.sendMessageRequests.map(r => r.duration);
    
    console.log('\n📊 Message Sending Performance Analysis:');
    console.log(`Total requests: ${durations.length}`);
    console.log(`Average response time: ${this.average(durations).toFixed(2)}ms`);
    console.log(`Median response time: ${this.median(durations).toFixed(2)}ms`);
    console.log(`95th percentile: ${this.percentile(durations, 95).toFixed(2)}ms`);
    
    const slowRequests = durations.filter(d => d > 2000).length;
    console.log(`Requests > 2s: ${slowRequests} (${(slowRequests / durations.length * 100).toFixed(1)}%)`);
  }

  /**
   * Analyze WebSocket metrics
   */
  analyzeWebSocketMetrics() {
    const connectDurations = this.metrics.websocketConnections.map(r => r.connectDuration);
    const messageDurations = this.metrics.websocketConnections.map(r => r.messageRoundTrip);
    
    console.log('\n📊 WebSocket Performance Analysis:');
    console.log(`Total connections: ${connectDurations.length}`);
    console.log(`Average connect time: ${this.average(connectDurations).toFixed(2)}ms`);
    console.log(`Average message round-trip: ${this.average(messageDurations).toFixed(2)}ms`);
    console.log(`95th percentile connect: ${this.percentile(connectDurations, 95).toFixed(2)}ms`);
    console.log(`95th percentile message: ${this.percentile(messageDurations, 95).toFixed(2)}ms`);
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: this.metrics.threadListRequests.length + 
                      this.metrics.messageRequests.length + 
                      this.metrics.sendMessageRequests.length,
        totalErrors: this.metrics.errors.length,
        websocketConnections: this.metrics.websocketConnections.length
      },
      threadList: this.getMetricsSummary(this.metrics.threadListRequests),
      messages: this.getMetricsSummary(this.metrics.messageRequests),
      sendMessages: this.getMetricsSummary(this.metrics.sendMessageRequests),
      websockets: this.getWebSocketSummary(this.metrics.websocketConnections),
      errors: this.metrics.errors
    };

    console.log('\n📋 Performance Report Generated');
    console.log('='.repeat(50));
    console.log(JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(metrics) {
    if (metrics.length === 0) return null;
    
    const durations = metrics.map(m => m.duration);
    
    return {
      count: metrics.length,
      averageMs: this.average(durations),
      medianMs: this.median(durations),
      p95Ms: this.percentile(durations, 95),
      p99Ms: this.percentile(durations, 99),
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations)
    };
  }

  /**
   * Get WebSocket summary
   */
  getWebSocketSummary(metrics) {
    if (metrics.length === 0) return null;
    
    const connectDurations = metrics.map(m => m.connectDuration);
    const messageDurations = metrics.map(m => m.messageRoundTrip);
    
    return {
      count: metrics.length,
      averageConnectMs: this.average(connectDurations),
      averageMessageMs: this.average(messageDurations),
      p95ConnectMs: this.percentile(connectDurations, 95),
      p95MessageMs: this.percentile(messageDurations, 95)
    };
  }

  // Utility functions
  average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Run load test if called directly
if (require.main === module) {
  async function runLoadTest() {
    const tester = new MessagingLoadTester();
    
    try {
      await tester.authenticate();
      
      // Run performance tests
      await tester.testThreadListPerformance(50);
      await tester.testMessageLoadingPerformance('test-thread-1', 30);
      await tester.testMessageSendingPerformance('test-thread-1', 10);
      await tester.testWebSocketPerformance(5);
      
      // Generate report
      const report = tester.generateReport();
      
      // Save report to file
      const fs = require('fs');
      const reportPath = `load-test-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${reportPath}`);
      
    } catch (error) {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    }
  }

  runLoadTest();
}

module.exports = MessagingLoadTester;