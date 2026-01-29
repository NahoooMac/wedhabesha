const fc = require('fast-check');
const messageService = require('../services/messageService');
const fileUploadService = require('../services/fileUploadService');
const { query } = require('../config/database');

/**
 * Property-Based Tests for Attachment Handling
 * 
 * Feature: vendor-dashboard-messaging-enhancement
 * Property 7: Attachment Handling
 * 
 * Validates: Requirements 3.4
 * 
 * Tests that message attachments are properly preserved and displayed within conversation threads:
 * - Attachments are correctly associated with messages
 * - Multiple attachments per message are supported
 * - Attachment metadata is preserved (filename, size, type)
 * - Attachments remain accessible after message retrieval
 * - Deleted messages don't affect attachment integrity for other participants
 */

describe('Property 7: Attachment Handling', () => {
  let testThreadId;
  let testCoupleId;
  let testVendorId;

  beforeAll(async () => {
    // Create test thread for attachment tests
    testCoupleId = 'test-couple-attach-' + Date.now();
    testVendorId = 'test-vendor-attach-' + Date.now();

    const threadResult = await query(
      `INSERT INTO message_threads (couple_id, vendor_id, created_at, updated_at, last_message_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [testCoupleId, testVendorId]
    );

    testThreadId = threadResult.lastID || threadResult.rows[0]?.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testThreadId) {
      await query('DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM messages WHERE thread_id = ?)', [testThreadId]);
      await query('DELETE FROM messages WHERE thread_id = ?', [testThreadId]);
      await query('DELETE FROM message_threads WHERE id = ?', [testThreadId]);
    }
  });

  // Helper to create mock file with proper signatures
  const createMockFile = (mimetype, size, originalname) => {
    // Ensure minimum size for file signatures
    const minSize = Math.max(size, 512);
    const buffer = Buffer.alloc(minSize);
    
    // Add appropriate file signature with more complete headers
    if (mimetype === 'image/jpeg') {
      // JPEG signature: FF D8 FF E0 (SOI + APP0)
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01
      ]);
      jpegHeader.copy(buffer, 0);
      // Add EOI marker at the end
      buffer[minSize - 2] = 0xFF;
      buffer[minSize - 1] = 0xD9;
    } else if (mimetype === 'image/png') {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
      ]);
      pngHeader.copy(buffer, 0);
    } else if (mimetype === 'image/gif') {
      // GIF signature: GIF89a
      const gifHeader = Buffer.from('GIF89a');
      gifHeader.copy(buffer, 0);
    } else if (mimetype === 'application/pdf') {
      // PDF signature: %PDF-1.4
      const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
      pdfHeader.copy(buffer, 0);
      // Add EOF marker
      const pdfFooter = Buffer.from('\n%%EOF\n');
      pdfFooter.copy(buffer, minSize - pdfFooter.length);
    }
    
    return {
      mimetype,
      size: minSize,
      originalname,
      buffer
    };
  };

  describe('Attachment Association with Messages', () => {
    
    it('should preserve attachment metadata when associated with a message', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          mimetype: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
          filename: fc.constantFrom('photo.jpg', 'document.pdf', 'image.png'),
          size: fc.integer({ min: 1024, max: 5 * 1024 * 1024 })
        }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async ({ mimetype, filename, size }, messageContent) => {
          // Send a message
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testCoupleId,
            'couple',
            messageContent,
            mimetype.startsWith('image/') ? 'image' : 'document'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload attachment
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) return false;

          const attachment = uploadResult.attachment;

          // Verify attachment metadata is preserved
          const metadataPreserved = 
            attachment.fileName === filename &&
            attachment.fileType === mimetype &&
            attachment.fileSize === size &&
            attachment.messageId === messageId;

          // Clean up
          await fileUploadService.deleteFile(attachment.id);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return metadataPreserved;
        }
      ), { numRuns: 50 }); // Reduced runs for async operations
    });

    it('should support multiple attachments per message', () => {
      fc.assert(fc.asyncProperty(
        fc.array(
          fc.record({
            mimetype: fc.constantFrom('image/jpeg', 'image/png'),
            filename: fc.constantFrom('photo1.jpg', 'photo2.png', 'image.jpg'),
            size: fc.integer({ min: 1024, max: 2 * 1024 * 1024 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (attachmentSpecs, messageContent) => {
          // Send a message
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testVendorId,
            'vendor',
            messageContent,
            'image'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;
          const uploadedAttachments = [];

          // Upload multiple attachments
          for (const spec of attachmentSpecs) {
            const mockFile = createMockFile(spec.mimetype, spec.size, spec.filename);
            const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);
            
            if (!uploadResult.success) {
              // Clean up and fail
              for (const att of uploadedAttachments) {
                await fileUploadService.deleteFile(att.id);
              }
              await query('DELETE FROM messages WHERE id = ?', [messageId]);
              return false;
            }
            
            uploadedAttachments.push(uploadResult.attachment);
          }

          // Retrieve attachments for the message
          const retrieveResult = await fileUploadService.getMessageAttachments(messageId);

          const allAttachmentsRetrieved = 
            retrieveResult.success &&
            retrieveResult.attachments.length === attachmentSpecs.length;

          // Clean up
          for (const att of uploadedAttachments) {
            await fileUploadService.deleteFile(att.id);
          }
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return allAttachmentsRetrieved;
        }
      ), { numRuns: 30 }); // Reduced runs for complex async operations
    });
  });

  describe('Attachment Retrieval and Accessibility', () => {
    
    it('should maintain attachment accessibility after message retrieval', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          mimetype: fc.constantFrom('image/jpeg', 'application/pdf'),
          filename: fc.constantFrom('test.jpg', 'doc.pdf'),
          size: fc.integer({ min: 1024, max: 3 * 1024 * 1024 })
        }),
        fc.string({ minLength: 5, maxLength: 100 }),
        async ({ mimetype, filename, size }, messageContent) => {
          // Send message with attachment
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testCoupleId,
            'couple',
            messageContent,
            mimetype.startsWith('image/') ? 'image' : 'document'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload attachment
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          const attachmentId = uploadResult.attachment.id;

          // Retrieve messages from thread
          const messagesResult = await messageService.getMessages(
            testThreadId,
            testCoupleId,
            'couple',
            50,
            0
          );

          if (!messagesResult.success) {
            await fileUploadService.deleteFile(attachmentId);
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          // Find our message
          const retrievedMessage = messagesResult.messages.find(m => m.id === messageId);

          // Get attachment URL
          const urlResult = await fileUploadService.getFileUrl(attachmentId);

          const attachmentAccessible = 
            retrievedMessage !== undefined &&
            urlResult.success &&
            urlResult.url !== undefined &&
            urlResult.fileName === filename;

          // Clean up
          await fileUploadService.deleteFile(attachmentId);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return attachmentAccessible;
        }
      ), { numRuns: 40 });
    });

    it('should preserve attachment URLs across multiple retrievals', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          mimetype: fc.constantFrom('image/png', 'application/pdf'),
          filename: fc.constantFrom('stable.png', 'stable.pdf'),
          size: fc.integer({ min: 2048, max: 4 * 1024 * 1024 })
        }),
        fc.string({ minLength: 10, maxLength: 80 }),
        fc.integer({ min: 2, max: 5 }),
        async ({ mimetype, filename, size }, messageContent, retrievalCount) => {
          // Send message with attachment
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testVendorId,
            'vendor',
            messageContent,
            mimetype.startsWith('image/') ? 'image' : 'document'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload attachment
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          const attachmentId = uploadResult.attachment.id;
          const originalUrl = uploadResult.attachment.url;

          // Retrieve URL multiple times
          const urls = [];
          for (let i = 0; i < retrievalCount; i++) {
            const urlResult = await fileUploadService.getFileUrl(attachmentId);
            if (!urlResult.success) {
              await fileUploadService.deleteFile(attachmentId);
              await query('DELETE FROM messages WHERE id = ?', [messageId]);
              return false;
            }
            urls.push(urlResult.url);
          }

          // Verify all URLs are consistent
          const urlsConsistent = urls.every(url => url === originalUrl);

          // Clean up
          await fileUploadService.deleteFile(attachmentId);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return urlsConsistent;
        }
      ), { numRuns: 30 });
    });
  });

  describe('Attachment Integrity with Message Deletion', () => {
    
    it('should maintain attachment data when message is soft-deleted', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          mimetype: fc.constantFrom('image/jpeg', 'application/pdf'),
          filename: fc.constantFrom('preserve.jpg', 'preserve.pdf'),
          size: fc.integer({ min: 1024, max: 3 * 1024 * 1024 })
        }),
        fc.string({ minLength: 5, maxLength: 100 }),
        async ({ mimetype, filename, size }, messageContent) => {
          // Send message with attachment
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testCoupleId,
            'couple',
            messageContent,
            mimetype.startsWith('image/') ? 'image' : 'document'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload attachment
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          const attachmentId = uploadResult.attachment.id;

          // Soft delete the message
          const deleteResult = await messageService.deleteMessage(
            messageId,
            testCoupleId,
            'couple'
          );

          if (!deleteResult.success) {
            await fileUploadService.deleteFile(attachmentId);
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          // Verify attachment still exists in database
          const attachmentResult = await fileUploadService.getMessageAttachments(messageId);

          const attachmentPreserved = 
            attachmentResult.success &&
            attachmentResult.attachments.length === 1 &&
            attachmentResult.attachments[0].id === attachmentId;

          // Clean up
          await fileUploadService.deleteFile(attachmentId);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return attachmentPreserved;
        }
      ), { numRuns: 40 });
    });

    it('should not expose deleted message attachments to unauthorized users', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          mimetype: fc.constantFrom('image/png'),
          filename: fc.constantFrom('private.png'),
          size: fc.integer({ min: 2048, max: 2 * 1024 * 1024 })
        }),
        fc.string({ minLength: 10, maxLength: 50 }),
        async ({ mimetype, filename, size }, messageContent) => {
          // Send message with attachment
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testCoupleId,
            'couple',
            messageContent,
            'image'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload attachment
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          const attachmentId = uploadResult.attachment.id;

          // Soft delete the message
          await messageService.deleteMessage(messageId, testCoupleId, 'couple');

          // Try to retrieve messages (deleted messages should not appear)
          const messagesResult = await messageService.getMessages(
            testThreadId,
            testVendorId,
            'vendor',
            50,
            0
          );

          // Deleted message should not be in the list
          const deletedMessageNotVisible = 
            messagesResult.success &&
            !messagesResult.messages.some(m => m.id === messageId);

          // Clean up
          await fileUploadService.deleteFile(attachmentId);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return deletedMessageNotVisible;
        }
      ), { numRuns: 30 });
    });
  });

  describe('Attachment Type Handling', () => {
    
    it('should correctly identify and handle image attachments', () => {
      fc.assert(fc.asyncProperty(
        fc.constantFrom('image/jpeg', 'image/png', 'image/gif'),
        fc.constantFrom('photo.jpg', 'image.png', 'animation.gif'),
        fc.integer({ min: 1024, max: 5 * 1024 * 1024 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        async (mimetype, filename, size, messageContent) => {
          // Send message
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testVendorId,
            'vendor',
            messageContent,
            'image'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload image attachment
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          const attachment = uploadResult.attachment;

          // Verify image-specific properties
          const isImageType = 
            attachment.fileType.startsWith('image/') &&
            attachment.thumbnailUrl !== null; // Images should have thumbnails

          // Clean up
          await fileUploadService.deleteFile(attachment.id);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return isImageType;
        }
      ), { numRuns: 40 });
    });

    it('should correctly identify and handle document attachments', () => {
      fc.assert(fc.asyncProperty(
        fc.constantFrom('document.pdf', 'contract.pdf', 'proposal.pdf'),
        fc.integer({ min: 2048, max: 10 * 1024 * 1024 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (filename, size, messageContent) => {
          // Send message
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testCoupleId,
            'couple',
            messageContent,
            'document'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Upload PDF attachment
          const mockFile = createMockFile('application/pdf', size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, messageId);

          if (!uploadResult.success) {
            await query('DELETE FROM messages WHERE id = ?', [messageId]);
            return false;
          }

          const attachment = uploadResult.attachment;

          // Verify document-specific properties
          const isDocumentType = 
            attachment.fileType === 'application/pdf' &&
            attachment.fileName.endsWith('.pdf');

          // Clean up
          await fileUploadService.deleteFile(attachment.id);
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return isDocumentType;
        }
      ), { numRuns: 40 });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    
    it('should handle messages without attachments gracefully', () => {
      fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (messageContent) => {
          // Send message without attachment
          const messageResult = await messageService.sendMessage(
            testThreadId,
            testCoupleId,
            'couple',
            messageContent,
            'text'
          );

          if (!messageResult.success) return false;

          const messageId = messageResult.message.id;

          // Try to get attachments for message with none
          const attachmentResult = await fileUploadService.getMessageAttachments(messageId);

          const handledGracefully = 
            attachmentResult.success &&
            Array.isArray(attachmentResult.attachments) &&
            attachmentResult.attachments.length === 0;

          // Clean up
          await query('DELETE FROM messages WHERE id = ?', [messageId]);

          return handledGracefully;
        }
      ), { numRuns: 50 });
    });

    it('should reject attachment upload for non-existent message', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          mimetype: fc.constantFrom('image/jpeg', 'application/pdf'),
          filename: fc.constantFrom('test.jpg', 'test.pdf'),
          size: fc.integer({ min: 1024, max: 2 * 1024 * 1024 })
        }),
        async ({ mimetype, filename, size }) => {
          const nonExistentMessageId = 'non-existent-' + Date.now();
          
          const mockFile = createMockFile(mimetype, size, filename);
          const uploadResult = await fileUploadService.uploadFile(mockFile, nonExistentMessageId);

          // Upload should fail for non-existent message
          return !uploadResult.success;
        }
      ), { numRuns: 30 });
    });
  });
});
