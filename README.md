# ShortMaker

Transform long-form educational videos into engaging 45-75 second shorts with AI-powered TTS and smart face-tracking crop.

## Features

- **Video Upload**: Drag-and-drop video upload (MP4, MOV, WebM up to 500MB)
- **Script Input**: Paste Gemini-generated 3-column format (Time | Script | Source Timestamp)
- **TTS Voice Selection**: Choose from 5 different voice styles
- **Smart Cropping**: MediaPipe face detection for 9:16 vertical format
- **Video Processing**: Server-side FFmpeg processing with Vercel Fluid Compute
- **Preview & Export**: Preview your short before downloading as MP4

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **TTS**: Web Speech API (with Piper voice styling)
- **Video Processing**: FFmpeg + MediaPipe (server-side)
- **Storage**: Vercel Blob
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- FFmpeg installed on server (for video processing)
- Python 3 with OpenCV and MediaPipe (for face detection)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your BLOB_READ_WRITE_TOKEN from Vercel Dashboard

# Run development server
npm run dev
```

### Environment Variables

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

Get your Blob token from: https://vercel.com/dashboard/stores

## Workflow

### Step 1: Upload

1. Upload your source video (the long-form YouTube video)
2. Paste your Gemini-generated script in the 3-column format:

```
Time      | Script / Voiceover                                    | Source Timestamp
00:00     | Did you know a 51-foot fire-breathing dragon...       | [23:23]
00:06     | This is Murphy. He was the star of the Excalibur...   | [24:02]
```

3. Select your preferred voice

### Step 2: Generate

1. The app uploads your video to Vercel Blob
2. TTS audio is generated for each script segment
3. Video clips are extracted, cropped (9:16), and speed-adjusted to match narration
4. All clips are stitched together with the TTS audio track

### Step 3: Preview & Export

1. Preview the generated short
2. Download as MP4 (720x1280)

## Deployment

### Option 1: Container Deployment (Recommended)

Since this app requires FFmpeg and Python with OpenCV/MediaPipe for video processing, you'll need container-based deployment. Here are your options:

#### Railway (Recommended for simplicity)

1. Create an account at [railway.app](https://railway.app)
2. Create a new project and select "Deploy from GitHub repo"
3. Connect your repository
4. Add environment variables:
   - `BLOB_READ_WRITE_TOKEN` - Get from [Vercel Blob Dashboard](https://vercel.com/dashboard/stores)
5. Railway will auto-detect the Dockerfile and deploy

#### Render

1. Create an account at [render.com](https://render.com)
2. Create a new "Web Service" and connect your GitHub repo
3. Select "Docker" as the runtime
4. Add environment variable: `BLOB_READ_WRITE_TOKEN`
5. Deploy

#### Fly.io

```bash
# Install Fly CLI
brew install flyctl

# Login and launch
fly auth login
fly launch

# Set secrets
fly secrets set BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Deploy
fly deploy
```

### Option 2: Vercel (Frontend) + External Processing

If you prefer Vercel for the frontend, you can split the architecture:

1. Deploy the Next.js app to Vercel normally
2. Host the video processing API separately on Railway/Render
3. Update the `/api/process` route to proxy to your external service

### Setting Up BLOB_READ_WRITE_TOKEN

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Create Database** → **Blob**
3. Create a new Blob store (or use existing)
4. Go to the store settings and copy the **Read/Write Token**
5. Add `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx` to your deployment platform's environment variables

### Server Requirements

The video processing requires:
- **FFmpeg** + **ffprobe** in PATH
- **Python 3** with `opencv-python-headless` and `mediapipe`

The included `Dockerfile` handles all of these dependencies automatically.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Main wizard component
│   ├── api/
│   │   ├── upload/route.ts      # Upload to Vercel Blob
│   │   └── process/route.ts     # FFmpeg video processing
│   └── layout.tsx
├── components/
│   ├── wizard/
│   │   ├── StepUpload.tsx       # Step 1: Upload + script
│   │   ├── StepGenerate.tsx     # Step 2: TTS + processing
│   │   └── StepPreview.tsx      # Step 3: Preview + export
│   ├── ScriptTable.tsx          # 3-column editable table
│   ├── VoiceSelector.tsx        # Voice picker
│   └── VideoPlayer.tsx          # Preview player
├── lib/
│   ├── piper.ts                 # TTS wrapper
│   ├── script-parser.ts         # Parse 3-column format
│   ├── ffmpeg-pipeline.ts       # Video processing
│   └── mediapipe-crop.ts        # Face detection
├── store/
│   └── useAppStore.ts           # Zustand state
└── types/
    └── index.ts                 # TypeScript types
```

## Output Specifications

- **Dimensions**: 720x1280 (9:16 aspect ratio)
- **Duration**: 45-75 seconds
- **Format**: MP4 (H.264 + AAC)
- **No original audio** - replaced with TTS voiceover

## License

MIT
