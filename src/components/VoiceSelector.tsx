'use client';

import { useAppStore } from '@/store/useAppStore';
import type { VoiceOption } from '@/types';

// Available Piper TTS voices
export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'en_US-lessac-medium',
    name: 'Lessac',
    description: 'Neutral American English voice',
    language: 'en-US',
    modelPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
    configPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json',
  },
  {
    id: 'en_US-amy-medium',
    name: 'Amy',
    description: 'Female American English voice',
    language: 'en-US',
    modelPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx',
    configPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json',
  },
  {
    id: 'en_GB-alan-medium',
    name: 'Alan',
    description: 'British English male voice',
    language: 'en-GB',
    modelPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx',
    configPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/medium/en_GB-alan-medium.onnx.json',
  },
  {
    id: 'en_US-ryan-high',
    name: 'Ryan',
    description: 'High quality American male voice',
    language: 'en-US',
    modelPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx',
    configPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json',
  },
  {
    id: 'en_US-libritts_r-medium',
    name: 'LibriTTS',
    description: 'LibriTTS trained voice',
    language: 'en-US',
    modelPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx',
    configPath: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx.json',
  },
];

export function VoiceSelector() {
  const { selectedVoice, setSelectedVoice } = useAppStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {AVAILABLE_VOICES.map((voice) => (
        <button
          key={voice.id}
          onClick={() => setSelectedVoice(voice.id)}
          className={`
            p-4 rounded-lg border-2 text-left transition-all
            ${selectedVoice === voice.id
              ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
              : 'border-[var(--border)] hover:border-slate-300 bg-[var(--surface)]'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${selectedVoice === voice.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-slate-100 text-[var(--text-muted)]'
              }
            `}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className={`font-medium ${selectedVoice === voice.id ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                {voice.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {voice.description}
              </p>
            </div>
          </div>
          {selectedVoice === voice.id && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[var(--accent)]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Selected
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export function getVoiceById(id: string): VoiceOption | undefined {
  return AVAILABLE_VOICES.find(v => v.id === id);
}
