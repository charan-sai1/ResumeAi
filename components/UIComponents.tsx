
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { XCircle } from 'lucide-react';
import { UploadCloud } from 'lucide-react';
import { FileText } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'ai', loading?: boolean }> = 
  ({ children, className = '', variant = 'primary', loading, ...props }) => {
  
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 border border-transparent",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white",
    ai: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-transparent"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>}
    <input 
      className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors ${className}`}
      {...props}
    />
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>}
    <textarea 
      className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors min-h-[100px] ${className}`}
      {...props}
    />
  </div>
);

export const Card: React.FC<{ children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200`}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

export const AIEnhanceButton: React.FC<{ onClick: () => void; loading: boolean; score?: number }> = ({ onClick, loading, score }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className="group flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors mt-1 mb-2"
  >
    <Sparkles className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
    {loading ? 'Optimizing...' : 'AI Enhance'}
    {score !== undefined && score > 0 && (
      <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${score >= 8 ? 'bg-green-900 text-green-300' : score >= 5 ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>
        {score}/10
      </span>
    )}
  </button>
);

export const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void; duration?: number }> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-bottom-5 duration-300 ${type === 'success' ? 'bg-slate-900 border-green-900 text-green-400' : 'bg-slate-900 border-red-900 text-red-400'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 text-slate-500 hover:text-white">&times;</button>
    </div>
  );
};

export const LoadingOverlay: React.FC<{ message: string, progress?: { current: number, total: number } }> = ({ message, progress }) => (
  <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Processing</h3>
      <p className="text-slate-400 mb-4">{message}</p>
      
      {progress && progress.total > 0 && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Processing file {progress.current} of {progress.total}
          </p>
        </div>
      )}
    </div>
  </div>
);

export const DragOverlay: React.FC<{ isDragging: boolean }> = ({ isDragging }) => {
  if (!isDragging) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-indigo-500/20 backdrop-blur-sm border-4 border-indigo-500 border-dashed m-4 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
      <div className="bg-slate-900/90 p-8 rounded-full mb-4 shadow-2xl">
        <UploadCloud className="w-16 h-16 text-indigo-400" />
      </div>
      <h2 className="text-3xl font-bold text-white drop-shadow-lg">Drop files to analyze</h2>
      <p className="text-indigo-200 mt-2 text-lg font-medium drop-shadow-md">PDF, DOCX, or TXT</p>
    </div>
  );
};
