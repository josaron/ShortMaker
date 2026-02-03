'use client';

import { useAppStore } from '@/store/useAppStore';
import { StepUpload } from '@/components/wizard/StepUpload';
import { StepGenerate } from '@/components/wizard/StepGenerate';
import { StepPreview } from '@/components/wizard/StepPreview';
import type { WizardStep } from '@/types';

const steps: { id: WizardStep; label: string; number: number }[] = [
  { id: 'upload', label: 'Upload', number: 1 },
  { id: 'generate', label: 'Generate', number: 2 },
  { id: 'preview', label: 'Preview', number: 3 },
];

export default function Home() {
  const { currentStep } = useAppStore();

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--text)]">ShortMaker</h1>
                <p className="text-xs text-[var(--text-muted)]">
                  Create shorts from long-form videos
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={`w-12 h-0.5 mr-4 ${
                        isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                        ${
                          isActive
                            ? 'bg-[var(--accent)] text-white'
                            : isCompleted
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-slate-100 text-[var(--text-muted)]'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:inline ${
                        isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="card">
          {currentStep === 'upload' && <StepUpload />}
          {currentStep === 'generate' && <StepGenerate />}
          {currentStep === 'preview' && <StepPreview />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <p className="text-center text-sm text-[var(--text-muted)]">
            ShortMaker - Transform long-form content into engaging shorts
          </p>
        </div>
      </footer>
    </main>
  );
}
