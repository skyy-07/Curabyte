
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DailyPlan, Meal, NutritionStats } from '../types';
import { Clock, TrendingUp, AlertTriangle, ChefHat, Sparkles, BrainCircuit, Terminal, Zap, CheckCircle2, CircleDashed, Loader2, ArrowLeftRight } from 'lucide-react';
import Button from './Button';

interface MealPlanProps {
  plan: DailyPlan | null;
  isLoading: boolean;
  streamedContent?: string;
  onGenerate: () => void;
}

const MealPlan: React.FC<MealPlanProps> = ({ plan, isLoading, streamedContent = "", onGenerate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Store the selected variant index for each meal index (0 is main, 1+ is alternative)
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});

  // Reset selections when plan changes
  useEffect(() => {
    setSelectedVariants({});
  }, [plan]);

  // Define generation stages based on expected JSON keys
  const stages = [
    { id: 'start', label: 'Initializing Context', check: () => true },
    { id: 'summary', label: 'Drafting Daily Summary', check: (text: string) => text.includes('"summary"') },
    { id: 'meals', label: 'Designing Meals', check: (text: string) => text.includes('"meals"') },
    { id: 'nutrition', label: 'Calculating Macros', check: (text: string) => text.includes('"totalNutrition"') },
    { id: 'shopping', label: 'Compiling Grocery List', check: (text: string) => text.includes('"shoppingList"') },
  ];

  // Auto-scroll the stream view
  useEffect(() => {
    if (scrollRef.current && isLoading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamedContent, isLoading]);

  // Optimize: Memoize token splitting to prevent expensive regex on every re-render
  const tokens = useMemo(() => {
    if (!streamedContent) return [];
    // Split by numbers or strings enclosed in double quotes
    return streamedContent.split(/([0-9]+|"[^"]*")/g);
  }, [streamedContent]);

  // Calculate dynamic totals based on selected variants
  const calculatedTotals = useMemo(() => {
    if (!plan) return { calories: 0, protein: 0, carbs: 0, fats: 0 };

    return plan.meals.reduce((acc, meal, idx) => {
      const selectedIdx = selectedVariants[idx] || 0;
      // If 0, use main meal. If > 0, use alternative at index - 1
      let selectedMeal: Meal | undefined = meal;
      if (selectedIdx > 0 && meal.alternatives && meal.alternatives.length >= selectedIdx) {
        selectedMeal = meal.alternatives[selectedIdx - 1];
      }

      const nut = selectedMeal?.nutrition || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      return {
        calories: acc.calories + (nut.calories || 0),
        protein: acc.protein + (nut.protein || 0),
        carbs: acc.carbs + (nut.carbs || 0),
        fats: acc.fats + (nut.fats || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [plan, selectedVariants]);

  if (!plan && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="bg-blue-50 p-6 rounded-full mb-6 relative">
          <ChefHat size={48} className="text-blue-600" />
          <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-sm">
            <Sparkles size={16} className="text-amber-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-balance">Chef Gemini is Ready</h2>
        <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
          I'll analyze your live health stats and inventory to generate your personalized plan.
        </p>
        <Button onClick={onGenerate} className="w-full max-w-xs py-4 text-lg shadow-xl shadow-blue-200">
          Create Live Plan
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[75vh] px-4 pt-4 pb-20">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <BrainCircuit size={24} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-none">Generative Mode</h3>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                Live Blueprinting
              </p>
            </div>
          </div>
        </div>

        {/* Live Blueprint HUD */}
        <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col relative">

          {/* Top Status Bar */}
          <div className="bg-slate-800/50 backdrop-blur-md px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-blue-400 font-mono">
              <Terminal size={12} />
              <span className="animate-pulse">stream_active</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

            {/* Progress Tracker (Left Panel) */}
            <div className="p-5 border-b md:border-b-0 md:border-r border-white/5 bg-slate-800/20 md:w-1/2 overflow-y-auto">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Construction Status</h4>
              <div className="space-y-4">
                {stages.map((stage, idx) => {
                  const isComplete = stage.check(streamedContent);
                  const isNext = idx === 0 ? !isComplete : (stages[idx - 1].check(streamedContent) && !isComplete);

                  return (
                    <div key={stage.id} className={`flex items-center gap-3 transition-all duration-500 ${isComplete ? 'opacity-100' : isNext ? 'opacity-100' : 'opacity-30'}`}>
                      <div className={`
                          h-6 w-6 rounded-full flex items-center justify-center border-2 
                          ${isComplete
                          ? 'bg-emerald-500 border-emerald-500 text-slate-900'
                          : isNext
                            ? 'border-blue-500 text-blue-500 animate-pulse'
                            : 'border-slate-600 text-slate-600'}
                        `}>
                        {isComplete ? <CheckCircle2 size={14} /> : isNext ? <Loader2 size={14} className="animate-spin" /> : <CircleDashed size={14} />}
                      </div>
                      <span className={`text-xs font-bold ${isComplete ? 'text-emerald-400' : isNext ? 'text-blue-400' : 'text-slate-500'}`}>
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Code Stream (Right Panel) */}
            <div
              ref={scrollRef}
              className="flex-1 p-5 overflow-y-auto font-mono text-[10px] leading-relaxed no-scrollbar relative"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/0 to-slate-900/0 pointer-events-none" />
              <pre className="text-slate-400 whitespace-pre-wrap break-all">
                {tokens.map((part, i) => {
                  if (part.startsWith('"')) {
                    return <span key={i} className="text-emerald-300/80">{part}</span>;
                  } else if (!isNaN(Number(part)) && part.trim() !== '') {
                    return <span key={i} className="text-amber-400 font-bold">{part}</span>;
                  }
                  return <span key={i} className="text-slate-500">{part}</span>;
                })}
                <span className="inline-block w-1.5 h-3 bg-blue-500 ml-0.5 animate-pulse align-middle shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-900/50 backdrop-blur-sm px-4 py-2 border-t border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              <Zap size={10} className="text-amber-400 fill-current" />
              Calculating Optimal Nutrition
            </div>
            <div className="text-[9px] text-slate-600 font-mono">
              {streamedContent.length} chars
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  // Use dynamically calculated totals based on selection
  const totalCalories = calculatedTotals.calories;
  const totalProtein = calculatedTotals.protein;
  const totalCarbs = calculatedTotals.carbs;
  const totalFats = calculatedTotals.fats;

  // Default values for calculation to prevent division by zero
  const dailyTotals = {
    calories: calculatedTotals.calories || 2000,
    protein: calculatedTotals.protein || 150,
    carbs: calculatedTotals.carbs || 200,
    fats: calculatedTotals.fats || 70
  };

  return (
    <div className="pb-20 space-y-6 animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ChefHat size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Today's Optimal Plan</h2>
              <p className="text-slate-300 text-sm mt-1 leading-snug max-w-[80%]">{plan.summary}</p>
            </div>
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
          </div>

          <div className="flex gap-4 text-sm border-t border-white/10 pt-4 mt-2">
            <div className="flex-1">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Calories</div>
              <div className="font-bold text-xl tabular-nums">{totalCalories}</div>
            </div>
            <div className="flex-1 border-l border-white/10 pl-4">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Protein</div>
              <div className="font-bold text-xl tabular-nums text-blue-400">{totalProtein}g</div>
            </div>
            <div className="flex-1 border-l border-white/10 pl-4">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Carbs</div>
              <div className="font-bold text-xl tabular-nums text-emerald-400">{totalCarbs}g</div>
            </div>
            <div className="flex-1 border-l border-white/10 pl-4">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Fats</div>
              <div className="font-bold text-xl tabular-nums text-amber-400">{totalFats}g</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Daily Schedule</h3>
          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-bold">Tap arrows to swap recipes</span>
        </div>
        {plan.meals.map((meal, idx) => (
          <MealCard
            key={idx}
            originalMeal={meal}
            dailyTotals={dailyTotals}
            selectedVariant={selectedVariants[idx] || 0}
            onSelectVariant={(v) => setSelectedVariants(prev => ({ ...prev, [idx]: v }))}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 pt-6 pb-4">
        <button
          onClick={onGenerate}
          className="px-6 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
        >
          Regenerate Live Plan
        </button>
        <p className="text-[10px] text-slate-400">Personalized using your steps & fridge inventory</p>
      </div>
    </div>
  );
};

const MealCard: React.FC<{
  originalMeal: Meal;
  dailyTotals: NutritionStats;
  selectedVariant: number;
  onSelectVariant: (v: number) => void;
}> = ({ originalMeal, dailyTotals, selectedVariant, onSelectVariant }) => {
  // Determine which meal data to display based on selectedVariant
  // 0 = originalMeal, 1 = alternative[0], 2 = alternative[1]...
  const alternatives = originalMeal.alternatives || [];
  const totalOptions = 1 + alternatives.length;

  const currentMeal = selectedVariant === 0
    ? originalMeal
    : alternatives[selectedVariant - 1];

  const nutrition = currentMeal?.nutrition || { protein: 0, carbs: 0, fats: 0, calories: 0 };
  const totals = dailyTotals || { protein: 1, carbs: 1, fats: 1, calories: 1 };

  const macros = [
    { label: 'Prot', fullLabel: 'Protein', value: nutrition.protein, total: totals.protein, color: 'bg-blue-500', track: 'bg-blue-50' },
    { label: 'Carb', fullLabel: 'Carbs', value: nutrition.carbs, total: totals.carbs, color: 'bg-emerald-500', track: 'bg-emerald-50' },
    { label: 'Fat', fullLabel: 'Fats', value: nutrition.fats, total: totals.fats, color: 'bg-amber-500', track: 'bg-amber-50' },
  ];

  const nextVariant = () => onSelectVariant((selectedVariant + 1) % totalOptions);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 relative">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
              {originalMeal.type}
            </span>
            {totalOptions > 1 && (
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                Option {selectedVariant + 1}/{totalOptions}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center text-slate-400 text-xs gap-1 bg-slate-50 px-2 py-1 rounded-lg font-bold">
              <Clock size={14} className="text-slate-300" />
              <span>{currentMeal.timeToCookMinutes}m</span>
            </div>

            {totalOptions > 1 && (
              <button
                onClick={nextVariant}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors active:scale-95"
                title="View Alternative"
              >
                <ArrowLeftRight size={14} />
              </button>
            )}
          </div>
        </div>

        <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors animate-in fade-in slide-in-from-right-2 duration-300" key={currentMeal.name}>
          {currentMeal.name}
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2 animate-in fade-in duration-500" key={currentMeal.description}>
          {currentMeal.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {currentMeal.ingredientsUsed?.slice(0, 4).map((ing, i) => (
            <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded-md border border-slate-100 capitalize">
              {ing}
            </span>
          ))}
          {currentMeal.ingredientsUsed?.length > 4 && (
            <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-md">+{currentMeal.ingredientsUsed.length - 4}</span>
          )}
        </div>

        {currentMeal.missingIngredients?.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-2xl text-[11px] text-amber-800 border border-amber-100/50">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
            <span className="font-medium leading-tight">Need: <span className="font-bold">{currentMeal.missingIngredients.join(', ')}</span></span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-50">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {macros.map((m) => {
              const percent = Math.min(100, Math.round((m.value / (m.total || 1)) * 100));
              return (
                <div key={m.label} className="space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{m.fullLabel}</span>
                    <span className="text-[10px] font-bold text-slate-700">{Math.round(m.value)}g</span>
                  </div>
                  <div className={`h-1.5 w-full ${m.track} rounded-full overflow-hidden`}>
                    <div className={`h-full ${m.color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                  </div>
                  <div className="text-[9px] text-slate-400 text-right font-medium">{percent}%</div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500">
                <TrendingUp size={12} />
              </div>
              <div className="text-xs font-bold text-slate-700">
                {nutrition.calories} <span className="text-[10px] font-black text-slate-400 uppercase">kcal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MealPlan;
