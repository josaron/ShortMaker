import { spawn } from 'child_process';

interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

// Target dimensions for 9:16 aspect ratio
const TARGET_WIDTH = 720;
const TARGET_HEIGHT = 1280;
const ASPECT_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // 0.5625

/**
 * Detect face in an image and calculate crop parameters for 9:16 aspect ratio
 */
export async function detectFaceAndCalculateCrop(
  imagePath: string,
  videoPath: string
): Promise<CropParams> {
  // Get video dimensions first
  const dimensions = await getImageDimensions(videoPath);
  
  if (!dimensions) {
    // If we can't get dimensions, use default center crop
    return getCenterCrop(1920, 1080);
  }

  const { width: videoWidth, height: videoHeight } = dimensions;

  try {
    // Try to detect face using Python script with MediaPipe
    const faceDetection = await detectFaceWithMediaPipe(imagePath);
    
    if (faceDetection) {
      return calculateCropAroundFace(faceDetection, videoWidth, videoHeight);
    }
  } catch (error) {
    console.warn('Face detection failed, using center crop:', error);
  }

  // Fallback to center crop
  return getCenterCrop(videoWidth, videoHeight);
}

/**
 * Calculate crop parameters centered on detected face
 */
function calculateCropAroundFace(
  face: FaceDetection,
  videoWidth: number,
  videoHeight: number
): CropParams {
  // Calculate the 9:16 crop dimensions that fit within the video
  let cropHeight = videoHeight;
  let cropWidth = Math.round(cropHeight * ASPECT_RATIO);

  // If crop width exceeds video width, adjust
  if (cropWidth > videoWidth) {
    cropWidth = videoWidth;
    cropHeight = Math.round(cropWidth / ASPECT_RATIO);
  }

  // Center the crop on the face
  const faceCenterX = face.x + face.width / 2;
  const faceCenterY = face.y + face.height / 2;

  // Calculate crop position, keeping face centered
  let cropX = Math.round(faceCenterX - cropWidth / 2);
  let cropY = Math.round(faceCenterY - cropHeight / 3); // Face in upper third

  // Clamp to video bounds
  cropX = Math.max(0, Math.min(cropX, videoWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, videoHeight - cropHeight));

  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Get center crop for 9:16 aspect ratio
 */
function getCenterCrop(videoWidth: number, videoHeight: number): CropParams {
  let cropHeight = videoHeight;
  let cropWidth = Math.round(cropHeight * ASPECT_RATIO);

  if (cropWidth > videoWidth) {
    cropWidth = videoWidth;
    cropHeight = Math.round(cropWidth / ASPECT_RATIO);
  }

  const cropX = Math.round((videoWidth - cropWidth) / 2);
  const cropY = Math.round((videoHeight - cropHeight) / 2);

  return {
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Detect face using MediaPipe via Python script
 */
async function detectFaceWithMediaPipe(imagePath: string): Promise<FaceDetection | null> {
  return new Promise((resolve) => {
    // Python script for face detection
    const pythonScript = `
import sys
import json

try:
    import cv2
    import mediapipe as mp
    
    mp_face_detection = mp.solutions.face_detection
    
    image = cv2.imread(sys.argv[1])
    if image is None:
        print(json.dumps({"error": "Could not read image"}))
        sys.exit(0)
    
    height, width = image.shape[:2]
    
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_detection.process(image_rgb)
        
        if results.detections:
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box
            
            result = {
                "x": int(bbox.xmin * width),
                "y": int(bbox.ymin * height),
                "width": int(bbox.width * width),
                "height": int(bbox.height * height),
                "confidence": float(detection.score[0])
            }
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "No face detected"}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

    const python = spawn('python3', ['-c', pythonScript, imagePath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            console.warn('Face detection:', result.error);
            resolve(null);
          } else {
            resolve(result as FaceDetection);
          }
        } catch {
          console.warn('Failed to parse face detection result');
          resolve(null);
        }
      } else {
        console.warn('Face detection failed:', stderr);
        resolve(null);
      }
    });

    python.on('error', () => {
      // Python not available, fall back to center crop
      resolve(null);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      python.kill();
      resolve(null);
    }, 10000);
  });
}

/**
 * Get image/video dimensions using ffprobe
 */
async function getImageDimensions(
  path: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'json',
      path,
    ]);

    let stdout = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
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
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }
      resolve(null);
    });

    ffprobe.on('error', () => {
      resolve(null);
    });
  });
}

