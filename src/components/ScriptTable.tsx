'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ScriptSegment } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const parseTableContent = (text: string): ScriptSegment[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const segments: ScriptSegment[] = [];

  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().includes('time') && line.toLowerCase().includes('script')) {
      continue;
    }

    // Try different delimiters: tab, pipe, multiple spaces
    let parts: string[] = [];
    
    if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim());
    } else if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim());
    } else {
      // Try to match pattern: TIME SCRIPT [TIMESTAMP]
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)\s+\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
      if (match) {
        parts = [match[1], match[2], `[${match[3]}]`];
      }
    }

    if (parts.length >= 3) {
      const scriptTime = parts[0].replace(/[^\d:]/g, '');
      const segmentText = parts[1].replace(/^["']|["']$/g, '').trim();
      const sourceTimestamp = parts[2].replace(/[\[\]]/g, '').replace(/[^\d:]/g, '');

      if (scriptTime && segmentText && sourceTimestamp) {
        segments.push({
          id: generateId(),
          scriptTime,
          text: segmentText,
          sourceTimestamp,
        });
      }
    }
  }

  return segments;
};

export function ScriptTable() {
  const { segments, setSegments, addSegment, updateSegment, removeSegment } = useAppStore();

  const handleAddRow = useCallback(() => {
    addSegment({
      id: generateId(),
      scriptTime: '',
      text: '',
      sourceTimestamp: '',
    });
  }, [addSegment]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Try to parse the pasted content as a table
    const parsedSegments = parseTableContent(pastedText);
    
    if (parsedSegments.length > 0) {
      setSegments(parsedSegments);
    }
  }, [setSegments]);

  const handleCellChange = useCallback((id: string, field: keyof ScriptSegment, value: string) => {
    updateSegment(id, { [field]: value });
  }, [updateSegment]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[var(--text)]">Script & Timestamps</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Paste your Gemini-generated script or add rows manually
          </p>
        </div>
        <button
          onClick={handleAddRow}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Row
        </button>
      </div>

      {segments.length === 0 ? (
        <div className="card">
          <textarea
            placeholder={`Paste your script table here...

Example format:
00:00 | Did you know a 51-foot fire-breathing dragon... | [23:23]
00:06 | This is Murphy. He was the star of the Excalibur... | [24:02]
00:14 | Built by Disney veterans, Murphy was a hydraulic... | [23:37]`}
            className="input min-h-[200px] font-mono text-sm"
            onPaste={handlePaste}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Supports tab-separated, pipe-separated, or bracket-enclosed timestamps
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-muted)] border-b border-[var(--border)] w-24">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-muted)] border-b border-[var(--border)]">
                  Script / Voiceover
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-muted)] border-b border-[var(--border)] w-32">
                  Source Timestamp
                </th>
                <th className="px-4 py-3 border-b border-[var(--border)] w-12"></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-2 border-b border-[var(--border)]">
                    <input
                      type="text"
                      value={segment.scriptTime}
                      onChange={(e) => handleCellChange(segment.id, 'scriptTime', e.target.value)}
                      placeholder="00:00"
                      className="w-full px-2 py-1 text-sm border border-transparent rounded focus:border-[var(--accent)] focus:outline-none bg-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-[var(--border)]">
                    <textarea
                      value={segment.text}
                      onChange={(e) => handleCellChange(segment.id, 'text', e.target.value)}
                      placeholder="Enter voiceover text..."
                      rows={2}
                      className="w-full px-2 py-1 text-sm border border-transparent rounded focus:border-[var(--accent)] focus:outline-none bg-transparent resize-none"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-[var(--border)]">
                    <input
                      type="text"
                      value={segment.sourceTimestamp}
                      onChange={(e) => handleCellChange(segment.id, 'sourceTimestamp', e.target.value)}
                      placeholder="23:45"
                      className="w-full px-2 py-1 text-sm border border-transparent rounded focus:border-[var(--accent)] focus:outline-none bg-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-[var(--border)]">
                    <button
                      onClick={() => removeSegment(segment.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {segments.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
          <span>{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setSegments([])}
            className="text-red-500 hover:text-red-600"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
