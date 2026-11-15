import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useApp();

  if (!toast) return null;

  const bgMap = {
    success: 'bg-emerald-50 border-emerald-500 text-emerald-900',
    error: 'bg-rose-50 border-rose-500 text-rose-900',
    warning: 'bg-amber-50 border-amber-500 text-amber-900',
    info: 'bg-blue-50 border-blue-500 text-blue-900',
  };

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fade-in shadow-xl">
      <div className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${bgMap[toast.type]} shadow-lg`}>
        {iconMap[toast.type]}
        <div className="flex-1 text-sm font-medium leading-relaxed">
          {toast.message}
        </div>
        <button
          onClick={clearToast}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

