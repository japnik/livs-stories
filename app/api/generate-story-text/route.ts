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
      ? `ਤੁਸੀਂ ਇੱਕ ਰਚਨਾਤਮਕ ਬੱਚਿਆਂ ਦੀ ਕਹਾਣੀ ਲੇਖਕ ਹੋ। ਲਿਵ ਨਾਮ ਦੀ ਇੱਕ ਛੋਟੀ ਕੁੜੀ ਲਈ ਦਿਲਚਸਪ, ਉਮਰ ਦੇ ਅਨੁਕੂਲ ਕਹਾਣੀਆਂ ਬਣਾਓ। ਕਹਾਣੀਆਂ ਨਿੱਘੀਆਂ, ਕਲਪਨਾਤਮਕ, ਅਤੇ ਸੌਣ ਦੇ ਸਮੇਂ ਜਾਂ ਖੇਡਣ ਦੇ ਸਮੇਂ ਲਈ ਢੁਕਵੀਆਂ ਹੋਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ। ਕਹਾਣੀਆਂ 70-100 ਸ਼ਬਦਾਂ ਦੇ ਵਿਚਕਾਰ ਰੱਖੋ - ਬਹੁਤ ਛੋਟੀਆਂ ਅਤੇ ਮਿੱਠੀਆਂ। ਲਿਵ ਨੂੰ ਮੁੱਖ ਕਿਰਦਾਰ ਅਤੇ ਕਹਾਣੀ ਦੀ ਨਾਇਕਾ ਬਣਾਓ। ਕਹਾਣੀ ਪੰਜਾਬੀ ਵਿੱਚ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`
      : `You are a creative children's story writer. Create engaging, age-appropriate stories for a baby girl named Liv. The stories should be warm, imaginative, and suitable for bedtime or playtime. Keep stories between 70-100 words - very short and sweet. Make Liv the main character and hero of the story.`;

    const userPrompt = isPunjabi
      ? `ਇਸ ਬਾਰੇ ਇੱਕ ਕਹਾਣੀ ਬਣਾਓ: ${prompt}. ਯਾਦ ਰੱਖੋ ਕਿ ਲਿਵ ਨੂੰ ਮੁੱਖ ਕਿਰਦਾਰ ਬਣਾਉਣਾ ਹੈ। ਕਹਾਣੀ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ।`
      : `Create a story about: ${prompt}. Remember to make Liv the main character.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper than gpt-4
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

    return NextResponse.json({
      storyText,
      voiceId,
      elevenlabsVoiceId: voice.elevenlabs_voice_id,
      language: storyLanguage,
    });
  } catch (error) {
    console.error('Error generating story text:', error);
    return NextResponse.json(
      { error: 'Failed to generate story text' },
      { status: 500 }
    );
  }
}
