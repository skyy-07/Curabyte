
import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Image as ImageIcon, X, Check, Loader2, Edit2, Trash2, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';
import Button from './Button';
import { analyzeFridgeImage } from '../services/geminiService';
import { Ingredient, IngredientCategory } from '../types';

interface FridgeScannerProps {
  onIngredientsDetected: (ingredients: Ingredient[]) => void;
  onClose: () => void;
}

type ScannerMode = 'capture' | 'preview' | 'analyzing' | 'review';

const FridgeScanner: React.FC<FridgeScannerProps> = ({ onIngredientsDetected, onClose }) => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<ScannerMode>('capture');
  const [detectedItems, setDetectedItems] = useState<Ingredient[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Performance: Memoize constraints to prevent stream re-initialization loops
  const videoConstraints = React.useMemo(() => ({
    facingMode: "environment",
    width: { ideal: 1080 },
    height: { ideal: 1920 }
  }), []);

  // Performance: Force cleanup of media tracks on unmount
  useEffect(() => {
    return () => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
        const stream = webcamRef.current.video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot({ width: 1280, height: 720 });
      if (imageSrc) {
        setImgSrc(imageSrc);
        setMode('preview');
      }
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImgSrc(reader.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imgSrc) return;
    setMode('analyzing');
    try {
      const ingredients = await analyzeFridgeImage(imgSrc);
      setDetectedItems(ingredients);
      setMode('review');
    } catch (error) {
      console.error(error);
      alert("Failed to analyze image. Please try again.");
      setMode('preview');
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

  const handleRetake = () => {
    setImgSrc(null);
    setDetectedItems([]);
    setMode('capture');
  };

  const categories: IngredientCategory[] = ['produce', 'dairy', 'meat', 'pantry', 'beverage', 'other'];

  // --- REVIEW MODE UI ---
  if (mode === 'review') {
    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col animate-in fade-in duration-300">
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" /> Scan Results
            </h2>
            <p className="text-xs text-slate-500">Found {detectedItems.length} items</p>
          </div>
          <button onClick={handleRetake} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200">
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {detectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <p>No items detected.</p>
              <button onClick={handleRetake} className="mt-4 text-blue-600 font-bold text-sm">Try Again</button>
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
                    <div className="relative">
                      <select
                        className="text-xs bg-slate-50 border border-slate-200 rounded-md pl-2 pr-6 py-1 text-slate-600 focus:outline-none appearance-none capitalize"
                        value={item.category}
                        onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

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

          {/* Preview of the scanned image for reference */}
          {imgSrc && (
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Source Image</p>
              <img src={imgSrc} alt="Scanned Source" className="w-32 h-32 object-cover rounded-lg border border-slate-200 opacity-80" />
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 pb-8">
          <button
            onClick={handleRetake}
            className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Retake
          </button>
          <button
            onClick={handleConfirm}
            disabled={detectedItems.length === 0}
            className="flex-[2] py-3 text-white font-bold bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={20} /> Add to Fridge
          </button>
        </div>
      </div>
    );
  }

  // --- CAPTURE & PREVIEW MODES ---
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-300">
      <div className="flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/50 to-transparent absolute top-0 w-full z-10">
        <h2 className="font-semibold text-lg">Scan Fridge</h2>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt="Captured" className="max-h-full max-w-full object-contain" />
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
            onUserMediaError={(e) => console.error("Camera error:", e)}
          />
        )}

        {mode === 'analyzing' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-20">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full animate-pulse"></div>
              <Loader2 className="animate-spin mb-4 text-blue-400 relative z-10" size={48} />
            </div>
            <p className="font-bold text-xl mb-1">Analyzing...</p>
            <p className="text-sm text-white/60">Identifying ingredients with Gemini Vision</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-6 pb-10 flex justify-around items-center gap-4">
        {imgSrc ? (
          <>
            <Button variant="secondary" onClick={handleRetake} disabled={mode === 'analyzing'} className="flex-1 py-4">
              Retake
            </Button>
            <Button onClick={handleAnalyze} isLoading={mode === 'analyzing'} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border-0 py-4 shadow-lg shadow-blue-900/50">
              <Check size={18} /> Analyze
            </Button>
          </>
        ) : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition active:scale-95"
            >
              <ImageIcon size={24} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />

            <button
              onClick={capture}
              className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/10 transition active:scale-95"
            >
              <div className="h-16 w-16 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
            </button>

            <div className="w-14"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default FridgeScanner;
