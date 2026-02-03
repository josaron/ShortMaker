'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { processSegments, calculateSegmentDurations } from '@/lib/script-parser';
import { generateTTSForSegments } from '@/lib/piper';

export function StepGenerate() {
  const {
    videoFile,
    segments,
    selectedVoice,
    setVideoUrl,
    setProcessedSegments,
    setCombinedAudio,
    setCurrentStep,
    setProcessingStatus,
    setError,
    setProgress,
    processingStatus,
    progress,
    error,
  } = useAppStore();

  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!videoFile || segments.length === 0) {
      setError('Missing video file or script segments');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setProcessingStatus('uploading');
    setStatusMessage('Uploading video...');

    try {
      // Step 1: Upload video to Vercel Blob
      const formData = new FormData();
      formData.append('file', videoFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video');
      }

      const { url } = await uploadResponse.json();
      setVideoUrl(url);
      setProgress(20);

      // Step 2: Process segments
      setProcessingStatus('generating-tts');
      const processed = processSegments(segments);
      const withDurations = calculateSegmentDurations(processed);

      // Step 3: Generate TTS audio
      const { segments: ttsSegments, combinedBlob, totalDuration } = await generateTTSForSegments(
        withDurations,
        selectedVoice,
        (p, status) => {
          setProgress(20 + p * 40);
          setStatusMessage(status);
        }
      );

      setProcessedSegments(ttsSegments);
      setCombinedAudio(combinedBlob, totalDuration);
      setProgress(60);

      // Step 4: Send to server for video processing
      setProcessingStatus('processing-video');
      setStatusMessage('Processing video clips...');

      // Convert audio blob to base64
      const audioBase64 = await blobToBase64(combinedBlob);

      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: url,
          clips: ttsSegments.map((seg) => ({
            sourceTimestamp: seg.sourceTimestampSeconds,
            duration: seg.audioDuration || 5,
          })),
          audioBase64,
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Failed to process video');
      }

      // Handle streaming response for progress updates
      const reader = processResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.progress) {
                setProgress(60 + data.progress * 0.4);
                setStatusMessage(data.status || 'Processing...');
              }
              if (data.videoUrl) {
                useAppStore.getState().setProcessedVideoUrl(data.videoUrl);
              }
            } catch {
              // Ignore JSON parse errors for partial data
            }
          }
        }
      }

      setProcessingStatus('complete');
      setProgress(100);
      setStatusMessage('Processing complete!');

      // Move to preview step
      setTimeout(() => {
        setCurrentStep('preview');
      }, 1000);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProcessingStatus('error');
    } finally {
      setIsProcessing(false);
    }
  }, [
    videoFile,
    segments,
    selectedVoice,
    setVideoUrl,
    setProcessedSegments,
    setCombinedAudio,
    setCurrentStep,
    setProcessingStatus,
    setError,
    setProgress,
  ]);

  const handleBack = () => {
    setCurrentStep('upload');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">
          Generate Your Short
        </h2>
        <p className="text-[var(--text-muted)]">
          We&apos;ll generate the voiceover and process your video clips.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-[var(--text-muted)] mb-1">Video</div>
          <div className="font-medium text-[var(--text)] truncate">
            {videoFile?.name || 'No video'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-[var(--text-muted)] mb-1">Segments</div>
          <div className="font-medium text-[var(--text)]">
            {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-[var(--text-muted)] mb-1">Voice</div>
          <div className="font-medium text-[var(--text)] capitalize">
            {selectedVoice.split('-').slice(-2, -1)[0] || selectedVoice}
          </div>
        </div>
      </div>

      {/* Progress */}
      {isProcessing && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text)]">
              {statusMessage}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Success */}
      {processingStatus === 'complete' && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-3 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Video processed successfully! Redirecting to preview...</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-[var(--border)]">
        <button onClick={handleBack} disabled={isProcessing} className="btn-secondary">
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={isProcessing || processingStatus === 'complete'}
          className="btn-primary flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Processing...
            </>
          ) : (
            <>
              Generate Short
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix
      resolve(base64.split(',')[1] || base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
