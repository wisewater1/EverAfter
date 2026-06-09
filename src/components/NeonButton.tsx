import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import './NeonButton.css';

export interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  sparkleIntensity?: 'subtle' | 'normal' | 'intense';
  fullWidth?: boolean;
  loading?: boolean;
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      sparkleIntensity = 'normal',
      fullWidth = false,
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = 'neon-button';
    const variantClass = `neon-button--${variant}`;
    const sizeClass = `neon-button--${size}`;
    const sparkleClass = `neon-button--sparkle-${sparkleIntensity}`;
    const widthClass = fullWidth ? 'neon-button--full-width' : '';
    const loadingClass = loading ? 'neon-button--loading' : '';
    const disabledClass = disabled || loading ? 'neon-button--disabled' : '';

    const combinedClasses = [
      baseClasses,
      variantClass,
      sizeClass,
      sparkleClass,
      widthClass,
      loadingClass,
      disabledClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={combinedClasses}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        <span className="neon-button__border"></span>
        <span className="neon-button__content">
          {loading && (
            <span className="neon-button__spinner" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="neon-button__spinner-svg">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="60"
                  strokeDashoffset="15"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          <span className="neon-button__text">{children}</span>
        </span>
      </button>
    );
  }
);

NeonButton.displayName = 'NeonButton';

export default NeonButton;
