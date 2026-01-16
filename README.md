# Liv's Story Time

A personalized audio storytelling web app for baby Liv, featuring AI-generated stories narrated in the voices of loved ones using voice cloning technology.

## Features

- **Voice Cloning**: Record and clone voices of family members (Mummy, Papa, Dadu, Dadi, Nanu, Naani)
- **Custom Voices**: Add additional custom voices for other loved ones
- **AI Story Generation**: Generate personalized stories with Liv as the main character using OpenAI
- **Text-to-Speech**: Convert stories to audio using cloned voices via ElevenLabs
- **Story Library**: All stories are saved with audio for playback anytime

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Database & Storage**: Supabase
- **AI Story Generation**: OpenAI GPT-4
- **Voice Cloning & TTS**: ElevenLabs API

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- An ElevenLabs account with API key
- An OpenAI account with API key
- A Supabase project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd livs-stories
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your URL and anon key
3. Go to SQL Editor and run the schema from `supabase-schema.sql`
4. The schema will create:
   - `voices` table for storing voice clone information
   - `stories` table for storing generated stories
   - `audio-samples` storage bucket for voice recordings
   - `story-audio` storage bucket for generated story audio

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Fill in your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

#### Getting API Keys:

**ElevenLabs:**
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign in to your account
3. Go to Profile Settings > API Keys
4. Copy your API key

**OpenAI:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in and go to API Keys
3. Create a new secret key
4. Copy the key immediately (it won't be shown again)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage Guide

### Setting Up Voices

1. Click "Manage Voices" on the home page
2. For each family member (Mummy, Papa, etc.):
   - Click the "Record" button
   - Allow microphone access when prompted
   - Read a short paragraph clearly (30-60 seconds is ideal)
   - Click "Stop Recording"
   - Review the recording and click "Save Voice"
3. The voice will be cloned and saved for use in stories

### Creating a Custom Voice

1. Go to Manage Voices page
2. Enter a name in the "Custom Voice" section (e.g., "Uncle John")
3. Click "Record Custom Voice"
4. Follow the same recording process
5. The custom voice will appear in the main story page

### Generating Stories

1. On the home page, select a voice by clicking on the person's button
2. Enter a story prompt in the text area (e.g., "A magical adventure in a candy forest")
3. Click "Generate Story"
4. Wait for the AI to generate the story and convert it to audio
5. Listen to the story using the audio player
6. The story is automatically saved for future playback

## Project Structure

```
livs-stories/
├── app/
│   ├── api/
│   │   ├── clone-voice/     # Voice cloning endpoint
│   │   ├── delete-voice/    # Voice deletion endpoint
│   │   └── generate-story/  # Story generation endpoint
│   ├── voices/              # Voice management page
│   └── page.tsx             # Main story generation page
├── lib/
│   └── supabase.ts          # Supabase client configuration
├── supabase-schema.sql      # Database schema
└── .env.local.example       # Environment variables template
```

## API Routes

### POST /api/clone-voice
Clones a voice using ElevenLabs API and saves it to the database.

**Body:**
```json
{
  "audioUrl": "string",
  "name": "string",
  "relationship": "string",
  "isCustom": boolean
}
```

### POST /api/delete-voice
Deletes a voice from ElevenLabs and the database.

**Body:**
```json
{
  "voiceId": "string"
}
```

### POST /api/generate-story
Generates a story using OpenAI and converts it to audio using ElevenLabs.

**Body:**
```json
{
  "voiceId": "string",
  "prompt": "string"
}
```

## Troubleshooting

### Microphone Access Issues
- Ensure your browser has permission to access the microphone
- Try using HTTPS or localhost (some browsers restrict microphone on HTTP)

### Voice Cloning Failed
- Ensure the audio recording is at least 30 seconds long
- Check that your ElevenLabs API key is valid and has available credits
- ElevenLabs requires clear, high-quality audio for best results

### Story Generation Failed
- Verify your OpenAI API key is correct and has available credits
- Check the browser console for detailed error messages
- Ensure your Supabase storage buckets are properly configured

### Audio Playback Issues
- Check that the Supabase storage buckets are set to public
- Verify CORS settings in Supabase if accessing from a different domain

## Cost Considerations

- **ElevenLabs**: Voice cloning and TTS consume credits based on usage
- **OpenAI**: GPT-4 API calls are charged per token
- **Supabase**: Free tier includes 500MB storage and 2GB bandwidth

## Future Enhancements

- Story categories (adventure, bedtime, learning, etc.)
- Story history and favorites
- Multiple language support
- Story sharing with family members
- Background music for stories
- Image generation to accompany stories

## License

This is a personal project for family use.

## Support

For issues or questions, please check the documentation for:
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [ElevenLabs](https://elevenlabs.io/docs)
- [OpenAI](https://platform.openai.com/docs)
