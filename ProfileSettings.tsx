
import React, { useState, useRef } from 'react';
import { UserProfile, MedicalConstraints } from '../types';
import { X, Check, Activity, Leaf, Clock, Utensils, User, Target, ShieldAlert, FileText, Upload, Loader2, RefreshCw, Cloud, TrendingDown, Dumbbell, Zap } from 'lucide-react';
import Button from './Button';
import { analyzeMedicalReport } from '../services/geminiService';

interface ProfileSettingsProps {
  user: UserProfile;
  onSave: (updatedUser: UserProfile) => void;
  onClose: () => void;
  // Cloud Props
  isSyncing: boolean;
  lastSynced: Date | null;
  storageUsage: number;
  onForceSync: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  user, 
  onSave, 
  onClose,
  isSyncing,
  lastSynced,
  storageUsage,
  onForceSync
}) => {
  const [formData, setFormData] = useState<UserProfile>({ ...user });
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRestrictionToggle = (restriction: string) => {
    const current = formData.dietaryRestrictions;
    if (current.includes(restriction)) {
      setFormData(prev => ({ ...prev, dietaryRestrictions: current.filter(r => r !== restriction) }));
    } else {
      setFormData(prev => ({ ...prev, dietaryRestrictions: [...current, restriction] }));
    }
  };

  const handleRemoveAllergen = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: (prev.allergens || []).filter(a => a !== allergen)
    }));
  };

  const handleReportUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzingReport(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const result = await analyzeMedicalReport(base64);
        
        setFormData(prev => ({
          ...prev,
          medicalConstraints: {
            avoids: [...(prev.medicalConstraints?.avoids || []), ...result.avoids],
            limits: [...(prev.medicalConstraints?.limits || []), ...result.limits],
            recommendations: [...(prev.medicalConstraints?.recommendations || []), ...result.recommendations],
            lastUpdated: new Date().toISOString()
          }
        }));
      } catch (error) {
        console.error("Report analysis failed", error);
        alert("Could not analyze report. Please try a clearer image.");
      } finally {
        setIsAnalyzingReport(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearMedicalData = () => {
    setFormData(prev => ({ ...prev, medicalConstraints: undefined, medicalConsentGiven: false }));
  };

  const calculateTarget = () => {
    // Basic Mifflin-St Jeor + Activity + Goal
    let bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age);
    bmr = formData.gender === 'male' ? bmr + 5 : bmr - 161;

    const activityMultipliers: Record<string, number> = {
      'Sedentary': 1.2,
      'Lightly Active': 1.375,
      'Moderately Active': 1.55,
      'Very Active': 1.725
    };
    
    const goalModifiers: Record<string, number> = {
      'Lose Weight': -500,
      'Maintain': 0,
      'Build Muscle': 400,
      'Endurance': 200
    };

    const multiplier = activityMultipliers[formData.activityLevel] || 1.2;
    const modifier = goalModifiers[formData.primaryGoal] || 0;
    
    return Math.round((bmr * multiplier) + modifier);
  };

  const handleSave = () => {
    const finalUser = {
      ...formData,
      dailyCalorieTarget: calculateTarget()
    };
    onSave(finalUser);
    onClose();
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 pb-2 border-b border-slate-100">
      <Icon size={18} className="text-blue-600" />
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h3>
    </div>
  );

  const renderMedicalReportSection = () => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 animate-in fade-in slide-in-from-bottom-2">
       <div className="flex items-center gap-2 mb-3">
         <FileText size={16} className="text-blue-600" />
         <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Medical Report Integration</h4>
       </div>
       <div className="flex items-start gap-3 mb-4">
         <ShieldAlert className="text-blue-500 shrink-0" size={20} />
         <p className="text-xs text-slate-500 leading-relaxed">
           Upload a photo of your prescription or dietary guideline report. AI will extract nutrient limits (e.g., "Low Sodium") to adjust your recipes. 
           <br/><span className="font-bold text-slate-700">Not a medical diagnosis tool.</span>
         </p>
       </div>

       {!formData.medicalConstraints ? (
          <div className="flex gap-2">
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isAnalyzingReport}
               className="flex-1 py-3 border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
             >
               {isAnalyzingReport ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
               {isAnalyzingReport ? "Analyzing..." : "Upload Report"}
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleReportUpload} />
          </div>
       ) : (
          <div className="space-y-3">
             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-black uppercase text-slate-400">Extracted Constraints</span>
                   <button onClick={clearMedicalData} className="text-xs text-red-500 hover:text-red-700 underline">Clear</button>
                </div>
                <div className="space-y-2">
                   {formData.medicalConstraints.avoids.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                         <span className="text-[9px] font-bold text-red-600 uppercase w-12">Avoid:</span>
                         {formData.medicalConstraints.avoids.map((x, i) => <span key={i} className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">{x}</span>)}
                      </div>
                   )}
                   {formData.medicalConstraints.limits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                         <span className="text-[9px] font-bold text-amber-600 uppercase w-12">Limit:</span>
                         {formData.medicalConstraints.limits.map((x, i) => <span key={i} className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">{x}</span>)}
                      </div>
                   )}
                   {formData.medicalConstraints.recommendations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                         <span className="text-[9px] font-bold text-emerald-600 uppercase w-12">Recs:</span>
                         {formData.medicalConstraints.recommendations.map((x, i) => <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{x}</span>)}
                      </div>
                   )}
                </div>
             </div>
             
             <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${formData.medicalConsentGiven ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                   {formData.medicalConsentGiven && <Check size={14} className="text-white" />}
                </div>
                <input 
                   type="checkbox" 
                   className="hidden" 
                   checked={formData.medicalConsentGiven || false} 
                   onChange={(e) => handleChange('medicalConsentGiven', e.target.checked)} 
                />
                <span className="text-xs text-slate-600">
                   I consent to using these extracted dietary constraints to modify my meal plans. I understand this is not professional medical advice.
                </span>
             </label>
          </div>
       )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Your Goals</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
          
          {/* Section: Fitness & Goals (Moved up) */}
          <SectionHeader icon={Target} title="Fitness & Goals" />
          <div className="grid grid-cols-1 gap-4">
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Primary Goal</label>
               <div className="grid grid-cols-2 gap-2">
                 {[
                    { label: 'Lose Weight', icon: TrendingDown },
                    { label: 'Maintain', icon: Activity },
                    { label: 'Build Muscle', icon: Dumbbell },
                    { label: 'Endurance', icon: Zap }
                 ].map(opt => (
                   <button
                     key={opt.label}
                     onClick={() => handleChange('primaryGoal', opt.label)}
                     className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${formData.primaryGoal === opt.label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                   >
                     <opt.icon size={16} />
                     {opt.label}
                   </button>
                 ))}
               </div>
             </div>
             
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Activity Level</label>
               <select 
                 value={formData.activityLevel} 
                 onChange={(e) => handleChange('activityLevel', e.target.value)}
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
               >
                 <option value="Sedentary">Sedentary (Office job)</option>
                 <option value="Lightly Active">Lightly Active (1-3 days/wk)</option>
                 <option value="Moderately Active">Moderately Active (3-5 days/wk)</option>
                 <option value="Very Active">Very Active (6-7 days/wk)</option>
               </select>
             </div>
          </div>

          {/* Section: Diet */}
          <SectionHeader icon={Utensils} title="Diet & Nutrition" />
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Diet Type</label>
             <div className="flex flex-wrap gap-2 mb-4">
               {['Omnivore', 'Vegetarian', 'Vegan', 'Paleo', 'Keto'].map(opt => (
                 <button
                   key={opt}
                   onClick={() => handleChange('dietaryType', opt)}
                   className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${formData.dietaryType === opt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                 >
                   {opt}
                 </button>
               ))}
             </div>
             
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Restrictions</label>
             <div className="flex flex-wrap gap-2 mb-4">
               {['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Low Sugar', 'Low Sodium', 'Shellfish-Free'].map(opt => (
                 <button
                   key={opt}
                   onClick={() => handleRestrictionToggle(opt)}
                   className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${formData.dietaryRestrictions.includes(opt) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}
                 >
                   {opt}
                 </button>
               ))}
             </div>

             <label className="text-xs font-bold text-red-500 uppercase mb-1.5 block">My Allergens</label>
             <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                {formData.allergens && formData.allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.allergens.map(alg => (
                      <span key={alg} className="inline-flex items-center gap-1 bg-white text-red-600 px-2 py-1 rounded-md text-xs font-bold border border-red-100 shadow-sm">
                        <ShieldAlert size={10} />
                        {alg}
                        <button onClick={() => handleRemoveAllergen(alg)} className="ml-1 text-red-300 hover:text-red-600">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific allergens saved from fridge items.</p>
                )}
             </div>

             {/* Medical Report moved here */}
             {renderMedicalReportSection()}
          </div>

          {/* Section: Lifestyle */}
          <SectionHeader icon={Clock} title="Lifestyle & Sustainability" />
          <div className="space-y-4">
             <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Cooking Time Preference</label>
               <select 
                 value={formData.cookingTime} 
                 onChange={(e) => handleChange('cookingTime', e.target.value)}
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
               >
                 <option value="Quick (<15m)">Quick (&lt; 15 mins)</option>
                 <option value="Medium (30-45m)">Standard (30-45 mins)</option>
                 <option value="Elaborate (1h+)">Chef Mode (1 hr+)</option>
               </select>
             </div>
             
             <div 
               onClick={() => handleChange('sustainabilityFocus', !formData.sustainabilityFocus)}
               className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${formData.sustainabilityFocus ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
             >
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-full ${formData.sustainabilityFocus ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Leaf size={18} />
                   </div>
                   <div>
                      <div className="font-bold text-sm text-slate-800">Prioritize Sustainability</div>
                      <div className="text-xs text-slate-500">Reduce waste & use expiring items</div>
                   </div>
                </div>
                {formData.sustainabilityFocus && <Check size={18} className="text-emerald-600" />}
             </div>
          </div>

          {/* Section: Biometrics */}
          <SectionHeader icon={User} title="You" />
          <div className="space-y-3">
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Display Name</label>
               <input 
                 type="text" 
                 value={formData.name} 
                 onChange={(e) => handleChange('name', e.target.value)} 
                 className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
               />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Age</label>
                 <input type="number" value={formData.age} onChange={(e) => handleChange('age', parseInt(e.target.value))} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200" />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Height (cm)</label>
                 <input type="number" value={formData.height} onChange={(e) => handleChange('height', parseInt(e.target.value))} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200" />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Weight (kg)</label>
                 <input type="number" value={formData.weight} onChange={(e) => handleChange('weight', parseInt(e.target.value))} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200" />
               </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white">
           {/* Cloud Sync Button */}
           <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                 <Cloud size={16} className="text-slate-400" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cloud Backup</span>
                    <span className="text-[10px] text-slate-400">
                       {lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}
                    </span>
                 </div>
              </div>
              <button 
                 onClick={onForceSync}
                 disabled={isSyncing}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isSyncing ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600'}`}
              >
                 {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : null}
                 {isSyncing ? 'Saving...' : 'Backup'}
              </button>
           </div>

           <Button onClick={handleSave} className="w-full py-3">
             Save & Update Profile
           </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
