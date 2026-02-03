import type { ScriptSegment, ProcessedSegment } from '@/types';

/**
 * Parse a timestamp string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(p => parseInt(p, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return 0;
}

/**
 * Format seconds to MM:SS string
 */
export function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to HH:MM:SS string (for longer timestamps)
 */
export function formatTimestampLong(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Parse raw table content (pasted from Gemini or other sources) into ScriptSegments
 */
export function parseTableContent(text: string): ScriptSegment[] {
  const lines = text.split('\n').filter(line => line.trim());
  const segments: ScriptSegment[] = [];

  for (const line of lines) {
    // Skip header lines
    if (line.toLowerCase().includes('time') && 
        (line.toLowerCase().includes('script') || line.toLowerCase().includes('voiceover'))) {
      continue;
    }

    // Skip lines that look like separators
    if (/^[-=|+\s]+$/.test(line)) {
      continue;
    }

    let parts: string[] = [];
    
    // Try different parsing strategies
    
    // Strategy 1: Tab-separated
    if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim()).filter(p => p);
    }
    // Strategy 2: Pipe-separated
    else if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim()).filter(p => p);
    }
    // Strategy 3: Pattern matching for "TIME TEXT [TIMESTAMP]" format
    else {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)\s+\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
      if (match) {
        parts = [match[1], match[2], `[${match[3]}]`];
      }
    }

    if (parts.length >= 3) {
      // Extract script time (first column)
      const scriptTime = extractTimestamp(parts[0]);
      
      // Extract text (middle column(s) - might span multiple columns)
      const text = parts.slice(1, -1).join(' ').replace(/^["']|["']$/g, '').trim();
      
      // Extract source timestamp (last column)
      const sourceTimestamp = extractTimestamp(parts[parts.length - 1]);

      if (scriptTime && text && sourceTimestamp) {
        segments.push({
          id: generateId(),
          scriptTime,
          text,
          sourceTimestamp,
        });
      }
    }
  }

  return segments;
}

/**
 * Extract timestamp from a string, handling various formats
 */
function extractTimestamp(input: string): string {
  // Remove brackets and any non-time characters
  const cleaned = input.replace(/[\[\]()]/g, '').trim();
  
  // Match timestamp pattern
  const match = cleaned.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  
  return match ? match[1] : '';
}

/**
 * Process segments by converting timestamps to seconds
 */
export function processSegments(segments: ScriptSegment[]): ProcessedSegment[] {
  return segments.map(segment => ({
    ...segment,
    scriptTimeSeconds: parseTimestamp(segment.scriptTime),
    sourceTimestampSeconds: parseTimestamp(segment.sourceTimestamp),
  }));
}

/**
 * Calculate segment durations based on script timing
 * Each segment's duration is the time until the next segment starts
 */
export function calculateSegmentDurations(segments: ProcessedSegment[]): ProcessedSegment[] {
  return segments.map((segment, index) => {
    let duration: number;
    
    if (index < segments.length - 1) {
      // Duration is time until next segment
      duration = segments[index + 1].scriptTimeSeconds - segment.scriptTimeSeconds;
    } else {
      // Last segment - estimate based on text length (roughly 150 words per minute)
      const wordCount = segment.text.split(/\s+/).length;
      duration = Math.ceil((wordCount / 150) * 60);
      // Minimum 3 seconds, maximum 15 seconds for last segment
      duration = Math.max(3, Math.min(15, duration));
    }
    
    return {
      ...segment,
      audioDuration: duration,
    };
  });
}

/**
 * Validate segments for required fields and proper formats
 */
export function validateSegments(segments: ScriptSegment[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (segments.length === 0) {
    errors.push('No segments provided');
    return { valid: false, errors };
  }

  segments.forEach((segment, index) => {
    const rowNum = index + 1;

    if (!segment.scriptTime) {
      errors.push(`Row ${rowNum}: Missing script time`);
    } else if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(segment.scriptTime)) {
      errors.push(`Row ${rowNum}: Invalid script time format (use MM:SS or HH:MM:SS)`);
    }

    if (!segment.text || segment.text.trim().length === 0) {
      errors.push(`Row ${rowNum}: Missing voiceover text`);
    }

    if (!segment.sourceTimestamp) {
      errors.push(`Row ${rowNum}: Missing source timestamp`);
    } else if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(segment.sourceTimestamp)) {
      errors.push(`Row ${rowNum}: Invalid source timestamp format (use MM:SS or HH:MM:SS)`);
    }
  });

  // Check for duplicate script times
  const scriptTimes = segments.map(s => s.scriptTime);
  const duplicates = scriptTimes.filter((t, i) => scriptTimes.indexOf(t) !== i);
  if (duplicates.length > 0) {
    const uniqueDuplicates = Array.from(new Set(duplicates));
    errors.push(`Duplicate script times: ${uniqueDuplicates.join(', ')}`);
  }

  // Check that segments are in order
  const processed = processSegments(segments);
  for (let i = 1; i < processed.length; i++) {
    if (processed[i].scriptTimeSeconds <= processed[i - 1].scriptTimeSeconds) {
      errors.push(`Row ${i + 1}: Script time should be after previous segment`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Estimate total video duration based on segments
 */
export function estimateTotalDuration(segments: ProcessedSegment[]): number {
  if (segments.length === 0) return 0;
  
  const withDurations = calculateSegmentDurations(segments);
  return withDurations.reduce((total, seg) => total + (seg.audioDuration || 0), 0);
}
