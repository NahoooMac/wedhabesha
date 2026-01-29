/**
 * @fileoverview Property Test: Message Ordering Consistency
 * 
 * Tests that message ordering is consistent across both couple and vendor
 * messaging interfaces. Validates that messages are always displayed in
 * chronological order regardless of interface or data variations.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-28
 * 
 * **Property 4: Message Ordering Consistency**
 * *For any* set of messages in a thread, retrieving the message history 
 * should always return messages in chronological order by creation timestamp
 * 
 * **Validates: Requirements 2.4**
 * 
 * Requirements satisfied:
 * - 2.4: Chronological message ordering across both interfaces
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { SharedMessageThread } from '../SharedMessageThread';
import { Message, MessageType, UserType, MessageStatus } from '../../../types/messaging';

// Test configuration
const NUM_RUNS = 20;
const MAX_MESSAGES = 10;

describe('Property 4: Message Ordering Consistency', () => {
  /**
   * Property Test: Messages are always displayed in chronological order
   * 
   * This test generates random sets of messages with various timestamps
   * and verifies that they are always displayed in chronological order
   * regardless of the input order or timestamp distribution.
   */
  it('should maintain chronological order for any set of messages', () => {
    fc.assert(
      fc.property(
        // Generate array of messages with random timestamps
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            threadId: fc.constant('test-thread'),
            senderId: fc.oneof(fc.constant('user1'), fc.constant('user2'), fc.constant('user3')),
            senderType: fc.oneof(fc.constant(UserType.COUPLE), fc.constant(UserType.VENDOR)),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            messageType: fc.constantFrom(MessageType.TEXT, MessageType.IMAGE, MessageType.DOCUMENT),
            status: fc.constantFrom(MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ),
            isDeleted: fc.boolean(),
            // Generate timestamps within a reasonable range (last 30 days)
            createdAt: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            }),
            updatedAt: fc.date({ 
              min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              max: new Date()
            }),
            attachments: fc.constant([])
          }),
          { minLength: 2, maxLength: 8 }
        ),
        fc.string({ minLength: 1, maxLength: 20 }), // currentUserId
        fc.constantFrom(UserType.COUPLE, UserType.VENDOR) // currentUserType
      ),
      (messages: Message[], currentUserId: string, currentUserType: UserType) => {
        // Ensure unique message IDs to avoid React key conflicts
        const uniqueMessages = messages.map((msg, index) => ({
          ...msg,
          id: `${msg.id}-${index}`,
          createdAt: new Date(msg.createdAt.getTime() + index) // Ensure unique timestamps
        }));

        // Shuffle messages to test ordering regardless of input order
        const shuffledMessages = [...uniqueMessages].sort(() => Math.random() - 0.5);

        // Render the SharedMessageThread component
        const { container } = render(
          <SharedMessageThread
            messages={shuffledMessages}
            currentUserId={currentUserId}
            currentUserType={currentUserType}
            colorScheme="blue"
          />
        );

        // Get all message elements
        const messageElements = container.querySelectorAll('[data-message-id]');
        
        if (messageElements.length === 0) {
          // If no messages are displayed (all deleted or filtered), that's acceptable
          return true;
        }

        // Extract message IDs in display order
        const displayedMessageIds = Array.from(messageElements).map(
          element => element.getAttribute('data-message-id')
        );

        // Get corresponding messages in display order
        const displayedMessages = displayedMessageIds.map(id => 
          uniqueMessages.find(msg => msg.id === id)
        ).filter(Boolean) as Message[];

        // Verify chronological ordering
        for (let i = 1; i < displayedMessages.length; i++) {
          const prevMessage = displayedMessages[i - 1];
          const currentMessage = displayedMessages[i];
          
          const prevTime = new Date(prevMessage.createdAt).getTime();
          const currentTime = new Date(currentMessage.createdAt).getTime();
          
          // Messages should be in chronological order (oldest first)
          if (prevTime > currentTime) {
            console.error('Message ordering violation:', {
              prevMessage: { id: prevMessage.id, createdAt: prevMessage.createdAt },
              currentMessage: { id: currentMessage.id, createdAt: currentMessage.createdAt },
              prevTime,
              currentTime
            });
            return false;
          }
        }

        return true;
      }
    ), { numRuns: NUM_RUNS });
  });

  /**
   * Property Test: Ordering consistency across different user types
   * 
   * Verifies that message ordering is consistent regardless of whether
   * the interface is viewed by a couple or vendor user.
   */
  it('should maintain consistent ordering across different user types', () => {
    fc.assert(
      fc.property(
        // Generate messages with mixed sender types
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            threadId: fc.constant('test-thread'),
            senderId: fc.oneof(fc.constant('couple1'), fc.constant('vendor1')),
            senderType: fc.oneof(fc.constant(UserType.COUPLE), fc.constant(UserType.VENDOR)),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            messageType: fc.constant(MessageType.TEXT),
            status: fc.constant(MessageStatus.SENT),
            isDeleted: fc.constant(false),
            createdAt: fc.date({ 
              min: new Date(Date.now() - 24 * 60 * 60 * 1000),
              max: new Date()
            }),
            updatedAt: fc.date({ 
              min: new Date(Date.now() - 24 * 60 * 60 * 1000),
              max: new Date()
            }),
            attachments: fc.constant([])
          }),
          { minLength: 3, maxLength: 10 }
        )
      ),
      (messages: Message[]) => {
        // Ensure unique message IDs and timestamps
        const uniqueMessages = messages.map((msg, index) => ({
          ...msg,
          id: `${msg.id}-${index}`,
          createdAt: new Date(msg.createdAt.getTime() + index * 1000) // 1 second apart
        }));

        // Render as couple user
        const { container: coupleContainer } = render(
          <SharedMessageThread
            messages={uniqueMessages}
            currentUserId="couple1"
            currentUserType={UserType.COUPLE}
            colorScheme="blue"
          />
        );

        // Render as vendor user
        const { container: vendorContainer } = render(
          <SharedMessageThread
            messages={uniqueMessages}
            currentUserId="vendor1"
            currentUserType={UserType.VENDOR}
            colorScheme="blue"
          />
        );

        // Get message order from both renderings
        const coupleMessageIds = Array.from(
          coupleContainer.querySelectorAll('[data-message-id]')
        ).map(el => el.getAttribute('data-message-id'));

        const vendorMessageIds = Array.from(
          vendorContainer.querySelectorAll('[data-message-id]')
        ).map(el => el.getAttribute('data-message-id'));

        // Both should have the same message order
        if (coupleMessageIds.length !== vendorMessageIds.length) {
          return false;
        }

        for (let i = 0; i < coupleMessageIds.length; i++) {
          if (coupleMessageIds[i] !== vendorMessageIds[i]) {
            console.error('Message order inconsistency between user types:', {
              coupleOrder: coupleMessageIds,
              vendorOrder: vendorMessageIds,
              differenceAt: i
            });
            return false;
          }
        }

        return true;
      }
    ), { numRuns: NUM_RUNS });
  });

  /**
   * Property Test: Ordering with edge cases
   * 
   * Tests message ordering with edge cases like identical timestamps,
   * deleted messages, and system messages.
   */
  it('should handle edge cases in message ordering', () => {
    fc.assert(
      fc.property(
        fc.record({
          // Base timestamp for all messages
          baseTimestamp: fc.date({ 
            min: new Date(Date.now() - 24 * 60 * 60 * 1000),
            max: new Date()
          }),
          // Number of messages with identical timestamps
          identicalTimestampCount: fc.integer({ min: 2, max: 3 }),
          // Number of regular messages
          regularMessageCount: fc.integer({ min: 2, max: 5 }),
          // Include deleted messages
          includeDeleted: fc.boolean(),
          // Include system messages
          includeSystem: fc.boolean()
        })
      ),
      ({ baseTimestamp, identicalTimestampCount, regularMessageCount, includeDeleted, includeSystem }) => {
        const messages: Message[] = [];
        let messageIndex = 0;

        // Add messages with identical timestamps
        for (let i = 0; i < identicalTimestampCount; i++) {
          messages.push({
            id: `identical-${messageIndex++}`,
            threadId: 'test-thread',
            senderId: `user${i % 2}`,
            senderType: i % 2 === 0 ? UserType.COUPLE : UserType.VENDOR,
            content: `Message with identical timestamp ${i}`,
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            isDeleted: false,
            createdAt: baseTimestamp, // Same timestamp
            updatedAt: baseTimestamp,
            attachments: []
          });
        }

        // Add regular messages with different timestamps
        for (let i = 0; i < regularMessageCount; i++) {
          messages.push({
            id: `regular-${messageIndex++}`,
            threadId: 'test-thread',
            senderId: `user${i % 2}`,
            senderType: i % 2 === 0 ? UserType.COUPLE : UserType.VENDOR,
            content: `Regular message ${i}`,
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            isDeleted: false,
            createdAt: new Date(baseTimestamp.getTime() + (i + 1) * 60000), // 1 minute apart
            updatedAt: new Date(baseTimestamp.getTime() + (i + 1) * 60000),
            attachments: []
          });
        }

        // Add deleted message if requested
        if (includeDeleted) {
          messages.push({
            id: `deleted-${messageIndex++}`,
            threadId: 'test-thread',
            senderId: 'user1',
            senderType: UserType.COUPLE,
            content: 'This message was deleted',
            messageType: MessageType.TEXT,
            status: MessageStatus.SENT,
            isDeleted: true,
            createdAt: new Date(baseTimestamp.getTime() + 30000), // 30 seconds after base
            updatedAt: new Date(baseTimestamp.getTime() + 30000),
            attachments: []
          });
        }

        // Add system message if requested
        if (includeSystem) {
          messages.push({
            id: `system-${messageIndex++}`,
            threadId: 'test-thread',
            senderId: 'system',
            senderType: UserType.VENDOR, // System messages need a type
            content: 'System notification',
            messageType: MessageType.SYSTEM,
            status: MessageStatus.SENT,
            isDeleted: false,
            createdAt: new Date(baseTimestamp.getTime() + 45000), // 45 seconds after base
            updatedAt: new Date(baseTimestamp.getTime() + 45000),
            attachments: []
          });
        }

        // Render the component
        const { container } = render(
          <SharedMessageThread
            messages={messages}
            currentUserId="user1"
            currentUserType={UserType.COUPLE}
            colorScheme="blue"
          />
        );

        // Get displayed messages
        const messageElements = container.querySelectorAll('[data-message-id]');
        
        if (messageElements.length === 0) {
          return true; // No messages displayed is acceptable
        }

        // Verify ordering
        const displayedMessageIds = Array.from(messageElements).map(
          element => element.getAttribute('data-message-id')
        );

        const displayedMessages = displayedMessageIds.map(id => 
          messages.find(msg => msg.id === id)
        ).filter(Boolean) as Message[];

        // Check chronological ordering (allowing for identical timestamps)
        for (let i = 1; i < displayedMessages.length; i++) {
          const prevMessage = displayedMessages[i - 1];
          const currentMessage = displayedMessages[i];
          
          const prevTime = new Date(prevMessage.createdAt).getTime();
          const currentTime = new Date(currentMessage.createdAt).getTime();
          
          // Current message should not be earlier than previous
          if (currentTime < prevTime) {
            console.error('Edge case ordering violation:', {
              prevMessage: { id: prevMessage.id, createdAt: prevMessage.createdAt },
              currentMessage: { id: currentMessage.id, createdAt: currentMessage.createdAt }
            });
            return false;
          }
        }

        return true;
      }
    ), { numRuns: NUM_RUNS });
  });
});