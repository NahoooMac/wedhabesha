const fileUploadService = require('../services/fileUploadService');

/**
 * File Upload Security Tests
 * Task 14: Security and authorization testing - File upload validation
 * **Validates: Requirements 11.4**
 */
describe('File Upload Security Tests', () => {
  describe('File Type Validation', () => {
    it('should accept valid image files', () => {
      const validImageFile = {
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
        originalname: 'photo.jpg',
        buffer: Buffer.from('fake jpeg data')
      };

      const result = fileUploadService.validateFile(validImageFile);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('image');
    });

    it('should reject executable files', () => {
      const executableFile = {
        mimetype: 'application/x-executable',
        size: 1024,
        originalname: 'malware.exe',
        buffer: Buffer.from('MZ')
      };

      const result = fileUploadService.validateFile(executableFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should reject oversized files', () => {
      const oversizedFile = {
        mimetype: 'image/jpeg',
        size: 15 * 1024 * 1024, // 15MB (over 10MB limit)
        originalname: 'huge.jpg',
        buffer: Buffer.from('fake data')
      };

      const result = fileUploadService.validateFile(oversizedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum limit');
    });

    it('should reject path traversal filenames', () => {
      const pathTraversalFile = {
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: '../../../etc/passwd',
        buffer: Buffer.from('fake data')
      };

      const result = fileUploadService.validateFile(pathTraversalFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('path traversal');
    });
  });
});