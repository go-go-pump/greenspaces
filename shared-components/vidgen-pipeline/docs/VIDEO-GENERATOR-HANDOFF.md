# Video Generator - Standalone Tool

## Overview

A fully automated video generation pipeline that transforms any topic into a professional slideshow video with voiceover narration.

**Input:** Topic prompt (e.g., "How to fix a water pump on a 2013 Audi Q7", "Plan a 4-year-old's Mickey Mouse birthday party")

**Output:** 
- MP4 video file (slideshow with timed audio)
- Thumbnail image
- Video metadata (title, description, tags)

---

## Core Pipeline

```
INPUT: Topic Prompt
    ↓
PHASE 1: Deep Research & Asset Preparation
    ├─ Web search for comprehensive information
    ├─ YouTube transcript search (optional)
    ├─ Structure findings into presentation outline
    └─ Identify key points, steps, resources
    ↓
PHASE 2: Video Production Pipeline
    ├─ Generate script with timing markers
    ├─ Create slideshow (text-based, clean design)
    ├─ Generate voiceover audio
    └─ Assemble video (slides + audio + transitions)
    ↓
OUTPUT: 
    ├─ MP4 video file
    ├─ Thumbnail image
    └─ Metadata (title, description, tags)
```

---

## Phase 1: Deep Research & Asset Preparation

### Research Process

The system gathers information from multiple sources to create a comprehensive knowledge base about the topic.

**Research Sources:**
1. **Web Search** - Articles, guides, official documentation
2. **YouTube Transcripts** (optional) - Filmot API for existing video content
3. **Forum Discussions** (optional) - Reddit, specialized forums
4. **Expert Knowledge** - Claude API synthesis

**Research Output Structure:**
```json
{
  "topic": "Replace water pump 2013 Audi Q7",
  "summary": "Brief overview of the topic...",
  "keyPoints": [
    "Point 1: Time and difficulty",
    "Point 2: Required tools",
    "Point 3: Main steps"
  ],
  "detailedSections": [
    {
      "title": "Tools Needed",
      "duration": 45,
      "content": "3/8 drive socket set, torque wrench...",
      "bulletPoints": ["Socket set", "Torque wrench", "Drain pan"]
    },
    {
      "title": "Process Overview",
      "duration": 60,
      "content": "Step-by-step process...",
      "bulletPoints": ["Drain coolant", "Remove belt", "Unbolt pump"]
    }
  ],
  "estimates": {
    "time": "3-6 hours",
    "difficulty": "Intermediate",
    "cost": "$300-500"
  },
  "resources": [
    "Top YouTube videos",
    "Helpful articles",
    "Forum discussions"
  ]
}
```

---

## Phase 2: Video Production Pipeline

### Step 1: Script Generation

Transform research into a narrated script with timing markers.

**Script Structure:**
```javascript
{
  "sections": [
    {
      "title": "Hook",
      "duration": 10,
      "text": "Replacing a water pump on a 2013 Audi Q7 sounds intimidating, but with the right approach, you'll save $800 in labor costs.",
      "slideType": "title"
    },
    {
      "title": "Overview",
      "duration": 20,
      "text": "This repair takes about 4 hours for someone with intermediate skills. You'll need about $300 in parts. Let's break down exactly what you're getting into.",
      "slideType": "stats"
    },
    {
      "title": "Tools",
      "duration": 45,
      "text": "First, let's talk tools. You'll need a 3/8 drive socket set with 10mm, 13mm, and 17mm sockets...",
      "slideType": "list"
    }
    // ... more sections
  ],
  "totalDuration": 240,
  "wordCount": 600
}
```

**Script Generation via Claude API:**
```javascript
const prompt = `
Create a ${targetDuration}-minute video script for: ${topic}

Use this research: ${JSON.stringify(research)}

Requirements:
- Engaging hook (10 seconds)
- Clear structure with logical flow
- Conversational tone, not robotic
- Time markers for each section
- Avoid jargon unless explained
- End with clear call-to-action

Output format: JSON with sections, text, duration
`;
```

---

### Step 2: Slideshow Creation

Generate clean, text-based slides matching the script sections.

**Slide Types:**

1. **Title Slide**
   - Large title text
   - Optional subtitle
   - Minimal design

2. **Stats/Quick Facts**
   - 3-4 key statistics
   - Icons/emojis for visual interest
   - Grid or column layout

3. **List Slide**
   - Bullet points (3-5 items)
   - Large, readable text
   - Optional icons

4. **Comparison/Table**
   - Side-by-side comparison
   - Simple table layout
   - Clear headers

5. **Process/Steps**
   - Numbered steps
   - Sequential flow
   - Optional flowchart

6. **Warning/Tips**
   - Highlighted callouts
   - Different color scheme
   - Icon indicators

7. **CTA (Call-to-Action)**
   - Clear next step
   - Large, actionable text

**Design Heuristics:**
- **Font Size:** 60-80pt for titles, 40-50pt for body
- **Contrast:** High contrast (dark bg + white text or vice versa)
- **Text Density:** Max 3-5 bullets per slide, 10-15 words per bullet
- **Color Scheme:** 2-3 colors max, consistent throughout
- **Whitespace:** Generous padding, never crowded
- **Icons/Emojis:** Used sparingly for emphasis
- **Transitions:** Simple crossfades (0.5 seconds)

**Slide Generation Implementation:**
```javascript
async function generateSlides(script, theme) {
  const slides = [];
  
  for (const section of script.sections) {
    const slide = createSlide({
      type: section.slideType,
      title: section.title,
      content: section.bulletPoints || section.text,
      theme: theme,
      duration: section.duration
    });
    
    slides.push(slide);
  }
  
  return slides; // Array of slide definitions
}

async function renderSlide(slideDef, theme) {
  // Option A: Use Python/Pillow for image generation
  // Option B: Use node-canvas
  // Option C: Use Canva API
  // Option D: Use Puppeteer to render HTML to image
  
  // Returns: PNG buffer or file path
}
```

---

### Step 3: Audio Generation

Convert script to natural-sounding voiceover.

**Text-to-Speech Options:**

1. **ElevenLabs** (Recommended)
   - Most natural sounding
   - Multiple voices available
   - ~$22/month for 100k characters
   - API: Simple REST endpoint

2. **AWS Polly**
   - Good quality
   - Neural voices available
   - Pay-per-use ($4 per 1M characters)
   - Integrated if using AWS

3. **Google Cloud TTS**
   - High quality
   - WaveNet voices
   - Similar pricing to Polly

**Implementation:**
```javascript
async function generateAudio(script, voiceId) {
  const fullText = script.sections
    .map(s => s.text)
    .join(' ');
  
  // ElevenLabs example
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/${voiceId}', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: fullText,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    })
  });
  
  const audioBuffer = await response.arrayBuffer();
  const audioPath = `/tmp/audio-${uuid()}.mp3`;
  await fs.writeFile(audioPath, Buffer.from(audioBuffer));
  
  return audioPath;
}
```

---

### Step 4: Video Assembly

Combine slides and audio into final MP4 video.

**FFmpeg-based Assembly:**
```javascript
async function assembleVideo(slides, audioPath, options = {}) {
  const ffmpeg = require('fluent-ffmpeg');
  const outputPath = `/tmp/video-${uuid()}.mp4`;
  
  // Get audio duration
  const audioDuration = await getAudioDuration(audioPath);
  
  // Calculate slide timings (match script durations)
  const slideDurations = slides.map(s => s.duration);
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg();
    
    // Add each slide as looped input
    slides.forEach((slide, i) => {
      command = command
        .input(slide.imagePath)
        .inputOptions([
          '-loop 1',
          `-t ${slideDurations[i]}`
        ]);
    });
    
    // Add audio
    command = command.input(audioPath);
    
    // Build filter for concatenation with crossfades
    const filters = [];
    let previousOutput = '[0:v]';
    
    for (let i = 1; i < slides.length; i++) {
      const currentInput = `[${i}:v]`;
      const fadeOutput = i === slides.length - 1 ? '[v]' : `[v${i}]`;
      
      // Crossfade between slides
      filters.push(
        `${previousOutput}${currentInput}xfade=transition=fade:duration=0.5:offset=${
          slideDurations.slice(0, i).reduce((a, b) => a + b, 0) - 0.5
        }${fadeOutput}`
      );
      
      previousOutput = fadeOutput;
    }
    
    command
      .complexFilter(filters)
      .outputOptions([
        '-map [v]',
        `-map ${slides.length}:a`, // Audio map
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
        '-pix_fmt yuv420p',
        '-r 24'
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}
```

---

### Step 5: Thumbnail Generation

Create eye-catching thumbnail from first slide.

**Enhancement Strategy:**
- Take title slide
- Increase contrast/saturation
- Add text overlay (larger, bolder)
- Add visual element (badge, icon)
- Optimize for small display (mobile thumbnails)

**Implementation:**
```javascript
async function generateThumbnail(firstSlide, topic) {
  const sharp = require('sharp');
  
  // Load first slide
  let thumbnail = await sharp(firstSlide.imagePath);
  
  // Enhance
  thumbnail = thumbnail
    .modulate({
      brightness: 1.1,
      saturation: 1.2
    })
    .sharpen();
  
  // Add overlay text (using SVG overlay)
  const overlay = `
    <svg width="1280" height="720">
      <style>
        .title { fill: white; font-size: 72px; font-weight: bold; }
      </style>
      <text x="640" y="360" text-anchor="middle" class="title">
        ${topic.substring(0, 40)}
      </text>
    </svg>
  `;
  
  thumbnail = thumbnail.composite([{
    input: Buffer.from(overlay),
    top: 0,
    left: 0
  }]);
  
  // Export as JPEG (1280x720)
  const buffer = await thumbnail.jpeg({ quality: 90 }).toBuffer();
  const thumbnailPath = `/tmp/thumbnail-${uuid()}.jpg`;
  await fs.writeFile(thumbnailPath, buffer);
  
  return thumbnailPath;
}
```

---

### Step 6: Metadata Generation

Create YouTube-ready metadata.

**Metadata Structure:**
```javascript
async function generateMetadata(topic, research) {
  const prompt = `
    Create YouTube metadata for this video:
    
    Topic: ${topic}
    Research: ${JSON.stringify(research)}
    
    Generate:
    1. Title (60 chars max, clickable, descriptive)
    2. Description (detailed, with timestamps)
    3. Tags (15-20 relevant tags)
  `;
  
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }]
  });
  
  return {
    title: "2013 Audi Q7 Water Pump Replacement - Complete DIY Guide",
    description: `
Everything you need to replace the water pump on your 2013 Audi Q7.

⏱️ Time: 3-6 hours
💰 Cost: $300-500
🔧 Difficulty: Intermediate

TIMESTAMPS:
0:00 - Introduction
0:30 - Tools Needed
1:15 - Parts Required
2:00 - Process Overview
3:00 - Tips & Warnings
3:40 - Resources

Full guide: [link]
    `,
    tags: [
      "audi q7",
      "water pump replacement",
      "diy car repair",
      "car maintenance",
      "2013 audi q7",
      "automotive repair",
      "audi repair"
    ]
  };
}
```

---

## API Interface

The video generator exposes a simple REST API for integration.

### Generate Video

```
POST /api/video/generate

Request Body:
{
  "topic": "How to fix water pump on 2013 Audi Q7",
  "options": {
    "targetDuration": 240,        // seconds (optional, default: auto)
    "voiceId": "default",          // voice selection (optional)
    "theme": "professional",       // slide theme (optional)
    "includeResearch": true        // return research data (optional)
  }
}

Response:
{
  "jobId": "uuid",
  "status": "processing",
  "estimatedTime": 180  // seconds
}
```

### Check Status

```
GET /api/video/:jobId

Response:
{
  "jobId": "uuid",
  "status": "completed",  // processing | completed | failed
  "progress": 100,
  "result": {
    "videoUrl": "https://s3.../video.mp4",
    "thumbnailUrl": "https://s3.../thumbnail.jpg",
    "metadata": {
      "title": "...",
      "description": "...",
      "tags": [...]
    },
    "duration": 240,
    "research": { ... }  // if includeResearch was true
  }
}
```

### Download Video

```
GET /api/video/:jobId/download

Response: 
- MP4 file stream
- Content-Type: video/mp4
- Content-Disposition: attachment; filename="video.mp4"
```

---

## Technology Stack

### Backend
- **Language:** TypeScript (Node.js)
- **Framework:** Fastify or Express
- **Queue:** Bull (Redis) for async video processing
- **Storage:** AWS S3 or local filesystem

### Research
- **AI:** Anthropic Claude API
- **Web Search:** Claude's web_search tool or custom scraper
- **YouTube Transcripts:** Filmot API (optional)

### Video Production
- **Script Generation:** Claude API
- **Slide Rendering:** 
  - Option A: Python + Pillow
  - Option B: node-canvas
  - Option C: Puppeteer (HTML → PNG)
  - Option D: Canva API
- **Text-to-Speech:** ElevenLabs, AWS Polly, or Google TTS
- **Video Assembly:** FFmpeg (via fluent-ffmpeg)
- **Thumbnail:** Sharp (image processing)

### Infrastructure
- **Local Dev:** Docker Compose
- **Production:** 
  - AWS Lambda (for API)
  - AWS Lambda (3GB RAM, 15min timeout for video processing)
  - AWS S3 (video storage)
  - AWS SQS (job queue)

---

## Project Structure

```
/video-generator
│
├── /src
│   ├── /api
│   │   ├── server.ts              # Express/Fastify app
│   │   └── routes.ts              # API endpoints
│   │
│   ├── /services
│   │   ├── research.ts            # Deep research orchestration
│   │   ├── script.ts              # Script generation
│   │   ├── slides.ts              # Slide creation & rendering
│   │   ├── audio.ts               # Text-to-speech
│   │   ├── video.ts               # FFmpeg assembly
│   │   ├── thumbnail.ts           # Thumbnail generation
│   │   └── metadata.ts            # Metadata generation
│   │
│   ├── /workers
│   │   └── video-processor.ts    # Bull queue consumer
│   │
│   └── /utils
│       ├── claude.ts              # Claude API wrapper
│       ├── storage.ts             # S3/filesystem abstraction
│       └── config.ts              # Environment config
│
├── /templates
│   └── /slides                    # Slide templates (if using HTML)
│
├── docker-compose.yml             # Local development
├── Dockerfile                     # Production container
├── package.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Basic Pipeline (Week 1)
**Goal:** Generate simple video from topic

**Tasks:**
1. Set up project structure
2. Implement research service (web search + Claude)
3. Script generation (Claude API)
4. Basic slide rendering (text-only, node-canvas)
5. Text-to-speech integration (ElevenLabs)
6. FFmpeg video assembly
7. API endpoint: `POST /generate`

**Success Criteria:**
- Input topic → Output MP4 video
- Video has slides + audio synchronized
- Process completes in <5 minutes

---

### Phase 2: Enhanced Visuals (Week 2)
**Goal:** Professional slide design

**Tasks:**
1. Design slide templates
2. Implement multiple slide types (list, stats, comparison)
3. Add theme support (colors, fonts)
4. Improve typography and layout
5. Add icons/emojis support

**Success Criteria:**
- Videos look professional
- Multiple themes available
- Consistent visual style

---

### Phase 3: Queue System (Week 3)
**Goal:** Handle concurrent requests

**Tasks:**
1. Set up Redis + Bull
2. Implement job queue for video processing
3. Add status polling endpoint
4. Handle failures and retries

**Success Criteria:**
- Can process multiple videos concurrently
- Jobs don't block API server
- Failed jobs retry automatically

---

### Phase 4: Storage & Delivery (Week 4)
**Goal:** Persistent storage

**Tasks:**
1. S3 integration for video storage
2. Thumbnail generation
3. Metadata generation
4. Download endpoint

**Success Criteria:**
- Videos stored permanently
- Direct download links work
- Thumbnails auto-generated

---

### Phase 5: Production Deployment (Week 5)
**Goal:** Deploy to AWS

**Tasks:**
1. Lambda function for API
2. Lambda function for video processing (high memory/timeout)
3. SQS queue
4. S3 bucket
5. API Gateway
6. CI/CD pipeline

**Success Criteria:**
- Production system handles requests
- Videos process successfully
- Cost-effective operation

---

## Configuration

### Environment Variables

```bash
# API
PORT=3000
NODE_ENV=development

# Storage
STORAGE_TYPE=s3  # or 'local'
AWS_REGION=us-east-1
S3_BUCKET=video-generator-outputs

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...

# Queue (Production)
REDIS_URL=redis://localhost:6379
AWS_SQS_QUEUE_URL=...

# Optional: YouTube Transcript Search
FILMOT_API_KEY=...

# Video Settings
DEFAULT_TARGET_DURATION=240  # seconds
DEFAULT_VOICE_ID=default
DEFAULT_THEME=professional
```

---

## Usage Examples

### Simple Usage (JavaScript)

```javascript
const response = await fetch('http://localhost:3000/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'How to make sourdough bread'
  })
});

const { jobId } = await response.json();

// Poll for completion
while (true) {
  const status = await fetch(`http://localhost:3000/api/video/${jobId}`);
  const { status: jobStatus, result } = await status.json();
  
  if (jobStatus === 'completed') {
    console.log('Video ready:', result.videoUrl);
    break;
  }
  
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

### Custom Options

```javascript
const response = await fetch('http://localhost:3000/api/video/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: 'Plan a Mickey Mouse birthday party for 4-year-old',
    options: {
      targetDuration: 180,        // 3 minutes
      voiceId: 'female-friendly', // Different voice
      theme: 'playful',           // Colorful theme
      includeResearch: true       // Get research data back
    }
  })
});
```

---

## Performance Targets

- **Research Phase:** <60 seconds
- **Script Generation:** <30 seconds
- **Slide Rendering:** <30 seconds
- **Audio Generation:** <30 seconds
- **Video Assembly:** <90 seconds
- **Total Time:** <4 minutes (for 4-minute video)

**Optimization Strategies:**
- Parallel processing where possible
- Cache research results for similar topics
- Pre-rendered slide templates
- FFmpeg hardware acceleration (if available)

---

## Cost Estimates (Per Video)

**AI Services:**
- Claude API (research + script): ~$0.10-0.30
- ElevenLabs TTS (600 words): ~$0.05

**Infrastructure (AWS):**
- Lambda execution (5 min): ~$0.01
- S3 storage (per month): ~$0.01
- Data transfer: ~$0.01

**Total per video:** ~$0.18-0.38

**Monthly (100 videos):** ~$18-38

---

## Integration Points

This tool can be integrated into:
1. **Experience-to-Commerce Platform** (as described in main handoff)
2. **Educational content creation** (course videos, tutorials)
3. **Marketing automation** (product explainers, social media)
4. **News summarization** (daily news roundup videos)
5. **Any content pipeline** requiring automated video generation

---

## Extensibility

### Custom Slide Renderers

```javascript
// Register custom slide renderer
slideEngine.registerRenderer('custom-type', async (slide, theme) => {
  // Your custom rendering logic
  return imagePath;
});
```

### Custom Voices

```javascript
// Add voice provider
audioEngine.registerProvider('custom-tts', async (text, options) => {
  // Your TTS integration
  return audioPath;
});
```

### Post-Processing Hooks

```javascript
// Add custom post-processing
videoEngine.addHook('post-assembly', async (videoPath) => {
  // Add watermark, intro/outro, etc.
  return modifiedVideoPath;
});
```

---

## Testing Strategy

### Unit Tests
- Research service (mocked APIs)
- Script generation (various topics)
- Slide rendering (all slide types)
- Audio generation (mocked TTS)

### Integration Tests
- Full pipeline (research → video)
- Queue processing
- S3 upload/download

### End-to-End Tests
- Generate video from real topic
- Validate video quality
- Check metadata accuracy

---

## Monitoring

**Key Metrics:**
- Videos generated (count)
- Average processing time
- Success/failure rate
- API response time
- Queue depth

**Alerts:**
- Processing time >10 minutes
- Failure rate >5%
- Queue depth >50

---

## Future Enhancements

1. **Multi-language support** - Auto-translate scripts
2. **Custom branding** - Logos, colors, fonts
3. **Video variations** - Generate multiple versions with different styles
4. **AI voice cloning** - Use custom voice samples
5. **Advanced animations** - Motion graphics, transitions
6. **Music tracks** - Background music selection
7. **Batch processing** - Generate multiple videos from CSV
8. **Video editing** - Trim, merge, add B-roll

---

## Support & Troubleshooting

**Common Issues:**

1. **FFmpeg not found**
   - Install: `apt-get install ffmpeg` or `brew install ffmpeg`
   - Verify: `ffmpeg -version`

2. **Out of memory during processing**
   - Increase Node.js memory: `--max-old-space-size=4096`
   - Use smaller slide dimensions
   - Process videos sequentially

3. **Audio/video sync issues**
   - Verify audio duration matches slide durations
   - Check FFmpeg filter timing calculations

4. **Slow processing**
   - Use faster TTS provider
   - Optimize slide rendering (pre-render templates)
   - Enable FFmpeg hardware acceleration

---

This standalone tool is designed to be:
- **Simple:** Single API call to generate video
- **Flexible:** Works for any topic or content type
- **Fast:** <5 minutes from topic to video
- **Quality:** Professional output ready for publishing
- **Extensible:** Easy to customize and enhance
