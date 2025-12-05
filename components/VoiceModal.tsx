import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AnimalDetails } from '../types';

interface VoiceModalProps {
  animalData: AnimalDetails;
  onClose: () => void;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({ animalData, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Audio Contexts and Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Audio Scheduling
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    startSession();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      // Input: 16kHz for Gemini input
      // Output: 24kHz for Gemini output
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect to Gemini Live
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are a friendly expert zoologist. The user is looking at a ${animalData.commonName} (${animalData.scientificName}).
          
          Context about the animal:
          - Description: ${animalData.description}
          - Habitat: ${animalData.habitat}
          - Diet: ${animalData.diet}
          - Fun Fact: ${animalData.funFact}

          Answer questions about this animal naturally and enthusiastically. Keep responses relatively short and conversational suitable for voice chat.`,
        },
        callbacks: {
          onopen: () => {
            if (isMountedRef.current) {
              setStatus('listening');
              setupAudioInput();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!isMountedRef.current) return;

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus('speaking');
              await playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              stopAllAudio();
              setStatus('listening');
            }

            // If turn complete, likely waiting for user now
            if (message.serverContent?.turnComplete) {
              setStatus('listening');
            }
          },
          onclose: () => {
            console.log('Session closed');
          },
          onerror: (err) => {
            console.error('Session error', err);
            if (isMountedRef.current) {
              setStatus('error');
              setErrorMessage('Connection lost.');
            }
          },
        },
      });

    } catch (err) {
      console.error("Failed to start voice session", err);
      setStatus('error');
      setErrorMessage('Could not access microphone or connect to AI.');
    }
  };

  const setupAudioInput = () => {
    if (!inputContextRef.current || !streamRef.current || !sessionPromiseRef.current) return;

    const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
    sourceNodeRef.current = source;
    
    // Create ScriptProcessor for raw PCM access
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!isMountedRef.current) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);

      sessionPromiseRef.current!.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!outputContextRef.current || !outputNodeRef.current) return;

    try {
      // Decode base64 to byte array
      const audioData = decode(base64Audio);
      
      // Decode raw PCM to AudioBuffer
      // Note: Gemini sends raw PCM, so we need a custom decoder, 
      // but for simplicity and robustness with standard web APIs, 
      // the helper function below handles the Float32 conversion.
      const audioBuffer = await decodeAudioData(audioData, outputContextRef.current, 24000, 1);

      // Schedule playback
      // Ensure we don't schedule in the past
      nextStartTimeRef.current = Math.max(
        nextStartTimeRef.current,
        outputContextRef.current.currentTime
      );

      const source = outputContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNodeRef.current);
      
      source.addEventListener('ended', () => {
        sourcesRef.current.delete(source);
        if (sourcesRef.current.size === 0 && isMountedRef.current) {
            // Slight delay to ensure status update feels natural
            setTimeout(() => {
                if(status === 'speaking') setStatus('listening');
            }, 200);
        }
      });

      source.start(nextStartTimeRef.current);
      sourcesRef.current.add(source);

      // Advance time cursor
      nextStartTimeRef.current += audioBuffer.duration;

    } catch (e) {
      console.error("Error playing audio chunk", e);
    }
  };

  const stopAllAudio = () => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    if (outputContextRef.current) {
        nextStartTimeRef.current = outputContextRef.current.currentTime;
    }
  };

  const cleanup = () => {
    // Close session
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close()).catch(() => {});
    }

    // Stop tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Disconnect nodes
    if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();

    // Close contexts
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
  };

  // --- Helpers from GenAI SDK Documentation ---

  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      // Scale Float32 (-1.0 to 1.0) to Int16
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg p-8 flex flex-col items-center justify-center relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-0 right-4 text-white/50 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Visualizer */}
        <div className="relative mb-8">
          {/* Outer glow */}
          <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500
            ${status === 'speaking' ? 'bg-emerald-500/50 scale-150' : 
              status === 'listening' ? 'bg-blue-500/30 scale-110' : 
              'bg-slate-500/20 scale-100'}`} 
          />
          
          {/* Main Orb */}
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
            ${status === 'speaking' ? 'bg-emerald-500 scale-110 animate-pulse' : 
              status === 'listening' ? 'bg-blue-500 scale-100' : 
              status === 'error' ? 'bg-red-500' : 'bg-slate-700'}`}
          >
            {status === 'connecting' && (
               <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            )}
            
            {status !== 'connecting' && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>
        </div>

        {/* Text Status */}
        <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">
          {status === 'connecting' && 'Connecting...'}
          {status === 'listening' && 'Listening...'}
          {status === 'speaking' && 'Speaking...'}
          {status === 'error' && 'Connection Failed'}
        </h3>
        
        <p className="text-slate-400 text-center max-w-xs mb-8">
          {status === 'error' 
            ? errorMessage 
            : `Ask about the ${animalData.commonName}. Tap 'End' to close.`
          }
        </p>

        {/* Controls */}
        <button 
          onClick={onClose}
          className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 rounded-full font-medium transition-all"
        >
          End Voice Session
        </button>

      </div>
    </div>
  );
};
