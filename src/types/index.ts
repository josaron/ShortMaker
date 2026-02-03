// Script segment from the 3-column format
export interface ScriptSegment {
  id: string;
  scriptTime: string; // MM:SS format - when this segment plays in the final video
  text: string; // The voiceover text
  sourceTimestamp: string; // MM:SS or HH:MM:SS - timestamp in the source video
}

// Parsed segment with computed values
export interface ProcessedSegment extends ScriptSegment {
  scriptTimeSeconds: number;
  sourceTimestampSeconds: number;
  audioDuration?: number; // Duration of TTS audio for this segment
  audioBlob?: Blob; // Generated TTS audio
}

// Voice option for Piper TTS
export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  language: string;
  modelPath: string;
  configPath: string;
}

// Wizard steps
export type WizardStep = 'upload' | 'generate' | 'preview';

// Processing status
export type ProcessingStatus = 'idle' | 'uploading' | 'generating-tts' | 'processing-video' | 'complete' | 'error';

// App state
export interface AppState {
  // Step 1: Upload
  videoFile: File | null;
  videoUrl: string | null; // URL after upload to Vercel Blob
  segments: ScriptSegment[];
  
  // Step 2: Generation
  selectedVoice: string;
  processedSegments: ProcessedSegment[];
  combinedAudioBlob: Blob | null;
  combinedAudioDuration: number;
  
  // Step 3: Preview
  processedVideoUrl: string | null;
  
  // UI State
  currentStep: WizardStep;
  processingStatus: ProcessingStatus;
  error: string | null;
  progress: number; // 0-100
}

// API request/response types
export interface UploadResponse {
  url: string;
  success: boolean;
  error?: string;
}

export interface ProcessVideoRequest {
  videoUrl: string;
  clips: {
    sourceTimestamp: number; // seconds
    duration: number; // seconds - how long the clip should be (matches TTS duration)
  }[];
  audioBase64: string; // Base64 encoded audio
}

export interface ProcessVideoResponse {
  videoUrl: string;
  success: boolean;
  error?: string;
}
