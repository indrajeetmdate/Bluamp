
import React from 'react';
import { XIcon } from './icons/XIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  persistent?: boolean;
  zIndex?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', persistent = false, zIndex = 'z-[100]' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-3xl',
  };

  return (
    <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm ${zIndex} flex justify-center items-center p-4 transition-all duration-300`} onClick={() => !persistent && onClose()}>
      <div
        className={`bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] relative w-full ${sizeClasses[size]} overflow-hidden animate-fade-in-scale`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-8 py-6 bg-[#F9FAFB] border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-brand">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all rounded-full p-2"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-8 max-h-[85vh] overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </div>
       <style>{`
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;
