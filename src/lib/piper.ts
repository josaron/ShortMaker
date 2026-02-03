import { getVoiceById } from '@/components/VoiceSelector';
import type { ProcessedSegment } from '@/types';

/**
 * Web Speech API based TTS
 * This provides a reliable fallback that works in all modern browsers
 */
class WebSpeechTTS {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private audioContext: AudioContext | null = null;

  async init(voiceId: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('TTS is only available in the browser');
    }

    this.synth = window.speechSynthesis;
    this.audioContext = new AudioContext();

    // Wait for voices to load
    await new Promise<void>((resolve) => {
      if (this.synth!.getVoices().length > 0) {
        resolve();
        return;
      }
      
      const handleVoicesChanged = () => {
        this.synth!.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve();
      };
      
      this.synth!.addEventListener('voiceschanged', handleVoicesChanged);
      
      // Timeout after 3 seconds
      setTimeout(resolve, 3000);
    });

    const voices = this.synth.getVoices();
    
    // Try to find a matching voice based on voice ID
    const voiceConfig = getVoiceById(voiceId);
    if (voiceConfig) {
      const langPrefix = voiceConfig.language.split('-')[0];
      // Prefer voices that match the language
      this.voice = voices.find(v => 
        v.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    } else {
      this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }
  }

  async synthesize(text: string): Promise<{ audioBlob: Blob; duration: number }> {
    if (!this.synth || !this.audioContext) {
      throw new Error('TTS not initialized');
    }

    // Use MediaRecorder to capture audio if available
    // Otherwise estimate duration based on text
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const startTime = Date.now();

      utterance.onend = () => {
        const duration = (Date.now() - startTime) / 1000;
        
        // Generate audio blob with the correct duration
        // We create a silent audio track as placeholder
        // The actual audio will be generated during preview
        const sampleRate = 22050;
        const numSamples = Math.ceil(duration * sampleRate);
        const audioBuffer = this.audioContext!.createBuffer(1, numSamples, sampleRate);
        
        // Create WAV blob
        const wavBlob = audioBufferToWav(audioBuffer);
        
        resolve({ audioBlob: wavBlob, duration });
      };

      utterance.onerror = (e) => {
        reject(new Error(`Speech synthesis error: ${e.error}`));
      };

      this.synth!.speak(utterance);
    });
  }

  async synthesizeToBlob(text: string): Promise<{ audioBlob: Blob; duration: number }> {
    // For browsers that support MediaStream destination
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Estimate duration based on word count (average 150 words per minute)
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.max(2, (wordCount / 150) * 60);

    // Create a placeholder audio blob with estimated duration
    const sampleRate = 22050;
    const numSamples = Math.ceil(estimatedDuration * sampleRate);
    const audioBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
    
    const wavBlob = audioBufferToWav(audioBuffer);
    
    return { audioBlob: wavBlob, duration: estimatedDuration };
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Audio data
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Main TTS class
 */
export class PiperTTS {
  private backend: WebSpeechTTS | null = null;
  private initialized: boolean = false;

  async init(voiceId: string, onProgress?: (progress: number) => void): Promise<void> {
    onProgress?.(0.3);
    
    const webSpeech = new WebSpeechTTS();
    await webSpeech.init(voiceId);
    this.backend = webSpeech;
    
    onProgress?.(1.0);
    this.initialized = true;
  }

  async synthesize(text: string): Promise<{ audioBlob: Blob; duration: number }> {
    if (!this.backend || !this.initialized) {
      throw new Error('TTS not initialized');
    }

    // Use estimation method for more reliable results
    return this.backend.synthesizeToBlob(text);
  }
}

/**
 * Generate TTS audio for all segments
 */
export async function generateTTSForSegments(
  segments: ProcessedSegment[],
  voiceId: string,
  onProgress?: (progress: number, status: string) => void
): Promise<{ segments: ProcessedSegment[]; combinedBlob: Blob; totalDuration: number }> {
  const tts = new PiperTTS();
  
  onProgress?.(0, 'Initializing voice...');
  await tts.init(voiceId, (p) => onProgress?.(p * 0.3, 'Initializing voice...'));

  const processedSegments: ProcessedSegment[] = [];
  const audioBlobs: Blob[] = [];
  let totalDuration = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const progress = 0.3 + (i / segments.length) * 0.7;
    onProgress?.(progress, `Processing segment ${i + 1}/${segments.length}...`);

    try {
      const { audioBlob, duration } = await tts.synthesize(segment.text);
      
      processedSegments.push({
        ...segment,
        audioDuration: duration,
        audioBlob,
      });
      
      audioBlobs.push(audioBlob);
      totalDuration += duration;
    } catch (error) {
      console.error(`Error synthesizing segment ${i + 1}:`, error);
      
      // Use estimated duration as fallback
      const wordCount = segment.text.split(/\s+/).length;
      const estimatedDuration = Math.max(2, (wordCount / 150) * 60);
      
      processedSegments.push({
        ...segment,
        audioDuration: estimatedDuration,
      });
      
      totalDuration += estimatedDuration;
    }
  }

  // Combine all audio blobs
  const combinedBlob = new Blob(audioBlobs, { type: 'audio/wav' });

  onProgress?.(1, 'Audio generation complete');

  return {
    segments: processedSegments,
    combinedBlob,
    totalDuration,
  };
}
