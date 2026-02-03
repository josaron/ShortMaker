import { spawn } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectFaceAndCalculateCrop } from './mediapipe-crop';

interface Clip {
  sourceTimestamp: number; // seconds
  duration: number; // seconds
}

interface ProcessResult {
  success: boolean;
  videoBuffer?: Buffer;
  error?: string;
}

/**
 * Process video by extracting clips, cropping, speed adjusting, and combining
 */
export async function processVideo(
  videoUrl: string,
  clips: Clip[],
  audioBase64: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ProcessResult> {
  const workDir = join(tmpdir(), `shortmaker-${Date.now()}`);
  
  try {
    // Create work directory
    await mkdir(workDir, { recursive: true });

    // Download source video
    onProgress?.(0.1, 'Downloading source video...');
    const sourceVideoPath = join(workDir, 'source.mp4');
    await downloadFile(videoUrl, sourceVideoPath);

    // Decode audio from base64
    onProgress?.(0.15, 'Preparing audio...');
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const audioPath = join(workDir, 'audio.wav');
    await writeFile(audioPath, audioBuffer);

    // Process each clip
    const clipPaths: string[] = [];
    
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipProgress = 0.2 + (i / clips.length) * 0.5;
      onProgress?.(clipProgress, `Processing clip ${i + 1}/${clips.length}...`);

      const clipPath = await processClip(
        sourceVideoPath,
        clip,
        workDir,
        i
      );
      clipPaths.push(clipPath);
    }

    // Concatenate all clips
    onProgress?.(0.75, 'Concatenating clips...');
    const concatenatedPath = join(workDir, 'concatenated.mp4');
    await concatenateClips(clipPaths, concatenatedPath, workDir);

    // Add audio track
    onProgress?.(0.85, 'Adding voiceover...');
    const finalPath = join(workDir, 'final.mp4');
    await addAudioToVideo(concatenatedPath, audioPath, finalPath);

    // Read final video
    onProgress?.(0.95, 'Finalizing...');
    const videoBuffer = await readFile(finalPath);

    // Cleanup
    await cleanupWorkDir(workDir);

    return { success: true, videoBuffer };
  } catch (error) {
    console.error('Video processing error:', error);
    
    // Cleanup on error
    try {
      await cleanupWorkDir(workDir);
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a single clip: extract, crop, and speed adjust
 */
async function processClip(
  sourcePath: string,
  clip: Clip,
  workDir: string,
  index: number
): Promise<string> {
  // Extract 10 seconds from the source
  const extractPath = join(workDir, `extract_${index}.mp4`);
  const extractDuration = 10; // Always extract 10 seconds
  
  await runFFmpeg([
    '-ss', clip.sourceTimestamp.toString(),
    '-i', sourcePath,
    '-t', extractDuration.toString(),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-an', // Remove audio
    '-y',
    extractPath,
  ]);

  // Extract first frame for face detection
  const framePath = join(workDir, `frame_${index}.jpg`);
  await runFFmpeg([
    '-i', extractPath,
    '-vframes', '1',
    '-q:v', '2',
    '-y',
    framePath,
  ]);

  // Get crop parameters using MediaPipe
  const cropParams = await detectFaceAndCalculateCrop(framePath, extractPath);
  
  // Calculate speed factor to match desired duration
  // We use the first 'clip.duration' worth of content
  const speedFactor = extractDuration / clip.duration;
  const setptsValue = `${(1 / speedFactor).toFixed(4)}*PTS`;

  // Apply crop and speed adjustment
  const croppedPath = join(workDir, `cropped_${index}.mp4`);
  
  await runFFmpeg([
    '-i', extractPath,
    '-vf', `crop=${cropParams.width}:${cropParams.height}:${cropParams.x}:${cropParams.y},scale=720:1280,setpts=${setptsValue}`,
    '-t', clip.duration.toString(),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-r', '30',
    '-y',
    croppedPath,
  ]);

  return croppedPath;
}

/**
 * Concatenate multiple video clips
 */
async function concatenateClips(
  clipPaths: string[],
  outputPath: string,
  workDir: string
): Promise<void> {
  // Create concat file
  const concatFilePath = join(workDir, 'concat.txt');
  const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
  await writeFile(concatFilePath, concatContent);

  await runFFmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFilePath,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-y',
    outputPath,
  ]);
}

/**
 * Add audio track to video
 */
async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  await runFFmpeg([
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    '-y',
    outputPath,
  ]);
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg error: ${err.message}`));
    });
  });
}

/**
 * Clean up work directory
 */
async function cleanupWorkDir(workDir: string): Promise<void> {
  if (!existsSync(workDir)) return;

  const { rm } = await import('fs/promises');
  await rm(workDir, { recursive: true, force: true });
}

/**
 * Get video dimensions
 */
export async function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json',
      videoPath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          const stream = info.streams?.[0];
          if (stream) {
            resolve({
              width: stream.width,
              height: stream.height,
            });
          } else {
            reject(new Error('No video stream found'));
          }
        } catch {
          reject(new Error('Failed to parse ffprobe output'));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
      }
    });
  });
}
