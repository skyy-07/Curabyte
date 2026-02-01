
import React, { useState, useMemo } from 'react';
import { DailyPlan, Meal, UserProfile, Ingredient, IngredientCategory } from '../types';
import { Clock, Plus, TrendingUp, Leaf, AlertCircle, ChefHat, Target, Droplets, RefreshCw, Activity } from 'lucide-react';
import Button from './Button';

interface SmartRecipesProps {
  plan: DailyPlan | null;
  user: UserProfile;
  inventory: Ingredient[];
  onGenerate: () => void;
  isGenerating: boolean;
  onAddToShoppingList: (items: { name: string; category: IngredientCategory }[]) => void;
}

const SmartRecipes: React.FC<SmartRecipesProps> = ({ 
  plan, 
  user, 
  inventory,
  onGenerate, 
  isGenerating,
  onAddToShoppingList 
}) => {
  // Store which option is selected for each meal slot (0 = main, 1 = alt 1, etc.)
  const [selections, setSelections] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0 });

  const getSelectedMeal = (mealIndex: number): Meal | null => {
    if (!plan) return null;
    const baseMeal = plan.meals[mealIndex];
    if (!baseMeal) return null;
    const variantIndex = selections[mealIndex] || 0;
    
    if (variantIndex === 0) return baseMeal;
    return baseMeal.alternatives?.[variantIndex - 1] || baseMeal;
  };

  // Calculate totals based on current selections
  const totals = useMemo(() => {
    let cal = 0, pro = 0, carb = 0, fat = 0;
    if (plan) {
      plan.meals.forEach((_, idx) => {
        const meal = getSelectedMeal(idx);
        if (meal) {
          cal += meal.nutrition.calories;
          pro += meal.nutrition.protein;
          carb += meal.nutrition.carbs;
          fat += meal.nutrition.fats;
        }
      });
    }
    return { cal, pro, carb, fat };
  }, [plan, selections]);

  if (!plan && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6">
        <div className="bg-emerald-50 p-6 rounded-full mb-6">
          <Leaf size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Smart Recipe Engine</h2>
        <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
          I'll match your goal of <span className="font-bold text-slate-800">{user.primaryGoal}</span> with expiring ingredients to create waste-zero, high-performance recipes.
        </p>
        <Button onClick={onGenerate} className="w-full max-w-xs py-4 text-lg shadow-xl shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700">
          Find Smart Recipes
        </Button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 space-y-6">
        <div className="relative">
          <ChefHat size={64} className="text-emerald-500 animate-bounce" />
          <div className="absolute -bottom-2 w-full h-2 bg-slate-200 rounded-full animate-pulse blur-sm"></div>
        </div>
        <div className="space-y-2">
           <h2 className="text-xl font-bold text-slate-800">Analysing Fridge...</h2>
           <p className="text-sm text-slate-400">Pairing expiring items with macro targets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Smart Recipes</h1>
           <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Waste Zero Mode
             </span>
             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {user.primaryGoal}
             </span>
           </div>
        </div>
        <button onClick={onGenerate} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
           <RefreshCw size={20} />
        </button>
      </div>

      {/* Recipe Sections */}
      {plan?.meals.map((mealGroup, groupIndex) => {
        const activeMeal = getSelectedMeal(groupIndex);
        if (!activeMeal) return null;
        
        const variants = [mealGroup, ...(mealGroup.alternatives || [])];

        return (
          <div key={groupIndex} className="space-y-3">
             <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-lg text-slate-800 capitalize flex items-center gap-2">
                  {mealGroup.type}
                  {(activeMeal.wasteReductionScore || 0) > 70 && (
                     <Leaf size={14} className="text-emerald-500 fill-current" />
                  )}
                </h3>
                
                {/* Variant Toggles */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                   {variants.map((_, vIdx) => (
                      <button
                        key={vIdx}
                        onClick={() => setSelections(prev => ({ ...prev, [groupIndex]: vIdx }))}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                           selections[groupIndex] === vIdx || (vIdx === 0 && !selections[groupIndex])
                           ? 'bg-white text-slate-900 shadow-sm' 
                           : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                         Opt {vIdx + 1}
                      </button>
                   ))}
                </div>
             </div>

             <RecipeCard 
                meal={activeMeal} 
                onAddToShoppingList={onAddToShoppingList}
             />
          </div>
        );
      })}

      {/* Daily Nutrition Summary Panel */}
      <div className="fixed bottom-20 left-4 right-4 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl backdrop-blur-lg border border-slate-700 z-30">
        <div className="flex justify-between items-center mb-3">
           <div className="flex items-center gap-2">
              <Target size={16} className="text-emerald-400" />
              <span className="font-bold text-sm">Daily Total</span>
           </div>
           <div className="text-xs text-slate-400">
              Target: <span className="text-white font-bold">{user.dailyCalorieTarget}</span>
           </div>
        </div>
        
        <div className="flex gap-4">
           {/* Progress Circle */}
           <div className="relative h-12 w-12 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="4" />
                <circle 
                  cx="24" cy="24" r="20" fill="none" stroke={totals.cal > user.dailyCalorieTarget ? '#f59e0b' : '#10b981'} strokeWidth="4" 
                  strokeDasharray={125} 
                  strokeDashoffset={125 - (125 * Math.min(100, (totals.cal / user.dailyCalorieTarget) * 100)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                 {Math.round((totals.cal / user.dailyCalorieTarget) * 100)}%
              </div>
           </div>
           
           <div className="flex-1 grid grid-cols-3 gap-2">
              <MacroStat label="Protein" val={totals.pro} target={180} color="bg-blue-500" />
              <MacroStat label="Carbs" val={totals.carb} target={220} color="bg-emerald-500" />
              <MacroStat label="Fats" val={totals.fat} target={70} color="bg-amber-500" />
           </div>
        </div>
      </div>
    </div>
  );
};

const MacroStat: React.FC<{ label: string; val: number; target: number; color: string }> = ({ label, val, target, color }) => (
  <div className="flex flex-col justify-center">
     <div className="flex justify-between text-[9px] text-slate-400 uppercase font-bold mb-1">
        <span>{label}</span>
        <span>{val}g</span>
     </div>
     <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, (val / target) * 100)}%` }} />
     </div>
  </div>
);

const RecipeCard: React.FC<{ meal: Meal; onAddToShoppingList: (items: {name: string, category: IngredientCategory}[]) => void }> = ({ meal, onAddToShoppingList }) => {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
     onAddToShoppingList(meal.missingIngredients);
     setAdded(true);
     setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative group">
       {/* Waste Reduction Banner */}
       {(meal.wasteReductionScore || 0) > 0 && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between">
             <div className="flex items-center gap-1.5 text-emerald-700">
                <Leaf size={12} className="fill-current" />
                <span className="text-[10px] font-black uppercase tracking-wider">Waste Reduced {meal.wasteReductionScore}%</span>
             </div>
             {meal.expiringIngredientsUsed && meal.expiringIngredientsUsed.length > 0 && (
                <span className="text-[9px] text-emerald-600 font-medium">
                   Saved: {meal.expiringIngredientsUsed[0]}
                </span>
             )}
          </div>
       )}

       <div className="p-5">
          <div className="flex justify-between items-start mb-2">
             <h4 className="font-bold text-slate-900 text-lg leading-tight w-3/4">{meal.name}</h4>
             <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500">
                <Clock size={12} /> {meal.timeToCookMinutes}m
             </div>
          </div>
          
          <p className="text-xs text-slate-500 mb-4 line-clamp-2">{meal.description}</p>
          
          {/* Health Explainability Banner (New) */}
          {meal.healthReasoning && (
             <div className="mb-4 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50 flex items-start gap-2">
                <Activity size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-[10px] font-bold text-blue-800 uppercase mb-0.5">Medical & Diet Context</p>
                   <p className="text-xs text-slate-600 leading-snug">{meal.healthReasoning}</p>
                   {meal.dietaryTags && meal.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                         {meal.dietaryTags.map((tag, i) => (
                            <span key={i} className="text-[9px] bg-white text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{tag}</span>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          )}
          
          {/* Ingredients Grid */}
          <div className="flex flex-wrap gap-1.5 mb-4">
             {meal.ingredientsUsed.map((ing, i) => {
                const isExpiring = meal.expiringIngredientsUsed?.includes(ing);
                return (
                   <span key={i} className={`text-[10px] font-bold px-2 py-1 rounded-md border capitalize ${isExpiring ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                      {ing} {isExpiring && '!'}
                   </span>
                );
             })}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
             <div className="text-center p-2 bg-slate-50 rounded-xl">
                <div className="text-lg font-bold text-slate-800 leading-none">{meal.nutrition.calories}</div>
                <div className="text-[8px] text-slate-400 font-black uppercase mt-1">Kcal</div>
             </div>
             <div className="text-center p-2 bg-blue-50 rounded-xl">
                <div className="text-lg font-bold text-blue-600 leading-none">{meal.nutrition.protein}</div>
                <div className="text-[8px] text-blue-400 font-black uppercase mt-1">Pro</div>
             </div>
             <div className="text-center p-2 bg-emerald-50 rounded-xl">
                <div className="text-lg font-bold text-emerald-600 leading-none">{meal.nutrition.carbs}</div>
                <div className="text-[8px] text-emerald-400 font-black uppercase mt-1">Carb</div>
             </div>
             <div className="text-center p-2 bg-amber-50 rounded-xl">
                <div className="text-lg font-bold text-amber-600 leading-none">{meal.nutrition.fats}</div>
                <div className="text-[8px] text-amber-400 font-black uppercase mt-1">Fat</div>
             </div>
          </div>

          {meal.missingIngredients.length > 0 ? (
             <button 
                onClick={handleAdd}
                disabled={added}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${added ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
             >
                {added ? (
                   <>Added to List <Leaf size={14} /></>
                ) : (
                   <>Add {meal.missingIngredients.length} Missing Items <Plus size={14} /></>
                )}
             </button>
          ) : (
             <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center gap-2">
                <Droplets size={14} /> You have all ingredients!
             </div>
          )}
       </div>
    </div>
  );
};

export default SmartRecipes;
