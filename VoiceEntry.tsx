
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, X, Check, Edit2, Trash2, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { parseVoiceIngredients } from '../services/geminiService';
import { Ingredient, IngredientCategory } from '../types';

interface VoiceEntryProps {
  onIngredientsDetected: (ingredients: Ingredient[]) => void;
  onClose: () => void;
}

type EntryMode = 'initial' | 'recording' | 'processing' | 'review';

const VoiceEntry: React.FC<VoiceEntryProps> = ({ onIngredientsDetected, onClose }) => {
  const [mode, setMode] = useState<EntryMode>('initial');
  const [detectedItems, setDetectedItems] = useState<Ingredient[]>([]);
  
  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopVisualization();
    };
  }, []);

  const startVisualization = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    // Critical Performance Fix: Close existing context before creating a new one
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Gradient color based on height
        const r = barHeight + 25 * (i / bufferLength);
        const g = 250 * (i / bufferLength);
        const b = 50;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        // Center the bars vertically
        const y = (canvas.height - barHeight) / 2;
        
        // Draw rounded pill shape
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 2, barHeight, 5);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    draw();
  };

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Explicitly close the AudioContext to prevent memory leaks/CPU usage
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream; // Store ref for cleanup
      startVisualization(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopVisualization();
        setMode('processing');
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          try {
            const ingredients = await parseVoiceIngredients(base64String);
            setDetectedItems(ingredients);
            setMode('review');
          } catch (error) {
            console.error(error);
            alert("Could not process voice input. Please try again.");
            setMode('initial');
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setMode('recording');
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone permission is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mode === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUpdateItem = (id: string, field: keyof Ingredient, value: string) => {
    setDetectedItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setDetectedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirm = () => {
    onIngredientsDetected(detectedItems);
    onClose();
  };

  const categories: IngredientCategory[] = ['produce', 'dairy', 'meat', 'pantry', 'beverage', 'other'];

  // --- RENDER: PROCESSING / INITIAL / RECORDING ---
  if (mode !== 'review') {
    return (
      <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white rounded-full transition-colors">
          <X size={32} />
        </button>

        <div className="text-center space-y-8 max-w-sm w-full">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === 'processing' ? 'Processing...' : mode === 'recording' ? 'Listening...' : 'Voice Entry'}
            </h2>
            <p className="text-slate-400">
              {mode === 'processing' 
                ? "Gemini is analyzing your list..." 
                : "Dictate items like: \"A dozen eggs, spinach, and milk.\""}
            </p>
          </div>

          <div className="relative h-48 flex items-center justify-center">
             {/* Visualizer Canvas */}
             <canvas 
                ref={canvasRef} 
                width={300} 
                height={100} 
                className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${mode === 'recording' ? 'opacity-100' : 'opacity-0'}`}
             />

             {mode === 'processing' ? (
                <div className="relative z-10">
                   <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                   <Loader2 size={64} className="text-blue-400 animate-spin relative z-10" />
                </div>
             ) : (
                <button
                  onClick={mode === 'recording' ? stopRecording : startRecording}
                  className={`relative z-10 h-28 w-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                    mode === 'recording'
                      ? 'bg-red-500 text-white hover:bg-red-600 scale-110 shadow-red-500/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 shadow-blue-500/50'
                  }`}
                >
                  {mode === 'recording' ? <Square size={32} className="fill-current" /> : <Mic size={40} />}
                </button>
             )}
          </div>

          <div className="text-slate-500 font-medium text-sm h-6">
            {mode === 'recording' ? "Tap to finish" : mode === 'processing' ? "Almost there..." : "Tap to Start"}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: REVIEW STAGE ---
  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
        <div>
           <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
             <Sparkles size={20} className="text-blue-600" /> Detected Items
           </h2>
           <p className="text-xs text-slate-500">Review and edit before adding</p>
        </div>
        <button onClick={() => setMode('initial')} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
         {detectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <p>No items detected.</p>
               <button onClick={() => setMode('initial')} className="mt-4 text-blue-600 font-bold text-sm">Try Again</button>
            </div>
         ) : (
            detectedItems.map((item) => (
               <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="mt-2 text-slate-400">
                     <Edit2 size={14} />
                  </div>
                  <div className="flex-1 space-y-2">
                     <input 
                        className="w-full font-bold text-slate-800 border-b border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                     />
                     <div className="flex gap-2">
                        <select 
                           className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-600 focus:outline-none"
                           value={item.category}
                           onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                        >
                           {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-500">
                           <span>Expires:</span>
                           <input 
                              type="number"
                              className="w-8 bg-transparent text-center font-bold focus:outline-none"
                              value={item.expiryEstimateDays}
                              onChange={(e) => handleUpdateItem(item.id, 'expiryEstimateDays', e.target.value)}
                           />
                           <span>days</span>
                        </div>
                     </div>
                  </div>
                  <button 
                     onClick={() => handleRemoveItem(item.id)}
                     className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                     <Trash2 size={18} />
                  </button>
               </div>
            ))
         )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 flex gap-3 pb-8">
         <button 
           onClick={onClose}
           className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
         >
           Cancel
         </button>
         <button 
           onClick={handleConfirm}
           disabled={detectedItems.length === 0}
           className="flex-[2] py-3 text-white font-bold bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           <Check size={20} /> Add {detectedItems.length} Items
         </button>
      </div>
    </div>
  );
};

export default VoiceEntry;
