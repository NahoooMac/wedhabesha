/**
 * @fileoverview ChatBubbleTest Component
 * 
 * Test component to verify chat bubble alignment and styling
 * for both Couple Dashboard and Vendor Dashboard messaging interfaces.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

import React from 'react';
import { SharedMessageThread } from './SharedMessageThread';
import { Message, MessageType, UserType, MessageStatus } from '../../types/messaging';
import '../../styles/messaging-design-tokens.css';

const ChatBubbleTest: React.FC = () => {
  // Mock messages to test alignment
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      senderId: 'couple-123',
      senderType: UserType.COUPLE,
      content: 'Hi! We are interested in your photography services for our wedding.',
      messageType: MessageType.TEXT,
      status: MessageStatus.READ,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    },
    {
      id: 'msg-2',
      threadId: 'thread-1',
      senderId: 'vendor-456',
      senderType: UserType.VENDOR,
      content: 'Hello! Thank you for reaching out. I would love to help capture your special day. When is your wedding date?',
      messageType: MessageType.TEXT,
      status: MessageStatus.READ,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5) // 1.5 hours ago
    },
    {
      id: 'msg-3',
      threadId: 'thread-1',
      senderId: 'couple-123',
      senderType: UserType.COUPLE,
      content: 'Our wedding is on June 15th, 2024. We are looking for someone who can capture both the ceremony and reception.',
      messageType: MessageType.TEXT,
      status: MessageStatus.READ,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1) // 1 hour ago
    },
    {
      id: 'msg-4',
      threadId: 'thread-1',
      senderId: 'vendor-456',
      senderType: UserType.VENDOR,
      content: 'Perfect! I am available on that date. I offer full-day wedding photography packages that include both ceremony and reception coverage. Would you like to schedule a consultation to discuss your vision?',
      messageType: MessageType.TEXT,
      status: MessageStatus.READ,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      id: 'msg-5',
      threadId: 'thread-1',
      senderId: 'couple-123',
      senderType: UserType.COUPLE,
      content: 'Yes, that sounds great! What are your rates?',
      messageType: MessageType.TEXT,
      status: MessageStatus.DELIVERED,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
    },
    {
      id: 'msg-6',
      threadId: 'thread-1',
      senderId: 'vendor-456',
      senderType: UserType.VENDOR,
      content: 'My full-day wedding package starts at $2,500 and includes 8 hours of coverage, edited high-resolution photos, and an online gallery. I can send you a detailed pricing sheet if you\'d like.',
      messageType: MessageType.TEXT,
      status: MessageStatus.SENT,
      isDeleted: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat Bubble Alignment Test</h1>
        <p className="text-gray-600">Testing message alignment for both Couple and Vendor perspectives</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Couple's View */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 text-center">
            👰 Couple's View
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[500px] overflow-hidden">
            <div className="p-3 bg-purple-50 border-b border-purple-100">
              <p className="text-sm text-purple-700 font-medium">
                Your messages: Right-aligned (blue bubbles)
              </p>
              <p className="text-xs text-purple-600">
                Vendor messages: Left-aligned (gray bubbles)
              </p>
            </div>
            <SharedMessageThread
              messages={mockMessages}
              currentUserId="couple-123"
              currentUserType={UserType.COUPLE}
              colorScheme="blue"
            />
          </div>
        </div>

        {/* Vendor's View */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 text-center">
            📸 Vendor's View
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[500px] overflow-hidden">
            <div className="p-3 bg-indigo-50 border-b border-indigo-100">
              <p className="text-sm text-indigo-700 font-medium">
                Your messages: Right-aligned (blue bubbles)
              </p>
              <p className="text-xs text-indigo-600">
                Couple messages: Left-aligned (gray bubbles)
              </p>
            </div>
            <SharedMessageThread
              messages={mockMessages}
              currentUserId="vendor-456"
              currentUserType={UserType.VENDOR}
              colorScheme="blue"
            />
          </div>
        </div>
      </div>

      {/* Alignment Guide */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">✅ Expected Behavior</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-purple-700 mb-2">Couple Dashboard:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Couple messages → Right side (blue bubbles)</li>
              <li>• Vendor messages → Left side (gray bubbles)</li>
              <li>• Timestamps align with message side</li>
              <li>• Delete button on left for own messages</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">Vendor Dashboard:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Vendor messages → Right side (blue bubbles)</li>
              <li>• Couple messages → Left side (gray bubbles)</li>
              <li>• Timestamps align with message side</li>
              <li>• Delete button on left for own messages</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-2">🔍 Debug Information</h3>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• Check browser console for alignment debug logs</p>
          <p>• Couple ID: couple-123 | Vendor ID: vendor-456</p>
          <p>• Message alignment is determined by comparing senderId with currentUserId</p>
          <p>• isOwnMessage = true → Right alignment | isOwnMessage = false → Left alignment</p>
        </div>
      </div>
    </div>
  );
};

export default ChatBubbleTest;