-- Create voices table to store voice clone information
CREATE TABLE IF NOT EXISTS voices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL, -- 'Mummy', 'Papa', 'Dadu', 'Dadi', 'Nanu', 'Naani', or custom
    elevenlabs_voice_id TEXT, -- Voice ID from ElevenLabs after cloning
    is_custom BOOLEAN DEFAULT FALSE,
    audio_sample_url TEXT, -- URL to the original audio sample used for cloning
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create stories table to store generated stories
CREATE TABLE IF NOT EXISTS stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- The generated story text
    voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
    audio_url TEXT, -- URL to the generated audio file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-samples', 'audio-samples', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('story-audio', 'story-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - you can restrict later)
CREATE POLICY "Enable all access to voices" ON voices
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access to stories" ON stories
    FOR ALL USING (true) WITH CHECK (true);

-- Create storage policies
CREATE POLICY "Enable public access to audio-samples" ON storage.objects
    FOR ALL USING (bucket_id = 'audio-samples') WITH CHECK (bucket_id = 'audio-samples');

CREATE POLICY "Enable public access to story-audio" ON storage.objects
    FOR ALL USING (bucket_id = 'story-audio') WITH CHECK (bucket_id = 'story-audio');
