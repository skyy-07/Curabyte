import React from 'react';
import { Cloud, Check, RefreshCw, Database, ShieldCheck } from 'lucide-react';

interface CloudWidgetProps {
  isSyncing: boolean;
  lastSynced: Date | null;
  storageUsage: number;
  onForceSync: () => void;
}

const CloudWidget: React.FC<CloudWidgetProps> = ({ isSyncing, lastSynced, storageUsage, onForceSync }) => {
  return (
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
        <Cloud size={100} />
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg transition-colors ${isSyncing ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <Database size={16} />
          </div>
          <h2 className="font-bold text-slate-800">Cloud Storage</h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
           <ShieldCheck size={12} className="text-emerald-500" />
           <span className="font-bold text-slate-500">Secure</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {storageUsage}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">KB Used</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            {isSyncing ? (
              <span className="flex items-center gap-1.5 text-blue-600 font-bold">
                <RefreshCw size={12} className="animate-spin" />
                Syncing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Check size={12} className="text-emerald-500" />
                {lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced'}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={onForceSync}
          disabled={isSyncing}
          className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-blue-600'}`}
        >
          {isSyncing ? 'Saving...' : 'Backup Now'}
        </button>
      </div>

      {/* Progress Bar for Storage (Mock Capacity 5MB) */}
      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isSyncing ? 'bg-blue-500 w-full animate-pulse' : 'bg-slate-800'}`} 
          style={{ width: isSyncing ? '100%' : `${Math.max(5, (storageUsage / 5000) * 100)}%` }} 
        />
      </div>
    </div>
  );
};

export default CloudWidget;