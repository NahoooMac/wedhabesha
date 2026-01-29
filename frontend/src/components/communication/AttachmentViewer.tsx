import React, { useState } from 'react';
import { Attachment } from '../../types/messaging';

interface AttachmentViewerProps {
  attachments: Attachment[];
  onDownload?: (attachment: Attachment) => void;
  className?: string;
}

/**
 * AttachmentViewer Component
 * 
 * Displays image thumbnails and document previews with download capabilities.
 * Provides a modal for full-size image viewing.
 * 
 * Requirements: 3.4 (attachment display), 7.3 (thumbnails and previews)
 */
export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  attachments,
  onDownload,
  className = ''
}) => {
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);
  const [imageLoadError, setImageLoadError] = useState<Set<string>>(new Set());

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleImageClick = (attachment: Attachment) => {
    if (attachment.fileType.startsWith('image/')) {
      setSelectedImage(attachment);
    }
  };

  const handleDownload = (attachment: Attachment, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImageError = (attachmentId: string) => {
    setImageLoadError(prev => new Set(prev).add(attachmentId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const renderImageAttachment = (attachment: Attachment) => {
    const hasError = imageLoadError.has(attachment.id);
    const displayUrl = hasError ? attachment.url : (attachment.thumbnailUrl || attachment.url);

    return (
      <div
        key={attachment.id}
        className="relative group cursor-pointer"
        onClick={() => handleImageClick(attachment)}
      >
        {hasError ? (
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center border border-gray-300">
            <svg
              className="w-12 h-12 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-gray-500 text-center px-2">
              Failed to load image
            </p>
            <button
              onClick={(e) => handleDownload(attachment, e)}
              className="mt-2 text-xs text-blue-500 hover:text-blue-600"
            >
              Download
            </button>
          </div>
        ) : (
          <>
            <img
              src={displayUrl}
              alt={attachment.fileName}
              className="max-w-xs max-h-64 rounded-lg object-cover hover:opacity-90 transition-opacity shadow-sm"
              onError={() => handleImageError(attachment.id)}
              loading="lazy"
            />
            {/* Overlay with download button */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
              <button
                onClick={(e) => handleDownload(attachment, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
                title="Download image"
              >
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
        <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
          {attachment.fileName}
        </p>
      </div>
    );
  };

  const renderDocumentAttachment = (attachment: Attachment) => {
    return (
      <div
        key={attachment.id}
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors border border-gray-200 max-w-md touch-manipulation"
      >
        {/* Document icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Document info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {attachment.fileName}
          </p>
          <p className="text-xs text-gray-500">
            PDF • {formatFileSize(attachment.fileSize)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* View button */}
          <button
            onClick={() => window.open(attachment.url, '_blank')}
            className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
            title="View document"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          {/* Download button */}
          <button
            onClick={(e) => handleDownload(attachment, e)}
            className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            title="Download document"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`mt-2 space-y-2 ${className}`}>
        {attachments.map((attachment) => {
          if (attachment.fileType.startsWith('image/')) {
            return renderImageAttachment(attachment);
          } else if (attachment.fileType === 'application/pdf') {
            return renderDocumentAttachment(attachment);
          }
          return null;
        })}
      </div>

      {/* Full-size image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors touch-manipulation z-10"
              title="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Download button */}
            <button
              onClick={(e) => {
                handleDownload(selectedImage, e);
              }}
              className="absolute top-4 right-16 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors touch-manipulation z-10"
              title="Download"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            {/* Full-size image */}
            <img
              src={selectedImage.url}
              alt={selectedImage.fileName}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <p className="text-sm font-medium truncate">
                {selectedImage.fileName}
              </p>
              <p className="text-xs opacity-75">
                {formatFileSize(selectedImage.fileSize)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttachmentViewer;
