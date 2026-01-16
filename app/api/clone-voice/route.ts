import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, name, relationship, isCustom, language = 'pa' } = await request.json();

    // Download the audio file from Supabase
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();

    // Convert blob to base64 for ElevenLabs
    const buffer = await audioBlob.arrayBuffer();
    const base64Audio = Buffer.from(buffer).toString('base64');

    // Create FormData for ElevenLabs API
    const formData = new FormData();
    formData.append('name', name);
    formData.append('files', new Blob([buffer]), 'sample.webm');
    formData.append('description', `Voice clone for ${relationship} in ${language}`);

    // Add language parameter for voice cloning
    // ElevenLabs supports language-specific voice cloning
    formData.append('labels', JSON.stringify({ language }));

    // Call ElevenLabs voice cloning API
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error('Failed to clone voice with ElevenLabs');
    }

    const data = await response.json();

    return NextResponse.json({ voiceId: data.voice_id });
  } catch (error) {
    console.error('Error cloning voice:', error);
    return NextResponse.json(
      { error: 'Failed to clone voice' },
      { status: 500 }
    );
  }
}
