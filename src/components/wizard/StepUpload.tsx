'use client';

import { VideoUpload } from '@/components/VideoUpload';
import { ScriptTable } from '@/components/ScriptTable';
import { VoiceSelector } from '@/components/VoiceSelector';
import { useAppStore } from '@/store/useAppStore';

export function StepUpload() {
  const { videoFile, segments, setCurrentStep } = useAppStore();

  const canProceed = videoFile && segments.length > 0;

  const handleContinue = () => {
    if (canProceed) {
      setCurrentStep('generate');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">
          Upload Your Content
        </h2>
        <p className="text-[var(--text-muted)]">
          Start by uploading your source video and the Gemini-generated script with timestamps.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Source Video
          </label>
          <VideoUpload />
        </div>

        <div>
          <ScriptTable />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Voice Selection
          </label>
          <VoiceSelector />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleContinue}
          disabled={!canProceed}
          className="btn-primary flex items-center gap-2"
        >
          Continue to Generation
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
