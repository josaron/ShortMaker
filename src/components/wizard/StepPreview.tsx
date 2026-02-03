'use client';

import { useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { VideoPlayer } from '@/components/VideoPlayer';

export function StepPreview() {
  const {
    processedVideoUrl,
    processedSegments,
    combinedAudioDuration,
    setCurrentStep,
    reset,
  } = useAppStore();

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!processedVideoUrl) return;

    setIsDownloading(true);

    try {
      const response = await fetch(processedVideoUrl);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `short-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [processedVideoUrl]);

  const handleStartOver = useCallback(() => {
    reset();
  }, [reset]);

  const handleEdit = useCallback(() => {
    setCurrentStep('upload');
  }, [setCurrentStep]);

  if (!processedVideoUrl) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--text)] mb-2">
          No video ready
        </h3>
        <p className="text-[var(--text-muted)] mb-6">
          Please generate your short first.
        </p>
        <button onClick={handleEdit} className="btn-primary">
          Go to Generation
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">
          Preview Your Short
        </h2>
        <p className="text-[var(--text-muted)]">
          Review your generated short and download when ready.
        </p>
      </div>

      {/* Video Preview */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm">
          <VideoPlayer
            src={processedVideoUrl}
            className="aspect-[9/16] rounded-xl shadow-lg"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">
            {processedSegments.length}
          </div>
          <div className="text-sm text-[var(--text-muted)]">Clips</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">
            {Math.round(combinedAudioDuration)}s
          </div>
          <div className="text-sm text-[var(--text-muted)]">Duration</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">720p</div>
          <div className="text-sm text-[var(--text-muted)]">Resolution</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">9:16</div>
          <div className="text-sm text-[var(--text-muted)]">Aspect Ratio</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t border-[var(--border)]">
        <button onClick={handleEdit} className="btn-secondary">
          Edit Script
        </button>
        <button onClick={handleStartOver} className="btn-secondary">
          Start Over
        </button>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isDownloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download MP4
            </>
          )}
        </button>
      </div>
    </div>
  );
}
