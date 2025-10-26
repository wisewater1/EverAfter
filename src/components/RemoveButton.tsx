import React, { useState } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface RemoveButtonProps {
  onRemove: () => Promise<void> | void;
  itemName?: string;
  itemType?: string;
  confirmationMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'text';
  disabled?: boolean;
  className?: string;
  showConfirmation?: boolean;
}

export default function RemoveButton({
  onRemove,
  itemName = 'this item',
  itemType = 'item',
  confirmationMessage,
  size = 'md',
  variant = 'icon',
  disabled = false,
  className = '',
  showConfirmation = true,
}: RemoveButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveClick = () => {
    if (showConfirmation) {
      setIsConfirmOpen(true);
    } else {
      handleConfirmedRemove();
    }
  };

  const handleConfirmedRemove = async () => {
    setIsRemoving(true);
    setError(null);

    try {
      await onRemove();
      setIsConfirmOpen(false);
    } catch (err: any) {
      console.error('Remove error:', err);
      setError(err.message || 'Failed to remove item. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const baseClasses = 'transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50';

  const variantClasses = {
    icon: `${sizeClasses[size]} bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:border-red-500/30 active:scale-95`,
    button: `${sizeClasses[size]} px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg shadow-lg shadow-red-500/20 active:scale-95`,
    text: `${sizeClasses[size]} text-red-400 hover:text-red-300 hover:underline`,
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed pointer-events-none';

  const buttonClass = `${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${className}`;

  return (
    <>
      <button
        onClick={handleRemoveClick}
        disabled={disabled || isRemoving}
        className={buttonClass}
        aria-label={`Remove ${itemType}`}
        title={`Remove ${itemName}`}
      >
        {variant === 'icon' && <Trash2 className={iconSizes[size]} />}
        {variant === 'button' && (
          <span className="flex items-center gap-2">
            <Trash2 className={iconSizes[size]} />
            Remove
          </span>
        )}
        {variant === 'text' && 'Remove'}
      </button>

      {showConfirmation && (
        <Modal
          isOpen={isConfirmOpen}
          onClose={() => !isRemoving && setIsConfirmOpen(false)}
          title="Confirm Removal"
        >
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-slate-300 mb-2">
                  {confirmationMessage || `Are you sure you want to remove ${itemName}?`}
                </p>
                <p className="text-sm text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Error</p>
                    <p className="text-sm text-red-300/80 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isRemoving}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedRemove}
                disabled={isRemoving}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
