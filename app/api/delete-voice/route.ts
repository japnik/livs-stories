import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { voiceId } = await request.json();

    // Delete voice from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${voiceId}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error('Failed to delete voice from ElevenLabs');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting voice:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice' },
      { status: 500 }
    );
  }
}
