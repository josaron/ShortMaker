import { create } from 'zustand';
import type { AppState, ScriptSegment, ProcessedSegment, WizardStep, ProcessingStatus } from '@/types';

interface AppActions {
  // Step 1 actions
  setVideoFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  setSegments: (segments: ScriptSegment[]) => void;
  addSegment: (segment: ScriptSegment) => void;
  updateSegment: (id: string, updates: Partial<ScriptSegment>) => void;
  removeSegment: (id: string) => void;
  
  // Step 2 actions
  setSelectedVoice: (voiceId: string) => void;
  setProcessedSegments: (segments: ProcessedSegment[]) => void;
  setCombinedAudio: (blob: Blob | null, duration: number) => void;
  
  // Step 3 actions
  setProcessedVideoUrl: (url: string | null) => void;
  
  // UI actions
  setCurrentStep: (step: WizardStep) => void;
  setProcessingStatus: (status: ProcessingStatus) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

const initialState: AppState = {
  videoFile: null,
  videoUrl: null,
  segments: [],
  selectedVoice: 'en_US-lessac-medium',
  processedSegments: [],
  combinedAudioBlob: null,
  combinedAudioDuration: 0,
  processedVideoUrl: null,
  currentStep: 'upload',
  processingStatus: 'idle',
  error: null,
  progress: 0,
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...initialState,
  
  // Step 1 actions
  setVideoFile: (file) => set({ videoFile: file }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setSegments: (segments) => set({ segments }),
  addSegment: (segment) => set((state) => ({ 
    segments: [...state.segments, segment] 
  })),
  updateSegment: (id, updates) => set((state) => ({
    segments: state.segments.map((seg) =>
      seg.id === id ? { ...seg, ...updates } : seg
    ),
  })),
  removeSegment: (id) => set((state) => ({
    segments: state.segments.filter((seg) => seg.id !== id),
  })),
  
  // Step 2 actions
  setSelectedVoice: (voiceId) => set({ selectedVoice: voiceId }),
  setProcessedSegments: (segments) => set({ processedSegments: segments }),
  setCombinedAudio: (blob, duration) => set({ 
    combinedAudioBlob: blob, 
    combinedAudioDuration: duration 
  }),
  
  // Step 3 actions
  setProcessedVideoUrl: (url) => set({ processedVideoUrl: url }),
  
  // UI actions
  setCurrentStep: (step) => set({ currentStep: step }),
  setProcessingStatus: (status) => set({ processingStatus: status }),
  setError: (error) => set({ error }),
  setProgress: (progress) => set({ progress }),
  reset: () => set(initialState),
}));
