import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { voiceId, prompt, language = 'en' } = await request.json();

    // Get voice details from database
    const { data: voice, error: voiceError } = await supabase
      .from('voices')
      .select('*')
      .eq('id', voiceId)
      .single();

    if (voiceError || !voice) {
      throw new Error('Voice not found');
    }

    // Determine story language based on voice language or provided language
    const storyLanguage = voice.language || language;
    const isPunjabi = storyLanguage === 'pa';

    // Generate story using OpenAI with language support
    const systemPrompt = isPunjabi
      ? `ਤੁਸੀਂ ਇੱਕ ਰਚਨਾਤਮਕ ਬੱਚਿਆਂ ਦੀ ਕਹਾਣੀ ਲੇਖਕ ਹੋ। ਲਿਵ ਨਾਮ ਦੀ ਇੱਕ ਛੋਟੀ ਕੁੜੀ ਲਈ ਦਿਲਚਸਪ, ਉਮਰ ਦੇ ਅਨੁਕੂਲ ਕਹਾਣੀਆਂ ਬਣਾਓ। ਕਹਾਣੀਆਂ ਨਿੱਘੀਆਂ, ਕਲਪਨਾਤਮਕ, ਅਤੇ ਸੌਣ ਦੇ ਸਮੇਂ ਜਾਂ ਖੇਡਣ ਦੇ ਸਮੇਂ ਲਈ ਢੁਕਵੀਆਂ ਹੋਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ। ਕਹਾਣੀਆਂ 200-300 ਸ਼ਬਦਾਂ ਦੇ ਵਿਚਕਾਰ ਰੱਖੋ। ਲਿਵ ਨੂੰ ਮੁੱਖ ਕਿਰਦਾਰ ਅਤੇ ਕਹਾਣੀ ਦੀ ਨਾਇਕਾ ਬਣਾਓ। ਕਹਾਣੀ ਪੰਜਾਬੀ ਵਿੱਚ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`
      : `You are a creative children's story writer. Create engaging, age-appropriate stories for a baby girl named Liv. The stories should be warm, imaginative, and suitable for bedtime or playtime. Keep stories between 200-300 words. Make Liv the main character and hero of the story.`;

    const userPrompt = isPunjabi
      ? `ਇਸ ਬਾਰੇ ਇੱਕ ਕਹਾਣੀ ਬਣਾਓ: ${prompt}. ਯਾਦ ਰੱਖੋ ਕਿ ਲਿਵ ਨੂੰ ਮੁੱਖ ਕਿਰਦਾਰ ਬਣਾਉਣਾ ਹੈ। ਕਹਾਣੀ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ।`
      : `Create a story about: ${prompt}. Remember to make Liv the main character.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const storyText = completion.choices[0].message.content || '';

    // Use v3 model for both languages (latest preview model)
    const ttsModelId = 'eleven_v3';

    // Generate audio using ElevenLabs with language support
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenlabs_voice_id}`,
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
      storyText,
      audioUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Error generating story:', error);
    return NextResponse.json(
      { error: 'Failed to generate story' },
      { status: 500 }
    );
  }
}
