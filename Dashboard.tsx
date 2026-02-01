
import React, { useState, useMemo } from 'react';
import { UserProfile, DailyPlan, Ingredient } from '../types';
import { Activity, Scale, Loader2, UserCog, Mic, Utensils, TrendingDown, Dumbbell, Zap } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LiveAssistant from './LiveAssistant';

interface DashboardProps {
  user: UserProfile;
  liveStats: { steps: number; burned: number };
  plan: DailyPlan | null;
  inventory: Ingredient[];
  onGeneratePlan: () => void;
  // Generation State
  isGenerating: boolean;
  onOpenSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  liveStats, 
  plan, 
  inventory, 
  onGeneratePlan,
  isGenerating,
  onOpenSettings
}) => {
  const [isLiveOpen, setIsLiveOpen] = useState(false);

  const goalConfig = useMemo(() => {
    switch (user.primaryGoal) {
      case 'Lose Weight': return { icon: TrendingDown, color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'Build Muscle': return { icon: Dumbbell, color: 'text-violet-500', bg: 'bg-violet-50' };
      case 'Endurance': return { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' };
      case 'Maintain': 
      default: return { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' };
    }
  }, [user.primaryGoal]);

  const quickStats = [
    { 
      label: 'Settings', 
      value: 'Profile', 
      icon: UserCog, 
      color: 'text-slate-600', 
      bg: 'bg-slate-100',
      onClick: onOpenSettings
    },
    { 
      label: 'Goal', 
      value: user.primaryGoal, 
      icon: goalConfig.icon, 
      color: goalConfig.color, 
      bg: goalConfig.bg 
    },
  ];

  const chartData = plan ? [
    { name: 'Protein', value: plan.totalNutrition?.protein || 0, color: '#3b82f6' },
    { name: 'Carbs', value: plan.totalNutrition?.carbs || 0, color: '#10b981' },
    { name: 'Fats', value: plan.totalNutrition?.fats || 0, color: '#f59e0b' },
  ] : [];

  // --- Scientific Calorie Calculation ---
  const bmr = useMemo(() => {
    let base = (10 * user.weight) + (6.25 * user.height) - (5 * user.age);
    return user.gender === 'male' ? base + 5 : base - 161;
  }, [user]);

  const goalModifier = useMemo(() => {
    switch(user.primaryGoal) {
      case 'Lose Weight': return -500;
      case 'Build Muscle': return 400;
      case 'Endurance': return 200;
      default: return 0;
    }
  }, [user.primaryGoal]);

  // We use the base BMR + live burn + goal modifier to show a real-time target.
  // Note: user.dailyCalorieTarget is the "Static base" calculated in ProfileSettings.
  const sedentaryTDEE = bmr * 1.2;
  const dynamicTotalTarget = Math.round(sedentaryTDEE + liveStats.burned + goalModifier);
  const consumed = plan?.totalNutrition?.calories || 0;
  const caloriesRemaining = dynamicTotalTarget - consumed;
  const balancePercentage = Math.min(100, Math.max(0, (consumed / dynamicTotalTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button onClick={onOpenSettings} className="flex items-center gap-2 group">
            <h1 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Hello, {user.name}</h1>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Live Data Stream</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsLiveOpen(true)}
            className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 active:scale-95 transition-transform"
          >
            <Mic size={22} />
          </button>
        </div>
      </div>

      {/* Quick Actions (Replaced Active Burn with Settings) */}
      <div className="grid grid-cols-2 gap-3">
        {quickStats.map((stat, idx) => (
          <button 
            key={idx} 
            onClick={stat.onClick}
            disabled={!stat.onClick}
            className={`bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden group ${stat.onClick ? 'active:scale-95 transition-transform cursor-pointer hover:border-blue-200' : ''}`}
          >
            <div className={`p-2 rounded-full ${stat.bg} ${stat.color} mb-2 relative z-10 transition-transform group-hover:scale-110`}>
              <stat.icon size={18} />
            </div>
            <span className={`text-sm font-black text-slate-800 tabular-nums transition-all relative z-10 line-clamp-1`}>
              {stat.value}
            </span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider relative z-10">{stat.label}</span>
          </button>
        ))}
      </div>

      {/* Live Calorie Balance Widget */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Scale size={16} />
            </div>
            <h2 className="font-bold text-slate-800">Scientific Balance</h2>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className={`text-3xl font-black tabular-nums ${caloriesRemaining < 0 ? 'text-red-500' : 'text-slate-900'}`}>
              {Math.abs(caloriesRemaining).toLocaleString()} <span className="text-sm font-bold text-slate-400">{caloriesRemaining >= 0 ? 'left' : 'over'}</span>
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              Target: <span className="font-bold text-slate-700">{dynamicTotalTarget}</span> 
              <span className="text-[10px] ml-1 text-slate-400">(BMR {Math.round(bmr)} + Burn {liveStats.burned} {goalModifier > 0 ? `+ ${goalModifier} gain` : goalModifier < 0 ? `${goalModifier} cut` : ''})</span>
            </div>
          </div>
          <div className="h-16 w-16 relative flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="6" />
              <circle 
                cx="32" cy="32" r="28" fill="none" stroke={caloriesRemaining < 0 ? "#ef4444" : "#3b82f6"} strokeWidth="6" 
                strokeDasharray={176} 
                strokeDashoffset={176 - (176 * balancePercentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${caloriesRemaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>
              {Math.round(balancePercentage)}%
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition Plan Summary */}
      <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg flex items-center gap-2">
            Daily Nutrients
          </h2>
          {plan && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-200">Optimal Plan</span>}
        </div>

        {plan ? (
          <div className="flex items-center gap-6">
            <div className="w-28 h-28 relative">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={35}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                 <span className="text-sm font-black text-slate-800">{plan.totalNutrition?.calories || 0}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">kcal</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: 'Protein', val: plan.totalNutrition?.protein || 0, color: 'bg-blue-500', bg: 'bg-blue-50' },
                { label: 'Carbs', val: plan.totalNutrition?.carbs || 0, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Fats', val: plan.totalNutrition?.fats || 0, color: 'bg-amber-500', bg: 'bg-amber-50' },
              ].map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-500">{m.label}</span>
                    <span className="text-slate-800">{m.val}g</span>
                  </div>
                  <div className={`h-1 w-full ${m.bg} rounded-full overflow-hidden`}>
                    <div className={`h-full ${m.color} transition-all duration-1000`} style={{ width: `${(m.val / 200) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-slate-50 inline-flex p-4 rounded-full mb-4">
              <Utensils className="text-slate-300" size={28} />
            </div>
            <p className="text-slate-500 text-sm mb-6 max-w-[200px] mx-auto leading-relaxed">
              Your inventory is ready. Generate a plan adjusted to your live activity.
            </p>
            <button 
              onClick={onGeneratePlan}
              disabled={isGenerating}
              className={`px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 active:scale-95 transition-transform flex items-center gap-2 mx-auto ${isGenerating ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white'}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Designing Plan...
                </>
              ) : (
                'Generate AI Plan'
              )}
            </button>
          </div>
        )}
      </div>

      <LiveAssistant 
        isOpen={isLiveOpen} 
        onClose={() => setIsLiveOpen(false)} 
        stats={liveStats} 
        inventory={inventory} 
      />
    </div>
  );
};

export default Dashboard;
