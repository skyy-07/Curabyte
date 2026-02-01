
import React, { useMemo, useState } from 'react';
import { ShoppingItem, IngredientCategory } from '../types';
import { ShoppingCart, CheckCircle2, Circle, Trash2, Plus, X, ChevronDown, Search } from 'lucide-react';
import Button from './Button';

interface GroceryListProps {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearChecked: () => void;
  onAdd: (item: { name: string; category: IngredientCategory }) => void;
}

interface CategorySectionProps {
  title: string;
  catItems: ShoppingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, catItems, onToggle, onRemove }) => {
  if (catItems.length === 0) return null;
  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{title}</h3>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {catItems.map((item) => (
          <div 
            key={item.id} 
            className={`flex items-center gap-3 p-3.5 border-b border-slate-50 last:border-0 transition-all ${item.checked ? 'bg-slate-50/50' : 'hover:bg-blue-50/30'}`}
          >
            <button 
              onClick={() => onToggle(item.id)}
              className={`flex-shrink-0 transition-colors ${item.checked ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}
            >
              {item.checked ? <CheckCircle2 size={22} className="fill-current" /> : <Circle size={22} />}
            </button>
            
            <div className="flex-1" onClick={() => onToggle(item.id)}>
              <span className={`font-medium text-sm block transition-all ${item.checked ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                {item.name}
              </span>
            </div>
            
            <button 
              onClick={() => onRemove(item.id)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const GroceryList: React.FC<GroceryListProps> = ({ items, onToggle, onRemove, onClearChecked, onAdd }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<IngredientCategory>('pantry');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Group items by category
  const groupedItems = useMemo(() => {
    // Filter items first based on search query
    const filteredItems = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, ShoppingItem[]> = {
      produce: [],
      dairy: [],
      meat: [],
      pantry: [],
      beverage: [],
      other: []
    };
    
    // Sort: Unchecked first, then alphabetically
    const sorted = [...filteredItems].sort((a, b) => {
       if (a.checked === b.checked) return a.name.localeCompare(b.name);
       return a.checked ? 1 : -1;
    });

    sorted.forEach(item => {
      const cat = item.category || 'other';
      if (groups[cat]) {
        groups[cat].push(item);
      } else {
        groups['other'].push(item);
      }
    });

    return groups;
  }, [items, searchQuery]);

  const categoriesOrder: IngredientCategory[] = ['produce', 'dairy', 'meat', 'pantry', 'beverage', 'other'];
  const hasCheckedItems = items.some(i => i.checked);
  
  // Calculate total filtered items count to handle "No results" case
  const totalFilteredCount = Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAdd({ name: newItemName.trim(), category: newItemCategory });
    setNewItemName('');
    setNewItemCategory('pantry');
    setShowAddForm(false);
    setSearchQuery(''); // Clear search on add
  };

  const renderAddForm = () => (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-md mb-6 animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Add Item</h3>
        <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Item Name</label>
          <input
            autoFocus
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Olive Oil"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Category</label>
          <div className="relative">
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as IngredientCategory)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none capitalize"
            >
              {categoriesOrder.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <Button type="submit" className="w-full bg-blue-600 text-white mt-2">
          <Plus size={18} /> Add to List
        </Button>
      </div>
    </form>
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center text-slate-400 px-8">
        {showAddForm ? (
           <div className="w-full">
             {renderAddForm()}
           </div>
        ) : (
          <>
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <ShoppingCart size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">List is Empty</h3>
            <p className="text-sm max-w-[200px] mb-6">Generate a meal plan to automatically add missing ingredients.</p>
            <Button onClick={() => setShowAddForm(true)} variant="secondary">
              <Plus size={16} /> Add Item Manually
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
           <h2 className="text-xl font-bold text-slate-900">Shopping List</h2>
           <p className="text-xs text-slate-400 font-medium">{items.filter(i => !i.checked).length} items remaining</p>
        </div>
        {hasCheckedItems && (
           <button 
             onClick={onClearChecked}
             className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
           >
             Clear Checked
           </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text"
          placeholder="Search list..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showAddForm && renderAddForm()}

      <div className="space-y-1">
        {totalFilteredCount === 0 && searchQuery ? (
           <div className="text-center py-12">
              <p className="text-slate-400 mb-2">No items found for "{searchQuery}"</p>
              <button 
                onClick={() => {
                   setNewItemName(searchQuery);
                   setShowAddForm(true);
                   setSearchQuery('');
                }} 
                className="text-blue-600 text-sm font-bold hover:underline"
              >
                Add "{searchQuery}" to list
              </button>
           </div>
        ) : (
          categoriesOrder.map(cat => (
            <CategorySection 
              key={cat} 
              title={cat} 
              catItems={groupedItems[cat]} 
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
      
      {!showAddForm && (
        <div className="mt-8 pt-4 border-t border-slate-100">
           <button 
             onClick={() => setShowAddForm(true)}
             className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 font-bold transition-all bg-white flex items-center justify-center gap-2"
           >
             <Plus size={18} /> Add Item
           </button>
           <p className="text-xs text-slate-400 text-center mt-4">
              Tip: Recipes automatically add missing items here.
           </p>
        </div>
      )}
    </div>
  );
};

export default GroceryList;
