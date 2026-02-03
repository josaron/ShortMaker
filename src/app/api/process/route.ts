import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { processVideo } from '@/lib/ffmpeg-pipeline';
import type { ProcessVideoRequest } from '@/types';

// Configure for longer execution time (Vercel Fluid Compute)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a readable stream for progress updates
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body: ProcessVideoRequest = await request.json();
        const { videoUrl, clips, audioBase64 } = body;

        // Validate input
        if (!videoUrl || !clips || clips.length === 0) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: 'Missing required fields' }) + '\n')
          );
          controller.close();
          return;
        }

        // Send initial progress
        controller.enqueue(
          encoder.encode(JSON.stringify({ progress: 0.05, status: 'Starting video processing...' }) + '\n')
        );

        // Process the video
        const result = await processVideo(
          videoUrl,
          clips,
          audioBase64,
          (progress, status) => {
            controller.enqueue(
              encoder.encode(JSON.stringify({ progress, status }) + '\n')
            );
          }
        );

        if (!result.success || !result.videoBuffer) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: result.error || 'Processing failed' }) + '\n')
          );
          controller.close();
          return;
        }

        // Upload processed video to Vercel Blob
        controller.enqueue(
          encoder.encode(JSON.stringify({ progress: 0.95, status: 'Uploading processed video...' }) + '\n')
        );

        const timestamp = Date.now();
        const filename = `processed/${timestamp}-short.mp4`;

        const blob = await put(filename, result.videoBuffer, {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'video/mp4',
        });

        // Send final result
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              progress: 1.0,
              status: 'Complete',
              videoUrl: blob.url,
              success: true,
            }) + '\n'
          )
        );

        controller.close();
      } catch (error) {
        console.error('Process error:', error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Processing failed',
            }) + '\n'
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
