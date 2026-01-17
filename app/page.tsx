'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Sparkles, Mic, Play, StopCircle, RotateCcw, X } from 'lucide-react';
import { supabase, Voice, Story } from '@/lib/supabase';

const PRESET_RELATIONSHIPS = [
  { id: 'mummy', label: 'Mummy', emoji: '👩', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mummy&backgroundColor=b6e3f4' },
  { id: 'papa', label: 'Papa', emoji: '👳‍♂️', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Papa&backgroundColor=ffdfbf&accessories=prescription01&top=turban' },
  { id: 'dadu', label: 'Dadu', emoji: '👳‍♂️', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dadu&backgroundColor=d1d4f9&accessories=prescription02&top=turban&facialHair=beardMajestic' },
  { id: 'dadi', label: 'Dadi', emoji: '👵', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dadi&backgroundColor=ffd5dc&top=hijab' },
  { id: 'nanu', label: 'Nanu', emoji: '👳‍♂️', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nanu&backgroundColor=c0aede&accessories=prescription01&top=turban&facialHair=beardMedium' },
  { id: 'naani', label: 'Naani', emoji: '👵', imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naani&backgroundColor=ffeaa7&top=hijab' },
];

const PUNJABI_TRANSCRIPT = `ਮੇਰੀ ਪਿਆਰੀ ਲਿਵ, ਤੂੰ ਸਾਡੇ ਪਰਿਵਾਰ ਦਾ ਸਭ ਤੋਂ ਕੀਮਤੀ ਤੋਹਫ਼ਾ ਹੈਂ। ਹਰ ਦਿਨ ਤੇਰੇ ਨਾਲ ਇੱਕ ਨਵਾਂ ਅਨੁਭਵ ਹੈ। ਮੈਂ ਤੈਨੂੰ ਬਹੁਤ ਪਿਆਰ ਕਰਦੀ ਹਾਂ।`;

const RANDOM_STORY_PROMPTS = [
  'A magical adventure where Liv discovers a secret garden',
  'Liv meets a friendly talking animal in the forest',
  'A bedtime story about Liv traveling to the moon',
  'Liv goes on a treasure hunt with her family',
  'A story about Liv learning to be brave',
];

export default function Home() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [storyLanguage, setStoryLanguage] = useState<'en' | 'pa'>('pa'); // Default to Punjabi

  // Voice recording modal state
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<typeof PRESET_RELATIONSHIPS[0] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadVoices();
    loadStories();
  }, []);

  const loadVoices = async () => {
    const { data, error } = await supabase
      .from('voices')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading voices:', error);
      return;
    }

    setVoices(data || []);
  };

  const loadStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stories:', error);
      return;
    }

    setStories(data || []);
  };

  const getVoiceByRelationship = (relationship: string) => {
    return voices.find(
      (v) => v.relationship.toLowerCase() === relationship.toLowerCase()
    );
  };

  const handlePersonClick = async (preset: typeof PRESET_RELATIONSHIPS[0]) => {
    const voice = getVoiceByRelationship(preset.id);

    if (!voice) {
      // No voice set up - show recording modal
      setSelectedRelationship(preset);
      setShowRecordingModal(true);
    } else {
      // Voice exists - generate story immediately
      await generateStoryForVoice(voice);
    }
  };

  const generateStoryForVoice = async (voice: Voice) => {
    setIsGenerating(true);
    setGeneratedAudio(null);
    setStoryText(null);

    // Pick a random story prompt
    const randomPrompt = RANDOM_STORY_PROMPTS[Math.floor(Math.random() * RANDOM_STORY_PROMPTS.length)];

    try {
      // Step 1: Generate story text
      setLoadingMessage(storyLanguage === 'pa' ? 'ਕਹਾਣੀ ਲਿਖੀ ਜਾ ਰਹੀ ਹੈ...' : 'Writing your story...');

      const textResponse = await fetch('/api/generate-story-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: voice.id,
          prompt: randomPrompt,
          language: storyLanguage,
        }),
      });

      if (!textResponse.ok) {
        throw new Error('Failed to generate story text');
      }

      const textData = await textResponse.json();
      setStoryText(textData.storyText);

      // Step 2: Generate audio from story text
      setLoadingMessage(storyLanguage === 'pa' ? 'ਆਵਾਜ਼ ਬਣਾਈ ਜਾ ਰਹੀ ਹੈ...' : 'Creating audio...');

      const audioResponse = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyText: textData.storyText,
          voiceId: textData.voiceId,
          elevenlabsVoiceId: textData.elevenlabsVoiceId,
          language: textData.language,
          prompt: randomPrompt,
        }),
      });

      if (!audioResponse.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioData = await audioResponse.json();
      setGeneratedAudio(audioData.audioUrl);

      // Reload stories list to show the new story
      await loadStories();
    } catch (error) {
      console.error('Error generating story:', error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const reRecord = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const submitVoiceClone = async () => {
    if (!audioBlob || !selectedRelationship) return;

    setIsCloning(true);

    try {
      // Upload audio to Supabase storage
      const fileName = `${selectedRelationship.id}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(fileName);

      // Clone voice via API
      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: publicUrl,
          name: selectedRelationship.label,
          relationship: selectedRelationship.id,
          isCustom: false,
          language: 'pa', // Punjabi
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clone voice');
      }

      const { voiceId } = await response.json();

      // Save to database
      const { error: dbError } = await supabase
        .from('voices')
        .insert({
          name: selectedRelationship.label,
          relationship: selectedRelationship.id,
          elevenlabs_voice_id: voiceId,
          audio_sample_url: publicUrl,
          is_custom: false,
        });

      if (dbError) throw dbError;

      // Reload voices and close modal
      await loadVoices();
      setShowRecordingModal(false);
      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedRelationship(null);

      alert('Voice cloned successfully! Click the person again to generate a story.');
    } catch (error) {
      console.error('Error cloning voice:', error);
      alert('Failed to clone voice. Please try again.');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-purple-900 mb-2">
            Liv&apos;s Story Time ✨
          </h1>
          <p className="text-lg text-purple-700">
            Click anyone to hear a magical story
          </p>

          {/* Language Toggle */}
          <div className="mt-4 inline-flex items-center gap-2 bg-white rounded-full p-1 shadow-sm border border-purple-200">
            <button
              onClick={() => setStoryLanguage('en')}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                storyLanguage === 'en'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setStoryLanguage('pa')}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                storyLanguage === 'pa'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              ਪੰਜਾਬੀ
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-purple-900 mb-4">
            Who will tell the story?
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {PRESET_RELATIONSHIPS.map((preset) => {
              const voice = getVoiceByRelationship(preset.id);

              return (
                <button
                  key={preset.id}
                  onClick={() => handlePersonClick(preset)}
                  disabled={isGenerating || isCloning}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-100 relative">
                    <Image
                      src={preset.imageUrl}
                      alt={preset.label}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="font-medium text-gray-900">{preset.label}</div>
                  {!voice && (
                    <div className="text-xs text-purple-600 mt-1 font-medium">Tap to set up</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-purple-500 animate-pulse" />
              </div>
              <p className="text-xl font-semibold text-purple-900 animate-pulse">
                {loadingMessage}
              </p>
              <p className="text-sm text-purple-600 mt-2">
                {loadingMessage.includes('Writing') || loadingMessage.includes('ਲਿਖੀ')
                  ? 'Step 1 of 2: Writing the story (5-10 seconds)...'
                  : 'Step 2 of 2: Generating high-quality audio (20-30 seconds)...'}
              </p>
            </div>
          </div>
        )}

        {/* Audio Player */}
        {generatedAudio && !isGenerating && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-purple-900 mb-4">
              Your Story is Ready! 🎉
            </h2>
            {storyText && (
              <div className="mb-4 p-4 bg-purple-50 rounded-xl">
                <p className="text-gray-700 leading-relaxed">{storyText}</p>
              </div>
            )}
            <audio controls autoPlay className="w-full" src={generatedAudio}>
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Stories List */}
        {stories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-purple-900 mb-4">
              Previous Stories 📚
            </h2>
            <div className="space-y-4">
              {stories.map((story) => {
                const voice = voices.find(v => v.id === story.voice_id);
                return (
                  <div key={story.id} className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{story.title}</h3>
                        {voice && (
                          <p className="text-xs text-purple-600 mb-2">
                            Narrated by {voice.name}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 line-clamp-2 mb-3">{story.content}</p>
                      </div>
                    </div>
                    {story.audio_url && (
                      <audio controls className="w-full" src={story.audio_url}>
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(story.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recording Modal */}
        {showRecordingModal && selectedRelationship && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
              <button
                onClick={() => {
                  setShowRecordingModal(false);
                  setAudioBlob(null);
                  setAudioUrl(null);
                  setIsRecording(false);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-purple-900 mb-2">
                Set up {selectedRelationship.label}&apos;s Voice
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Record your voice reading the text below in Punjabi
              </p>

              <div className="bg-purple-50 p-4 rounded-xl mb-4 border-2 border-purple-200">
                <p className="text-lg leading-relaxed text-gray-800" style={{ direction: 'rtl' }}>
                  {PUNJABI_TRANSCRIPT}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Make sure there is no background noise while recording
                </p>
              </div>

              {!audioBlob ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isCloning}
                    className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <StopCircle className="w-5 h-5" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        Start Recording
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <audio controls src={audioUrl || undefined} className="w-full" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={reRecord}
                      disabled={isCloning}
                      className="flex-1 py-3 rounded-xl font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Re-record
                    </button>
                    <button
                      onClick={submitVoiceClone}
                      disabled={isCloning}
                      className="flex-1 py-3 rounded-xl font-semibold bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCloning ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          Cloning...
                        </>
                      ) : (
                        'Submit & Clone Voice'
                      )}
                    </button>
                  </div>
                  {isCloning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800 text-center animate-pulse">
                        Creating voice clone... This may take 30-60 seconds
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
