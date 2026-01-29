const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/database');

/**
 * Security scanner for file uploads
 * Performs basic malware detection and file integrity checks
 */
class SecurityScanner {
  constructor() {
    // Known malicious file signatures (magic bytes)
    this.MALICIOUS_SIGNATURES = [
      // PE executable signatures
      Buffer.from([0x4D, 0x5A]), // MZ (DOS/Windows executable)
      // ELF executable
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF
      // Mach-O executable
      Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O 32-bit
      Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O 64-bit
    ];

    // Expected file signatures for allowed types
    this.VALID_SIGNATURES = {
      'image/jpeg': [
        Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
      ],
      'image/png': [
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG
      ],
      'image/gif': [
        Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
        Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
      ],
      'application/pdf': [
        Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
      ]
    };
  }

  /**
   * Check if buffer starts with any of the given signatures
   * @private
   */
  _hasSignature(buffer, signatures) {
    return signatures.some(sig => {
      if (buffer.length < sig.length) return false;
      return buffer.slice(0, sig.length).equals(sig);
    });
  }

  /**
   * Scan file buffer for malicious content
   * 
   * @param {Buffer} fileBuffer - File data to scan
   * @param {string} mimetype - Expected MIME type
   * @returns {{safe: boolean, reason?: string}}
   */
  scanFile(fileBuffer, mimetype) {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return {
          safe: false,
          reason: 'Empty file buffer'
        };
      }

      // Check for malicious signatures
      if (this._hasSignature(fileBuffer, this.MALICIOUS_SIGNATURES)) {
        return {
          safe: false,
          reason: 'File contains executable code signature'
        };
      }

      // Verify file signature matches expected type
      const expectedSignatures = this.VALID_SIGNATURES[mimetype];
      if (expectedSignatures) {
        if (!this._hasSignature(fileBuffer, expectedSignatures)) {
          return {
            safe: false,
            reason: 'File signature does not match declared type'
          };
        }
      }

      // Check for embedded scripts in PDFs (basic check)
      if (mimetype === 'application/pdf') {
        const pdfContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 10000));
        if (pdfContent.includes('/JavaScript') || pdfContent.includes('/JS')) {
          return {
            safe: false,
            reason: 'PDF contains potentially malicious JavaScript'
          };
        }
      }

      // Check for suspicious patterns in images
      if (mimetype.startsWith('image/')) {
        // Look for script tags or executable patterns
        const imageContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 5000));
        if (imageContent.includes('<script') || imageContent.includes('<?php')) {
          return {
            safe: false,
            reason: 'Image contains embedded script code'
          };
        }
      }

      return {
        safe: true
      };

    } catch (error) {
      console.error('❌ Security scan failed:', error);
      return {
        safe: false,
        reason: 'Security scan failed'
      };
    }
  }

  /**
   * Validate file name for security issues
   * 
   * @param {string} filename - Original filename
   * @returns {{valid: boolean, reason?: string}}
   */
  validateFilename(filename) {
    try {
      if (!filename || typeof filename !== 'string') {
        return {
          valid: false,
          reason: 'Invalid filename'
        };
      }

      // Check for path traversal attempts
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return {
          valid: false,
          reason: 'Filename contains path traversal characters'
        };
      }

      // Check for null bytes
      if (filename.includes('\0')) {
        return {
          valid: false,
          reason: 'Filename contains null bytes'
        };
      }

      // Check for excessively long filenames
      if (filename.length > 255) {
        return {
          valid: false,
          reason: 'Filename exceeds maximum length'
        };
      }

      return {
        valid: true
      };

    } catch (error) {
      return {
        valid: false,
        reason: 'Filename validation failed'
      };
    }
  }
}

const securityScanner = new SecurityScanner();

/**
 * FileUploadService - Manages file uploads and attachments for messaging
 * 
 * Handles file validation, storage, thumbnail generation, and security checks
 * Supports images (JPEG, PNG, GIF) up to 10MB and PDFs up to 25MB
 */
class FileUploadService {
  constructor() {
    // File size limits in bytes
    this.MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    this.MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB
    
    // Allowed file types
    this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
    this.ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
    this.ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
    this.ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf'];
    
    // Upload directory
    this.UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'messages');
    this.THUMBNAIL_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails');
    
    // Thumbnail settings
    this.THUMBNAIL_MAX_WIDTH = 200;
    this.THUMBNAIL_MAX_HEIGHT = 200;
    
    console.log('📁 File upload service initialized');
    this._ensureUploadDirectories();
  }

  /**
   * Ensure upload directories exist
   * @private
   */
  async _ensureUploadDirectories() {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      await fs.mkdir(this.THUMBNAIL_DIR, { recursive: true });
      console.log('✅ Upload directories ready');
    } catch (error) {
      console.error('❌ Failed to create upload directories:', error);
    }
  }

  /**
   * Validate file based on type and size
   * 
   * @param {object} file - File object with mimetype, size, and originalname
   * @returns {{valid: boolean, error?: string, fileType?: string}}
   */
  validateFile(file) {
    try {
      if (!file) {
        return {
          valid: false,
          error: 'No file provided'
        };
      }

      // Check if file has required properties
      if (!file.mimetype || !file.size || !file.originalname) {
        return {
          valid: false,
          error: 'Invalid file object'
        };
      }

      // Validate filename for security issues
      const filenameValidation = securityScanner.validateFilename(file.originalname);
      if (!filenameValidation.valid) {
        return {
          valid: false,
          error: filenameValidation.reason
        };
      }

      const mimetype = file.mimetype.toLowerCase();
      const extension = path.extname(file.originalname).toLowerCase();

      // Determine file type and validate
      if (this.ALLOWED_IMAGE_TYPES.includes(mimetype) && 
          this.ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
        
        // Validate image size
        if (file.size > this.MAX_IMAGE_SIZE) {
          return {
            valid: false,
            error: `Image size exceeds maximum limit of ${this.MAX_IMAGE_SIZE / (1024 * 1024)}MB`
          };
        }

        return {
          valid: true,
          fileType: 'image'
        };

      } else if (this.ALLOWED_DOCUMENT_TYPES.includes(mimetype) && 
                 this.ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
        
        // Validate document size
        if (file.size > this.MAX_DOCUMENT_SIZE) {
          return {
            valid: false,
            error: `Document size exceeds maximum limit of ${this.MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`
          };
        }

        return {
          valid: true,
          fileType: 'document'
        };

      } else {
        return {
          valid: false,
          error: `Unsupported file type. Allowed: ${[...this.ALLOWED_IMAGE_EXTENSIONS, ...this.ALLOWED_DOCUMENT_EXTENSIONS].join(', ')}`
        };
      }

    } catch (error) {
      console.error('❌ File validation failed:', error);
      return {
        valid: false,
        error: 'File validation failed'
      };
    }
  }

  /**
   * Generate a unique filename
   * 
   * @param {string} originalName - Original filename
   * @returns {string} - Unique filename
   * @private
   */
  _generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${randomString}_${baseName}${extension}`;
  }

  /**
   * Save file to disk
   * 
   * @param {Buffer} fileBuffer - File data
   * @param {string} filename - Filename to save as
   * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
   * @private
   */
  async _saveFile(fileBuffer, filename) {
    try {
      const filePath = path.join(this.UPLOAD_DIR, filename);
      await fs.writeFile(filePath, fileBuffer);
      
      return {
        success: true,
        filePath: filePath
      };
    } catch (error) {
      console.error('❌ Failed to save file:', error);
      return {
        success: false,
        error: `Failed to save file: ${error.message}`
      };
    }
  }

  /**
   * Generate thumbnail for image
   * 
   * @param {string} imagePath - Path to original image
   * @param {string} thumbnailFilename - Filename for thumbnail
   * @returns {Promise<{success: boolean, thumbnailPath?: string, error?: string}>}
   */
  async generateThumbnail(imagePath, thumbnailFilename) {
    try {
      // For now, we'll implement a basic thumbnail generation
      // In production, you'd use a library like 'sharp' for image processing
      
      // Read the original image
      const imageBuffer = await fs.readFile(imagePath);
      
      // For this implementation, we'll just copy the file as a placeholder
      // In production, use sharp or similar library to resize
      const thumbnailPath = path.join(this.THUMBNAIL_DIR, thumbnailFilename);
      await fs.writeFile(thumbnailPath, imageBuffer);
      
      console.log(`📸 Generated thumbnail: ${thumbnailFilename}`);
      
      return {
        success: true,
        thumbnailPath: thumbnailPath
      };
    } catch (error) {
      console.error('❌ Failed to generate thumbnail:', error);
      return {
        success: false,
        error: `Failed to generate thumbnail: ${error.message}`
      };
    }
  }

  /**
   * Upload file and create attachment record
   * 
   * @param {object} file - File object from multer
   * @param {string|number} messageId - Message ID to attach file to
   * @returns {Promise<{success: boolean, attachment?: object, error?: string}>}
   */
  async uploadFile(file, messageId) {
    try {
      // Validate inputs
      if (!messageId) {
        return {
          success: false,
          error: 'Message ID is required'
        };
      }

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const fileType = validation.fileType;

      // Perform security scan on file content
      const scanResult = securityScanner.scanFile(file.buffer, file.mimetype);
      if (!scanResult.safe) {
        console.warn(`⚠️ Security scan failed for file: ${file.originalname} - ${scanResult.reason}`);
        return {
          success: false,
          error: `File rejected by security scan: ${scanResult.reason}`
        };
      }

      // Generate unique filename
      const uniqueFilename = this._generateUniqueFilename(file.originalname);

      // Save file to disk
      const saveResult = await this._saveFile(file.buffer, uniqueFilename);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        };
      }

      // Generate relative URL for file access
      const fileUrl = `/uploads/messages/${uniqueFilename}`;

      // Generate thumbnail for images
      let thumbnailUrl = null;
      if (fileType === 'image') {
        const thumbnailFilename = `thumb_${uniqueFilename}`;
        const thumbnailResult = await this.generateThumbnail(
          saveResult.filePath,
          thumbnailFilename
        );
        
        if (thumbnailResult.success) {
          thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
        }
      }

      // Insert attachment record into database
      const insertQuery = `
        INSERT INTO message_attachments (
          message_id, file_name, file_type, file_size,
          file_url, thumbnail_url, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const result = await query(insertQuery, [
        messageId,
        file.originalname,
        file.mimetype,
        file.size,
        fileUrl,
        thumbnailUrl
      ]);

      // Get the inserted attachment ID
      const attachmentId = result.lastID || result.rows[0]?.id;

      if (!attachmentId) {
        throw new Error('Failed to retrieve attachment ID after insert');
      }

      // Retrieve the complete attachment record
      const attachmentQuery = `
        SELECT id, message_id, file_name, file_type, file_size,
               file_url, thumbnail_url, uploaded_at
        FROM message_attachments
        WHERE id = ?
      `;

      const attachmentResult = await query(attachmentQuery, [attachmentId]);
      const attachment = attachmentResult.rows[0];

      console.log(`✅ File uploaded successfully: ${file.originalname} (${fileType})`);

      return {
        success: true,
        attachment: {
          id: attachment.id,
          messageId: attachment.message_id,
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          fileSize: attachment.file_size,
          url: attachment.file_url,
          thumbnailUrl: attachment.thumbnail_url,
          uploadedAt: attachment.uploaded_at
        }
      };

    } catch (error) {
      console.error('❌ Failed to upload file:', error);
      return {
        success: false,
        error: `Failed to upload file: ${error.message}`
      };
    }
  }

  /**
   * Get file URL for download
   * 
   * @param {string|number} attachmentId - Attachment identifier
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async getFileUrl(attachmentId) {
    try {
      if (!attachmentId) {
        return {
          success: false,
          error: 'Attachment ID is required'
        };
      }

      // Get attachment from database
      const attachmentQuery = `
        SELECT file_url, file_name
        FROM message_attachments
        WHERE id = ?
      `;

      const result = await query(attachmentQuery, [attachmentId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Attachment not found'
        };
      }

      const attachment = result.rows[0];

      return {
        success: true,
        url: attachment.file_url,
        fileName: attachment.file_name
      };

    } catch (error) {
      console.error('❌ Failed to get file URL:', error);
      return {
        success: false,
        error: `Failed to retrieve file URL: ${error.message}`
      };
    }
  }

  /**
   * Delete file and attachment record
   * 
   * @param {string|number} attachmentId - Attachment identifier
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFile(attachmentId) {
    try {
      if (!attachmentId) {
        return {
          success: false,
          error: 'Attachment ID is required'
        };
      }

      // Get attachment details
      const attachmentQuery = `
        SELECT file_url, thumbnail_url
        FROM message_attachments
        WHERE id = ?
      `;

      const result = await query(attachmentQuery, [attachmentId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Attachment not found'
        };
      }

      const attachment = result.rows[0];

      // Delete physical files
      try {
        const filePath = path.join(__dirname, '..', attachment.file_url);
        await fs.unlink(filePath);
        
        if (attachment.thumbnail_url) {
          const thumbnailPath = path.join(__dirname, '..', attachment.thumbnail_url);
          await fs.unlink(thumbnailPath);
        }
      } catch (fileError) {
        console.warn('⚠️ Failed to delete physical files:', fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete attachment record from database
      const deleteQuery = `
        DELETE FROM message_attachments
        WHERE id = ?
      `;

      await query(deleteQuery, [attachmentId]);

      console.log(`🗑️ Deleted attachment ${attachmentId}`);

      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return {
        success: false,
        error: `Failed to delete file: ${error.message}`
      };
    }
  }

  /**
   * Get attachments for a message
   * 
   * @param {string|number} messageId - Message identifier
   * @returns {Promise<{success: boolean, attachments?: Array, error?: string}>}
   */
  async getMessageAttachments(messageId) {
    try {
      if (!messageId) {
        return {
          success: false,
          error: 'Message ID is required'
        };
      }

      const attachmentsQuery = `
        SELECT id, message_id, file_name, file_type, file_size,
               file_url, thumbnail_url, uploaded_at
        FROM message_attachments
        WHERE message_id = ?
        ORDER BY uploaded_at ASC
      `;

      const result = await query(attachmentsQuery, [messageId]);

      const attachments = result.rows.map(att => ({
        id: att.id,
        messageId: att.message_id,
        fileName: att.file_name,
        fileType: att.file_type,
        fileSize: att.file_size,
        url: att.file_url,
        thumbnailUrl: att.thumbnail_url,
        uploadedAt: att.uploaded_at
      }));

      return {
        success: true,
        attachments: attachments
      };

    } catch (error) {
      console.error('❌ Failed to get message attachments:', error);
      return {
        success: false,
        error: `Failed to retrieve attachments: ${error.message}`
      };
    }
  }

  /**
   * Get configuration
   * 
   * @returns {object}
   */
  getConfig() {
    return {
      maxImageSize: this.MAX_IMAGE_SIZE,
      maxDocumentSize: this.MAX_DOCUMENT_SIZE,
      allowedImageTypes: this.ALLOWED_IMAGE_TYPES,
      allowedImageExtensions: this.ALLOWED_IMAGE_EXTENSIONS,
      allowedDocumentTypes: this.ALLOWED_DOCUMENT_TYPES,
      allowedDocumentExtensions: this.ALLOWED_DOCUMENT_EXTENSIONS,
      uploadDir: this.UPLOAD_DIR,
      thumbnailDir: this.THUMBNAIL_DIR
    };
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService();

module.exports = fileUploadService;
