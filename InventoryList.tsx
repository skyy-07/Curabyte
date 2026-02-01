
import React, { useState, useMemo } from 'react';
import { Ingredient, IngredientCategory } from '../types';
import { Trash2, AlertCircle, Plus, ChevronDown, Check, X, Clock, ShieldAlert, Edit2 } from 'lucide-react';
import Button from './Button';

interface InventoryListProps {
  items: Ingredient[];
  allergens: string[];
  onRemove: (id: string) => void;
  onAdd: () => void;
  onManualAdd: (ingredient: Omit<Ingredient, 'id'>) => void;
  onToggleAllergen: (name: string) => void;
  onClearAll: () => void;
  onUpdate: (id: string, updates: Partial<Ingredient>) => void;
}

const COMMON_STAPLES: { name: string; category: IngredientCategory; days: number }[] = [
  { name: 'Milk', category: 'dairy', days: 7 },
  { name: 'Eggs', category: 'dairy', days: 14 },
  { name: 'Bread', category: 'pantry', days: 5 },
  { name: 'Spinach', category: 'produce', days: 3 },
  { name: 'Chicken Breast', category: 'meat', days: 3 },
  { name: 'Rice', category: 'pantry', days: 180 },
  { name: 'Pasta', category: 'pantry', days: 180 },
  { name: 'Apple', category: 'produce', days: 14 },
  { name: 'Banana', category: 'produce', days: 5 },
  { name: 'Yogurt', category: 'dairy', days: 7 },
  { name: 'Cheese', category: 'dairy', days: 14 },
  { name: 'Butter', category: 'dairy', days: 30 },
  { name: 'Tomato', category: 'produce', days: 5 },
  { name: 'Onion', category: 'produce', days: 14 },
  { name: 'Potato', category: 'produce', days: 14 },
  { name: 'Ground Beef', category: 'meat', days: 3 },
  { name: 'Salmon', category: 'meat', days: 2 },
  { name: 'Avocado', category: 'produce', days: 3 },
  { name: 'Coffee', category: 'pantry', days: 30 },
  { name: 'Tea', category: 'pantry', days: 180 },
  { name: 'Orange Juice', category: 'beverage', days: 7 },
  { name: 'Water', category: 'beverage', days: 365 },
  { name: 'Carrot', category: 'produce', days: 21 },
  { name: 'Broccoli', category: 'produce', days: 5 },
  { name: 'Almond Milk', category: 'dairy', days: 10 },
  { name: 'Oats', category: 'pantry', days: 180 },
];

const InventoryList: React.FC<InventoryListProps> = ({ 
  items, 
  allergens, 
  onRemove, 
  onAdd, 
  onManualAdd,
  onToggleAllergen,
  onClearAll,
  onUpdate
}) => {
  const [showManualForm, setShowManualForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Ingredient['category']>('produce');
  const [expiryDays, setExpiryDays] = useState<string>('5');
  const [suggestions, setSuggestions] = useState<{ name: string; category: IngredientCategory; days: number }[]>([]);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{name: string, category: IngredientCategory, expiry: string}>({
      name: '', category: 'produce', expiry: ''
  });

  // Build a master list of known ingredients from staples + current inventory
  const allKnownIngredients = useMemo(() => {
     const map = new Map<string, { name: string; category: IngredientCategory; days: number }>();
     
     // 1. Add staples
     COMMON_STAPLES.forEach(i => map.set(i.name.toLowerCase(), i));

     // 2. Add current items (infer days from existing items if available)
     items.forEach(item => {
        if (!map.has(item.name.toLowerCase())) {
           map.set(item.name.toLowerCase(), { 
              name: item.name, 
              category: item.category, 
              days: item.expiryEstimateDays || 7 
           });
        }
     });
     
     return Array.from(map.values());
  }, [items]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    
    if (val.trim().length > 0) {
       // Simple fuzzy match: case-insensitive substring
       const matches = allKnownIngredients
        .filter(item => item.name.toLowerCase().includes(val.toLowerCase()))
        .sort((a, b) => {
          // Prioritize startsWith
          const aStarts = a.name.toLowerCase().startsWith(val.toLowerCase());
          const bStarts = b.name.toLowerCase().startsWith(val.toLowerCase());
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 5);
       setSuggestions(matches);
    } else {
       setSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion: { name: string; category: IngredientCategory; days: number }) => {
     setName(suggestion.name);
     setCategory(suggestion.category);
     setExpiryDays(suggestion.days.toString());
     setSuggestions([]);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'produce': return 'bg-green-100 text-green-700 border-green-200';
      case 'dairy': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'meat': return 'bg-red-100 text-red-700 border-red-200';
      case 'pantry': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'beverage': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getExpiryVisuals = (days?: number) => {
    if (days === undefined) return { color: 'bg-slate-200', text: '', bgClass: 'bg-white', label: '' };
    if (days <= 2) return { color: 'bg-red-500', text: 'text-red-600', bgClass: 'bg-red-50/50 border-red-100', label: 'Expires soon' };
    if (days <= 5) return { color: 'bg-amber-500', text: 'text-amber-600', bgClass: 'bg-amber-50/30 border-amber-100', label: 'Use shortly' };
    return { color: 'bg-emerald-500', text: 'text-emerald-600', bgClass: 'bg-white border-slate-100', label: 'Fresh' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onManualAdd({
      name: name.trim(),
      category,
      expiryEstimateDays: parseInt(expiryDays) || 7,
      confidence: 1.0
    });
    setName('');
    setExpiryDays('5');
    setSuggestions([]);
    setShowManualForm(false);
  };

  const startEditing = (item: Ingredient) => {
      setEditingId(item.id);
      setEditValues({
          name: item.name,
          category: item.category,
          expiry: item.expiryEstimateDays?.toString() || ''
      });
  };

  const cancelEditing = () => {
      setEditingId(null);
  };

  const saveEditing = () => {
      if (!editingId) return;
      onUpdate(editingId, {
          name: editValues.name,
          category: editValues.category,
          expiryEstimateDays: parseInt(editValues.expiry) || 0
      });
      setEditingId(null);
  };

  return (
    <div className="pb-20 space-y-4">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-slate-900">My Basket</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500">{items.length} Items</span>
          {items.length > 0 && (
             <button 
               onClick={onClearAll}
               className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors border border-red-100"
             >
               <Trash2 size={12} /> Clear
             </button>
          )}
        </div>
      </div>

      {showManualForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-md animate-in slide-in-from-top duration-300 relative z-20">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Quick Add</h3>
            <button type="button" onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Item Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => setTimeout(() => setSuggestions([]), 200)} // Delay to allow click
                placeholder="e.g. Avocado"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
                autoComplete="off"
              />
              {/* Autocomplete Suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                   {suggestions.map((suggestion, idx) => (
                      <div 
                         key={idx}
                         onClick={() => selectSuggestion(suggestion)}
                         className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700 text-sm">{suggestion.name}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{suggestion.category}</span>
                         </div>
                         <Plus size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                   ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none capitalize"
                  >
                    <option value="produce">Produce</option>
                    <option value="dairy">Dairy</option>
                    <option value="meat">Meat</option>
                    <option value="pantry">Pantry</option>
                    <option value="beverage">Beverage</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="w-28">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Expires In</label>
                <div className="relative">
                   <input
                    type="number"
                    min="1"
                    max="365"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                   />
                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">days</span>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 text-white mt-2">
              <Check size={18} /> Save to Basket
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3">
        {items.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400">Your basket is empty!</p>
            <button onClick={onAdd} className="mt-2 text-blue-600 font-medium text-sm">Scan items to add</button>
          </div>
        ) : (
          items.map((item) => {
            // RENDER EDITING MODE
            if (editingId === item.id) {
               return (
                  <div key={item.id} className="p-3 rounded-2xl border shadow-sm flex flex-col gap-3 bg-blue-50 border-blue-200 animate-in fade-in duration-200">
                      <input
                          autoFocus
                          type="text"
                          value={editValues.name}
                          onChange={(e) => setEditValues(prev => ({...prev, name: e.target.value}))}
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                          placeholder="Item Name"
                      />
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                             <select
                                value={editValues.category}
                                onChange={(e) => setEditValues(prev => ({...prev, category: e.target.value as IngredientCategory}))}
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none capitalize text-sm"
                              >
                                <option value="produce">Produce</option>
                                <option value="dairy">Dairy</option>
                                <option value="meat">Meat</option>
                                <option value="pantry">Pantry</option>
                                <option value="beverage">Beverage</option>
                                <option value="other">Other</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                          <div className="relative w-24">
                              <input
                                  type="number"
                                  min="0"
                                  value={editValues.expiry}
                                  onChange={(e) => setEditValues(prev => ({...prev, expiry: e.target.value}))}
                                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-medium"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">days</span>
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                          <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Cancel</button>
                          <button onClick={saveEditing} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 shadow-md">
                              <Check size={12} /> Save
                          </button>
                      </div>
                  </div>
               );
            }

            // RENDER DISPLAY MODE
            const expiry = getExpiryVisuals(item.expiryEstimateDays);
            const freshnessPercent = item.expiryEstimateDays !== undefined ? Math.min(100, (item.expiryEstimateDays / 10) * 100) : 0;
            const isAllergen = allergens.includes(item.name);
            
            return (
              <div 
                key={item.id} 
                className={`p-3 rounded-2xl border shadow-sm flex flex-col group animate-in fade-in slide-in-from-left-2 transition-all duration-300 ${isAllergen ? 'bg-red-50 border-red-200' : expiry.bgClass}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg capitalize border shadow-sm relative ${isAllergen ? 'bg-red-100 text-red-600 border-red-200' : getCategoryColor(item.category)}`}>
                      {item.name[0]}
                      {isAllergen && <ShieldAlert size={12} className="absolute -top-1 -right-1 text-red-600 bg-white rounded-full" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 capitalize leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        <span className="opacity-70">{item.category}</span>
                        {item.expiryEstimateDays !== undefined && (
                          <span className={`flex items-center gap-1 ${expiry.text}`}>
                            <Clock size={10} /> {item.expiryEstimateDays}d left
                          </span>
                        )}
                        {isAllergen && <span className="text-red-500 font-black">ALLERGEN</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onToggleAllergen(item.name)}
                      className={`p-2 rounded-full transition-colors ${isAllergen ? 'text-red-600 bg-red-100 hover:bg-red-200' : 'text-slate-300 hover:text-red-400 hover:bg-slate-100'}`}
                      title={isAllergen ? "Unmark Allergen" : "Mark as Allergen"}
                    >
                      <ShieldAlert size={16} className={isAllergen ? "fill-current" : ""} />
                    </button>
                    <button 
                      onClick={() => startEditing(item)}
                      className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {item.expiryEstimateDays !== undefined && (
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between items-center px-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${expiry.text}`}>
                        {expiry.label}
                      </span>
                      {item.expiryEstimateDays <= 2 && <AlertCircle size={12} className="text-red-500 animate-pulse" />}
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${expiry.color}`} 
                        style={{ width: `${freshnessPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onAdd}
          className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-all bg-white"
        >
          <Plus size={18} /> Scan
        </button>
        <button 
          onClick={() => setShowManualForm(true)}
          className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-500 hover:text-emerald-500 font-bold transition-all bg-white"
        >
          <Plus size={18} /> Manual
        </button>
      </div>
    </div>
  );
};

export default InventoryList;
