/**
 * Unit tests for audio utilities
 * 
 * Tests cover:
 * - Browser audio format detection
 * - Duration formatting
 * - Audio file validation
 * - Helper functions
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1
 */

import { vi } from 'vitest';
import {
  getSupportedMimeType,
  formatDuration,
  validateAudioFile,
  isMediaRecorderSupported,
  blobToFile,
  formatFileSize,
  getFileExtensionFromMimeType
} from '../audioUtils';

describe('audioUtils', () => {
  describe('getSupportedMimeType', () => {
    it('should return a valid MIME type string', () => {
      const mimeType = getSupportedMimeType();
      expect(typeof mimeType).toBe('string');
      expect(mimeType).toMatch(/^audio\//);
    });

    it('should return audio/webm as fallback when MediaRecorder is undefined', () => {
      const originalMediaRecorder = global.MediaRecorder;
      // @ts-expect-error - Testing undefined case
      delete global.MediaRecorder;
      
      const mimeType = getSupportedMimeType();
      expect(mimeType).toBe('audio/webm');
      
      // Restore
      global.MediaRecorder = originalMediaRecorder;
    });

    it('should prefer WebM with Opus codec if supported', () => {
      const mockIsTypeSupported = vi.fn((type: string) => {
        return type === 'audio/webm;codecs=opus';
      });

      global.MediaRecorder = {
        isTypeSupported: mockIsTypeSupported
      } as any;

      const mimeType = getSupportedMimeType();
      expect(mimeType).toBe('audio/webm;codecs=opus');
    });
  });

  describe('formatDuration', () => {
    it('should format 0 seconds as 00:00', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('should format seconds less than 60', () => {
      expect(formatDuration(5)).toBe('00:05');
      expect(formatDuration(30)).toBe('00:30');
      expect(formatDuration(59)).toBe('00:59');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatDuration(60)).toBe('01:00');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(125)).toBe('02:05');
      expect(formatDuration(599)).toBe('09:59');
    });

    it('should handle durations over 60 minutes', () => {
      expect(formatDuration(3600)).toBe('60:00');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatDuration(65.7)).toBe('01:05');
      expect(formatDuration(125.9)).toBe('02:05');
    });

    it('should handle negative numbers by returning 00:00', () => {
      expect(formatDuration(-5)).toBe('00:00');
      expect(formatDuration(-100)).toBe('00:00');
    });

    it('should handle invalid inputs', () => {
      expect(formatDuration(NaN)).toBe('00:00');
      expect(formatDuration(Infinity)).toBe('00:00');
      expect(formatDuration(-Infinity)).toBe('00:00');
    });

    it('should pad single digits with zero', () => {
      expect(formatDuration(9)).toBe('00:09');
      expect(formatDuration(69)).toBe('01:09');
    });
  });

  describe('validateAudioFile', () => {
    const createMockFile = (
      name: string,
      size: number,
      type: string
    ): File => {
      const blob = new Blob(['a'.repeat(size)], { type });
      return new File([blob], name, { type });
    };

    it('should validate a valid WebM file', () => {
      const file = createMockFile('test.webm', 1024 * 1024, 'audio/webm');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid MP3 file', () => {
      const file = createMockFile('test.mp3', 1024 * 1024, 'audio/mp3');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid MPEG file', () => {
      const file = createMockFile('test.mp3', 1024 * 1024, 'audio/mpeg');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files larger than 10MB by default', () => {
      const file = createMockFile('large.webm', 11 * 1024 * 1024, 'audio/webm');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
      expect(result.error).toContain('10.0MB');
    });

    it('should accept custom max size', () => {
      const file = createMockFile('test.webm', 6 * 1024 * 1024, 'audio/webm');
      const result = validateAudioFile(file, 5 * 1024 * 1024); // 5MB max
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
      expect(result.error).toContain('5.0MB');
    });

    it('should reject invalid file types', () => {
      const file = createMockFile('test.txt', 1024, 'text/plain');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject video files', () => {
      const file = createMockFile('test.mp4', 1024, 'video/mp4');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should handle null/undefined file', () => {
      const result = validateAudioFile(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should accept files at exactly the max size', () => {
      const file = createMockFile('test.webm', 10 * 1024 * 1024, 'audio/webm');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(true);
    });

    it('should accept OGG files', () => {
      const file = createMockFile('test.ogg', 1024 * 1024, 'audio/ogg');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(true);
    });

    it('should accept WAV files', () => {
      const file = createMockFile('test.wav', 1024 * 1024, 'audio/wav');
      const result = validateAudioFile(file);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('isMediaRecorderSupported', () => {
    it('should return true when MediaRecorder is supported', () => {
      global.MediaRecorder = vi.fn() as any;
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn()
      } as any;

      expect(isMediaRecorderSupported()).toBe(true);
    });

    it('should return false when MediaRecorder is undefined', () => {
      const originalMediaRecorder = global.MediaRecorder;
      // @ts-expect-error - Testing undefined case
      delete global.MediaRecorder;

      expect(isMediaRecorderSupported()).toBe(false);

      // Restore
      global.MediaRecorder = originalMediaRecorder;
    });

    it('should return false when mediaDevices is undefined', () => {
      global.MediaRecorder = vi.fn() as any;
      const originalMediaDevices = global.navigator.mediaDevices;
      // @ts-expect-error - Testing undefined case
      delete global.navigator.mediaDevices;

      expect(isMediaRecorderSupported()).toBe(false);

      // Restore
      global.navigator.mediaDevices = originalMediaDevices;
    });
  });

  describe('blobToFile', () => {
    it('should convert a Blob to a File', () => {
      const blob = new Blob(['test content'], { type: 'audio/webm' });
      const file = blobToFile(blob, 'test.webm');

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test.webm');
      expect(file.type).toBe('audio/webm');
      expect(file.size).toBe(blob.size);
    });

    it('should set lastModified timestamp', () => {
      const blob = new Blob(['test'], { type: 'audio/mp3' });
      const beforeTime = Date.now();
      const file = blobToFile(blob, 'test.mp3');
      const afterTime = Date.now();

      expect(file.lastModified).toBeGreaterThanOrEqual(beforeTime);
      expect(file.lastModified).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('formatFileSize', () => {
    it('should format 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1234567)).toBe('1.18 MB');
    });
  });

  describe('getFileExtensionFromMimeType', () => {
    it('should extract extension from WebM MIME type', () => {
      expect(getFileExtensionFromMimeType('audio/webm')).toBe('webm');
    });

    it('should extract extension from MP3 MIME type', () => {
      expect(getFileExtensionFromMimeType('audio/mp3')).toBe('mp3');
      expect(getFileExtensionFromMimeType('audio/mpeg')).toBe('mp3');
    });

    it('should extract extension from OGG MIME type', () => {
      expect(getFileExtensionFromMimeType('audio/ogg')).toBe('ogg');
    });

    it('should extract extension from MP4 MIME type', () => {
      expect(getFileExtensionFromMimeType('audio/mp4')).toBe('mp4');
    });

    it('should extract extension from WAV MIME type', () => {
      expect(getFileExtensionFromMimeType('audio/wav')).toBe('wav');
    });

    it('should handle MIME types with codecs', () => {
      expect(getFileExtensionFromMimeType('audio/webm;codecs=opus')).toBe('webm');
      expect(getFileExtensionFromMimeType('audio/ogg;codecs=opus')).toBe('ogg');
    });

    it('should return webm as fallback for unknown types', () => {
      expect(getFileExtensionFromMimeType('audio/unknown')).toBe('webm');
      expect(getFileExtensionFromMimeType('video/mp4')).toBe('webm');
    });

    it('should handle MIME types with extra whitespace', () => {
      expect(getFileExtensionFromMimeType('audio/webm ; codecs=opus')).toBe('webm');
    });
  });
});
