import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { storyText, voiceId, elevenlabsVoiceId, language, prompt } = await request.json();

    const isPunjabi = language === 'pa';

    // Use eleven_v3 model as requested
    const ttsModelId = 'eleven_v3';

    // Generate audio using ElevenLabs with language support
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: storyText,
          model_id: ttsModelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          ...(isPunjabi && { language_code: 'pa' }), // Add language code for Punjabi
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs TTS error:', errorText);
      throw new Error('Failed to generate audio');
    }

    // Get audio as blob
    const audioBlob = await ttsResponse.blob();

    // Upload to Supabase storage
    const fileName = `story-${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('story-audio')
      .upload(fileName, audioBlob);

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('story-audio')
      .getPublicUrl(fileName);

    // Save story to database
    const { error: dbError } = await supabase.from('stories').insert({
      title: prompt.slice(0, 100),
      content: storyText,
      voice_id: voiceId,
      audio_url: urlData.publicUrl,
    });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return NextResponse.json({
      audioUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
