/**
 * Audio Utilities for Voice Message Features
 * 
 * This file provides utility functions for audio handling including:
 * - Browser audio format detection
 * - Duration formatting
 * - Audio file validation
 * 
 * Requirements: 4.1, 4.2, 5.1
 */

/**
 * Detects the best supported audio MIME type for recording
 * Tries formats in order of preference: WebM with Opus, WebM, OGG with Opus, MP4, MPEG
 * 
 * @returns The supported MIME type string, or 'audio/webm' as fallback
 * 
 * Validates: Requirements 4.1, 4.2, 5.1
 */
export const getSupportedMimeType = (): string => {
  // Check if MediaRecorder is supported
  if (typeof MediaRecorder === 'undefined') {
    return 'audio/webm'; // Return default even if unsupported
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Default fallback
  return 'audio/webm';
};

/**
 * Formats duration in seconds to MM:SS format
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted string in MM:SS format
 * 
 * Examples:
 * - formatDuration(0) => "00:00"
 * - formatDuration(65) => "01:05"
 * - formatDuration(3661) => "61:01"
 * 
 * Validates: Requirements 2.4, 3.1
 */
export const formatDuration = (seconds: number): string => {
  // Handle invalid inputs
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = mins.toString().padStart(2, '0');
  const formattedSecs = secs.toString().padStart(2, '0');

  return `${formattedMins}:${formattedSecs}`;
};

/**
 * Validates an audio file for size and type
 * 
 * @param file - The audio file to validate
 * @param maxSizeBytes - Maximum file size in bytes (default: 10MB)
 * @returns Object with validation result and error message if invalid
 * 
 * Validates: Requirements 4.3, 4.4
 */
export interface AudioFileValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateAudioFile = (
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): AudioFileValidationResult => {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  // Validate file type
  const validTypes = [
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/mp4',
    'audio/wav'
  ];

  const fileType = file.type.toLowerCase();
  const isValidType = validTypes.includes(fileType);

  if (!isValidType) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.type}. Supported types: WebM, MP3, OGG, MP4, WAV`
    };
  }

  // Validate file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
    };
  }

  return {
    isValid: true
  };
};

/**
 * Checks if the browser supports the MediaRecorder API
 * 
 * @returns true if MediaRecorder is supported, false otherwise
 * 
 * Validates: Requirements 5.1, 5.2
 */
export const isMediaRecorderSupported = (): boolean => {
  return typeof MediaRecorder !== 'undefined' && 
         typeof navigator.mediaDevices !== 'undefined' &&
         typeof navigator.mediaDevices.getUserMedia !== 'undefined';
};

/**
 * Converts a Blob to a File object
 * 
 * @param blob - The Blob to convert
 * @param fileName - The name for the file
 * @returns File object
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now()
  });
};

/**
 * Calculates the file size in a human-readable format
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Extracts the file extension from a MIME type
 * 
 * @param mimeType - The MIME type string
 * @returns File extension (e.g., "webm", "mp3")
 */
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/wav': 'wav'
  };

  // Handle codecs in MIME type (e.g., "audio/webm;codecs=opus")
  const baseType = mimeType.split(';')[0].trim();
  
  return mimeToExt[baseType] || 'webm';
};
