import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Voice = {
  id: string;
  name: string;
  relationship: string;
  elevenlabs_voice_id?: string;
  is_custom: boolean;
  audio_sample_url?: string;
  language?: string;
  created_at: string;
  updated_at: string;
};

export type Story = {
  id: string;
  title: string;
  content: string;
  voice_id?: string;
  audio_url?: string;
  created_at: string;
};
