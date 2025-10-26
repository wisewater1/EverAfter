import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalManager } from '../lib/keyboard-navigation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-7xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalManagerRef = useRef(new ModalManager());

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalManagerRef.current.open(modalRef.current, onClose);
    } else if (!isOpen) {
      modalManagerRef.current.close();
    }

    return () => {
      if (isOpen) {
        modalManagerRef.current.close();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 w-full ${
          sizeClasses[size]
        } max-h-[90vh] overflow-hidden flex flex-col ${className}`}
      >
        {(title || showCloseButton) && (
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 p-4 sm:p-6 flex items-center justify-between flex-shrink-0">
            {title && (
              <h2 id="modal-title" className="text-lg sm:text-xl font-medium text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ml-auto"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        )}

        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
}
