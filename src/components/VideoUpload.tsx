'use client';

import { useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function VideoUpload() {
  const { videoFile, setVideoFile } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidVideoFile(file)) {
        setVideoFile(file);
      }
    }
  }, [setVideoFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidVideoFile(file)) {
        setVideoFile(file);
      }
    }
  }, [setVideoFile]);

  const isValidVideoFile = (file: File): boolean => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    return validTypes.includes(file.type);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRemove = useCallback(() => {
    setVideoFile(null);
  }, [setVideoFile]);

  if (videoFile) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--accent-muted)] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">{videoFile.name}</p>
              <p className="text-sm text-[var(--text-muted)]">{formatFileSize(videoFile.size)}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
        ${isDragging 
          ? 'border-[var(--accent)] bg-[var(--accent-muted)]' 
          : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-slate-50'
        }
      `}
    >
      <input
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
        onChange={handleFileSelect}
        className="hidden"
        id="video-upload"
      />
      <label htmlFor="video-upload" className="cursor-pointer">
        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-muted)] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-lg font-medium text-[var(--text)] mb-1">
          Drop your video here or click to browse
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Supports MP4, MOV, WebM (max 500MB)
        </p>
      </label>
    </div>
  );
}
