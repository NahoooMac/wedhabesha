/**
 * @fileoverview ChatAlignmentTest Component
 * 
 * Simple test component to verify chat bubble alignment is working correctly.
 * This component uses inline styles to force alignment and test the logic.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

import React from 'react';
import '../../styles/messaging-design-tokens.css';

interface TestMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
}

const ChatAlignmentTest: React.FC = () => {
  // Test data
  const currentUserId = 'couple-123';
  const messages: TestMessage[] = [
    {
      id: '1',
      senderId: 'couple-123',
      content: 'Hi! This should be on the RIGHT side (my message)',
      timestamp: '10:30'
    },
    {
      id: '2',
      senderId: 'vendor-456',
      content: 'Hello! This should be on the LEFT side (their message)',
      timestamp: '10:31'
    },
    {
      id: '3',
      senderId: 'couple-123',
      content: 'Another message from me - should be RIGHT aligned',
      timestamp: '10:32'
    },
    {
      id: '4',
      senderId: 'vendor-456',
      content: 'And another from them - should be LEFT aligned',
      timestamp: '10:33'
    }
  ];

  const renderMessage = (message: TestMessage) => {
    const isOwnMessage = message.senderId === currentUserId;
    
    console.log('🔍 Alignment Test:', {
      messageId: message.id,
      senderId: message.senderId,
      currentUserId,
      isOwnMessage,
      expectedAlignment: isOwnMessage ? 'RIGHT' : 'LEFT'
    });

    return (
      <div
        key={message.id}
        style={{
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: '12px',
          padding: '0 16px'
        }}
      >
        <div
          style={{
            maxWidth: '75%',
            padding: '12px 16px',
            borderRadius: isOwnMessage ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
            backgroundColor: isOwnMessage ? '#3b82f6' : '#e5e7eb',
            color: isOwnMessage ? 'white' : '#111827',
            boxShadow: isOwnMessage 
              ? '0 2px 8px rgba(59, 130, 246, 0.15)' 
              : '0 1px 3px rgba(0, 0, 0, 0.1)',
            wordWrap: 'break-word',
            position: 'relative'
          }}
        >
          <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '4px' }}>
            {message.content}
          </div>
          <div 
            style={{ 
              fontSize: '11px', 
              opacity: 0.7,
              textAlign: isOwnMessage ? 'right' : 'left'
            }}
          >
            {message.timestamp}
          </div>
          
          {/* Debug indicator */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: isOwnMessage ? 'auto' : '0',
              right: isOwnMessage ? '0' : 'auto',
              fontSize: '10px',
              fontWeight: 'bold',
              color: isOwnMessage ? '#3b82f6' : '#ef4444',
              backgroundColor: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${isOwnMessage ? '#3b82f6' : '#ef4444'}`
            }}
          >
            {isOwnMessage ? 'SENT (RIGHT)' : 'RECEIVED (LEFT)'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Chat Bubble Alignment Test
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Current User ID: <strong>{currentUserId}</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: '12px' }}>
          Check browser console for alignment debug logs
        </p>
      </div>

      <div 
        style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '12px',
          padding: '20px',
          minHeight: '400px'
        }}
      >
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Expected Behavior:</h3>
          <ul style={{ fontSize: '12px', color: '#6b7280', margin: 0, paddingLeft: '20px' }}>
            <li>Messages from <strong>couple-123</strong> (me) → RIGHT side, BLUE bubbles</li>
            <li>Messages from <strong>vendor-456</strong> (them) → LEFT side, GRAY bubbles</li>
          </ul>
        </div>

        {messages.map(renderMessage)}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#92400e' }}>
          🔍 Debug Information:
        </h3>
        <ul style={{ fontSize: '12px', color: '#92400e', margin: 0, paddingLeft: '20px' }}>
          <li>This test uses inline styles to force alignment</li>
          <li>Check browser console for detailed alignment logs</li>
          <li>If alignment is wrong, the issue is in the isOwnMessage logic</li>
          <li>Blue labels = sent messages (should be right), Red labels = received messages (should be left)</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatAlignmentTest;