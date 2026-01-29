import React, { useState, useRef } from 'react';
import { Upload, X, Camera, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  title: string;
  description?: string;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
  token?: string; // Added optional token prop
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  title,
  description,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeInMB = 5,
  token: propToken // Destructure the token prop
}) => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to get full image URL
  const getImageUrl = (photo: string) => {
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    // Use relative URL to go through Vite proxy in development
    return photo;
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    setUploading(true);

    try {
      const filesToUpload: File[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file type
        if (!acceptedTypes.includes(file.type)) {
          throw new Error(`File ${file.name} is not a supported image format. Please use JPG, PNG, or WebP.`);
        }
        
        // Check file size
        if (file.size > maxSizeInMB * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is ${maxSizeInMB}MB.`);
        }
        
        // Check total photos limit
        if (photos.length + filesToUpload.length >= maxPhotos) {
          throw new Error(`Maximum ${maxPhotos} photos allowed.`);
        }
        
        filesToUpload.push(file);
      }
      
      // Upload files to server
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('photos', file);
      });

      // --- AUTH FIX START ---
      // Use the passed prop token first, fallback to localStorage
      // Check both jwt_token and access_token for compatibility
      const authToken = propToken || localStorage.getItem('jwt_token') || localStorage.getItem('access_token');

      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/vendors/upload-photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      // Handle Expired Token specifically
      if (response.status === 401) {
        // Optional: clear bad token
        // localStorage.removeItem('token'); 
        
        // Redirect to login after a short delay or immediately
        setTimeout(() => navigate('/login'), 1500);
        throw new Error('Session expired. Redirecting to login...');
      }
      // --- AUTH FIX END ---

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload photos');
      }

      const data = await response.json();
      
      // Add uploaded photo URLs to existing photos
      onPhotosChange([...photos, ...data.photos]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{description}</p>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
        } ${photos.length >= maxPhotos ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={photos.length >= maxPhotos}
        />

        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {uploading ? 'Uploading photos...' : 'Upload your photos'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Drag and drop your photos here, or{' '}
              <button
                onClick={openFileDialog}
                className="text-rose-600 dark:text-rose-400 font-medium hover:underline"
                disabled={uploading || photos.length >= maxPhotos}
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Supports JPG, PNG, WebP • Max {maxSizeInMB}MB per file • Up to {maxPhotos} photos
            </p>
          </div>

          <Button
            onClick={openFileDialog}
            disabled={uploading || photos.length >= maxPhotos}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Camera className="w-4 h-4 mr-2" />
            Choose Photos
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={getImageUrl(photo)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <button
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photo Count */}
      <div className="text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {photos.length} of {maxPhotos} photos uploaded
        </p>
      </div>
    </div>
  );
};

export default PhotoUpload;