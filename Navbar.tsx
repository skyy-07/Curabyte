
import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, ShoppingBasket, ShoppingCart, Soup, Plus, Mic, Camera } from 'lucide-react';

interface NavbarProps {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
  onScan: () => void;
  onVoiceAdd: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onChange, onScan, onVoiceAdd }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItem = (view: ViewState, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => {
        onChange(view);
        setIsExpanded(false);
      }}
      className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative z-10 ${
        currentView === view ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  const handleAction = (action: () => void) => {
    // Small delay to allow animation to start closing before action triggers for better UX
    setIsExpanded(false);
    setTimeout(() => action(), 150);
  };

  return (
    <>
      {/* Backdrop for menu - Rendered separately with lower z-index to avoid blurring the buttons */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 px-2 pb-4 pt-1 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] flex justify-between items-center z-50 max-w-md mx-auto w-full">
        {navItem('dashboard', <LayoutDashboard size={22} />, 'Home')}
        {navItem('inventory', <ShoppingBasket size={22} />, 'Basket')}
        
        {/* Central Action Button with Pop-out Menu */}
        <div className="relative -top-5 flex flex-col items-center justify-end z-50">
          
          {/* Sub-Button: Scan */}
          <div 
            className={`absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center gap-2 ${
               isExpanded ? '-translate-y-28 -translate-x-16 opacity-100 scale-100 pointer-events-auto' : 'translate-y-0 translate-x-0 opacity-0 scale-50 pointer-events-none'
            }`}
          >
             <button 
               onClick={() => handleAction(onScan)}
               className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center hover:bg-slate-800 hover:scale-105 transition-transform border-2 border-white ring-2 ring-slate-100"
               aria-label="Scan"
             >
               <Camera size={24} />
             </button>
             <span className="text-[11px] font-bold text-slate-800 bg-white px-2.5 py-1 rounded-full shadow-md border border-slate-100 whitespace-nowrap">Scan</span>
          </div>

          {/* Sub-Button: Voice */}
          <div 
            className={`absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center gap-2 ${
               isExpanded ? '-translate-y-28 translate-x-16 opacity-100 scale-100 pointer-events-auto' : 'translate-y-0 translate-x-0 opacity-0 scale-50 pointer-events-none'
            }`}
          >
             <button 
               onClick={() => handleAction(onVoiceAdd)}
               className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:bg-blue-500 hover:scale-105 transition-transform border-2 border-white ring-2 ring-blue-100"
               aria-label="Voice Entry"
             >
               <Mic size={24} />
             </button>
             <span className="text-[11px] font-bold text-slate-800 bg-white px-2.5 py-1 rounded-full shadow-md border border-slate-100 whitespace-nowrap">Voice Input</span>
          </div>

          {/* Main Toggle Button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`h-16 w-16 rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 z-50 border-4 border-slate-50 ${
              isExpanded ? 'bg-slate-100 text-slate-800 rotate-[135deg]' : 'bg-blue-600 text-white hover:scale-105 active:scale-95'
            }`}
          >
            <Plus size={32} />
          </button>
        </div>

        {navItem('recipes', <Soup size={22} />, 'Recipes')}
        {navItem('grocery', <ShoppingCart size={22} />, 'Shop')}
      </div>
    </>
  );
};

export default Navbar;
