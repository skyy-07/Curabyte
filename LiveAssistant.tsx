
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { Mic, X, Volume2 } from 'lucide-react';
import { decode, decodeAudioData, createBlob } from '../services/audioUtils';
import { Ingredient } from '../types';

interface LiveAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  stats: { steps: number; burned: number };
  inventory: Ingredient[];
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ isOpen, onClose, stats, inventory }) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Keep refs of stats and inventory so the live callback always sees "fresh" data
  const latestStats = useRef(stats);
  const latestInventory = useRef(inventory);

  useEffect(() => {
    latestStats.current = stats;
    latestInventory.current = inventory;
  }, [stats, inventory]);

  useEffect(() => {
    if (isOpen) {
      startSession();
    }
    return () => stopSession();
  }, [isOpen]);

  const getLiveDataFunctionDeclaration: FunctionDeclaration = {
    name: 'get_live_data',
    parameters: {
      type: Type.OBJECT,
      description: 'Fetch the most up-to-date health statistics and fridge inventory.',
      properties: {},
    },
  };

  const startSession = async () => {
    if (isActive) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Ensure contexts are running (vital for mobile browsers)
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const systemInstruction = `
        You are the SmartFridge AI Voice Assistant.
        You have access to a tool 'get_live_data' to see the user's current health stats and fridge items.
        Always call this tool if the user asks "how many steps", "how many calories", or "what is in my fridge".
        Be motivating, concise, and helpful.
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls
            // FIX: Safely access functionCalls with optional chaining
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls) {
              for (const fc of functionCalls) {
                if (fc.name === 'get_live_data') {
                  const response = {
                    steps: latestStats.current.steps,
                    calories_burned: latestStats.current.burned,
                    inventory: latestInventory.current.map(i => i.name),
                  };
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        id: fc.id,
                        name: fc.name,
                        response: { result: response },
                      }]
                    });
                  });
                }
              }
            }

            // Handle Audio Output
            // FIX: Safely access parts array with optional chaining `parts?.[0]`
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const oCtx = audioContextsRef.current?.output;
              if (oCtx && oCtx.state !== 'closed') {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, oCtx.currentTime);
                try {
                  const audioBuffer = await decodeAudioData(decode(base64Audio), oCtx, 24000, 1);
                  const source = oCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(oCtx.destination);
                  source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setIsSpeaking(false);
                  });
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                } catch (e) {
                  console.error("Audio decoding error", e);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => console.error("Live API Error:", e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [getLiveDataFunctionDeclaration] }],
          systemInstruction,
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start Live Session:", err);
      onClose();
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => {
        try { s.close(); } catch (e) {}
      });
      sessionRef.current = null;
    }

    if (audioContextsRef.current) {
      const { input, output } = audioContextsRef.current;
      // Critical Fix: Check state before closing to avoid "Cannot close a closed AudioContext"
      if (input.state !== 'closed') {
        input.close().catch(() => {});
      }
      if (output.state !== 'closed') {
        output.close().catch(() => {});
      }
      audioContextsRef.current = null;
    }

    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    setIsActive(false);
    setIsSpeaking(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>

        <div className="mb-8">
          <div className={`h-32 w-32 rounded-full flex items-center justify-center relative ${isActive ? 'bg-blue-50' : 'bg-slate-50'}`}>
            {isActive && (
              <>
                <div className={`absolute inset-0 rounded-full bg-blue-400/20 animate-ping ${isSpeaking ? 'duration-700' : 'duration-1000'}`} />
                <div className={`absolute inset-0 rounded-full border-2 border-blue-500/30 animate-pulse`} />
              </>
            )}
            <div className={`h-24 w-24 rounded-full flex items-center justify-center shadow-inner ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {isSpeaking ? <Volume2 size={40} className="animate-bounce" /> : <Mic size={40} />}
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isActive ? (isSpeaking ? "AI is Speaking..." : "Listening...") : "Connecting..."}
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          Ask me: "What are my stats?"<br/>
          "What can I cook right now?"
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-slate-50 p-3 rounded-2xl">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Live Steps</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{stats.steps.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl">
            <div className="text-xs text-slate-400 uppercase font-bold tracking-tighter">Calories</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{stats.burned}</div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          End Conversation
        </button>
      </div>
    </div>
  );
};

export default LiveAssistant;
