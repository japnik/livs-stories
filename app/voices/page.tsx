'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, Trash2, Upload } from 'lucide-react';
import { supabase, Voice } from '@/lib/supabase';

const PRESET_RELATIONSHIPS = [
  { id: 'mummy', label: 'Mummy' },
  { id: 'papa', label: 'Papa' },
  { id: 'dadu', label: 'Dadu' },
  { id: 'dadi', label: 'Dadi' },
  { id: 'nanu', label: 'Nanu' },
  { id: 'naani', label: 'Naani' },
];

export default function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadVoices();
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

  const startRecording = async (relationship: string, custom = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingFor(relationship);
      setIsCustom(custom);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVoice = async () => {
    if (!audioBlob || !recordingFor) return;

    if (isCustom && !customName.trim()) {
      alert('Please enter a name for the custom voice');
      return;
    }

    setIsUploading(true);

    try {
      // Upload audio to Supabase storage
      const fileName = `${Date.now()}-${recordingFor}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-samples')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('audio-samples')
        .getPublicUrl(fileName);

      // Clone voice with ElevenLabs
      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: urlData.publicUrl,
          name: isCustom ? customName : recordingFor,
          relationship: isCustom ? customName : recordingFor,
          isCustom,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clone voice');
      }

      const { voiceId } = await response.json();

      // Save to database
      const { error: dbError } = await supabase.from('voices').insert({
        name: isCustom ? customName : recordingFor,
        relationship: isCustom ? 'custom' : recordingFor,
        elevenlabs_voice_id: voiceId,
        is_custom: isCustom,
        audio_sample_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      alert('Voice cloned successfully!');
      setAudioBlob(null);
      setRecordingFor(null);
      setCustomName('');
      setIsCustom(false);
      loadVoices();
    } catch (error) {
      console.error('Error uploading voice:', error);
      alert('Failed to clone voice. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteVoice = async (voice: Voice) => {
    if (!confirm(`Are you sure you want to delete ${voice.name}?`)) return;

    try {
      // Delete from ElevenLabs
      if (voice.elevenlabs_voice_id) {
        await fetch('/api/delete-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId: voice.elevenlabs_voice_id }),
        });
      }

      // Delete from database
      const { error } = await supabase.from('voices').delete().eq('id', voice.id);

      if (error) throw error;

      loadVoices();
    } catch (error) {
      console.error('Error deleting voice:', error);
      alert('Failed to delete voice');
    }
  };

  const getVoiceByRelationship = (relationship: string) => {
    return voices.find(
      (v) => v.relationship.toLowerCase() === relationship.toLowerCase()
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <button className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-900 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Stories
            </button>
          </Link>
          <h1 className="text-4xl font-bold text-purple-900 mb-2">
            Manage Voices
          </h1>
          <p className="text-lg text-purple-700">
            Record and save voices of loved ones
          </p>
        </div>

        {/* Preset Relationships */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-purple-900 mb-4">
            Family Voices
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PRESET_RELATIONSHIPS.map((preset) => {
              const voice = getVoiceByRelationship(preset.id);
              return (
                <div
                  key={preset.id}
                  className="p-4 border-2 border-gray-200 rounded-xl"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{preset.label}</h3>
                    {voice && (
                      <button
                        onClick={() => deleteVoice(voice)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {voice ? (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ Voice saved
                    </div>
                  ) : (
                    <button
                      onClick={() => startRecording(preset.id)}
                      disabled={isRecording}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                    >
                      <Mic className="w-4 h-4" />
                      Record
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Voice */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-purple-900 mb-4">
            Custom Voice
          </h2>
          <div className="space-y-4">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter name (e.g., Uncle John, Aunt Sarah)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => customName.trim() && startRecording('custom', true)}
              disabled={isRecording || !customName.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              <Mic className="w-5 h-5" />
              Record Custom Voice
            </button>
          </div>

          {/* Existing Custom Voices */}
          {voices.filter((v) => v.is_custom).length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Saved Custom Voices</h3>
              <div className="space-y-2">
                {voices
                  .filter((v) => v.is_custom)
                  .map((voice) => (
                    <div
                      key={voice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium">{voice.name}</span>
                      <button
                        onClick={() => deleteVoice(voice)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Recording Modal */}
        {isRecording && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Recording...
                </h3>
                <p className="text-gray-600 mb-6">
                  Please read a short paragraph in a clear voice. This will be used to
                  clone the voice.
                </p>
                <button
                  onClick={stopRecording}
                  className="w-full px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600"
                >
                  Stop Recording
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {audioBlob && !isRecording && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Review Recording
              </h3>
              <audio
                controls
                className="w-full mb-6"
                src={URL.createObjectURL(audioBlob)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setRecordingFor(null);
                    setCustomName('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadVoice}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {isUploading ? 'Saving...' : 'Save Voice'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
