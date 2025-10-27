/**
 * Edge Sparkle Button Component
 *
 * A button with contrasting edge/border colors that sparkles on hover.
 * Matches the visual style of the sign-out button's hover animation.
 */

import React from 'react';

interface EdgeSparkleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function EdgeSparkleButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  type = 'button',
}: EdgeSparkleButtonProps) {
  // Variant color mappings
  const variantColors = {
    primary: 'rgb(0, 243, 255)',
    secondary: 'rgb(168, 85, 247)',
    success: 'rgb(16, 185, 129)',
    warning: 'rgb(245, 158, 11)',
    danger: 'rgb(239, 68, 68)',
    info: 'rgb(59, 130, 246)',
  };

  const borderColor = variantColors[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`relative inline-flex items-center justify-center ${size === 'sm' ? 'px-4 py-2 text-xs' : size === 'lg' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'} font-semibold text-white bg-slate-900/80 backdrop-blur-md rounded-xl border-2 transition-all duration-300 hover:bg-slate-900/95 hover:transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${fullWidth ? 'w-full' : ''} ${className} group`}
      style={{
        borderColor: borderColor,
        boxShadow: `0 0 8px ${borderColor}40`,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.animation = 'edge-sparkle 2s ease-in-out infinite';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.animation = 'none';
      }}
    >
      {/* Sparkle effect on hover */}
      <style>{`
        @keyframes edge-sparkle {
          0%, 100% {
            box-shadow: 0 0 8px ${borderColor}40, 0 0 16px ${borderColor}20;
          }
          25% {
            box-shadow: 0 0 16px ${borderColor}80, 0 0 32px ${borderColor}40, 0 0 48px ${borderColor}20;
          }
          50% {
            box-shadow: 0 0 24px ${borderColor}, 0 0 48px ${borderColor}60, 0 0 64px ${borderColor}30;
          }
          75% {
            box-shadow: 0 0 16px ${borderColor}80, 0 0 32px ${borderColor}40, 0 0 48px ${borderColor}20;
          }
        }
      `}</style>

      {/* Button Content */}
      <span className="flex items-center gap-2 relative z-10">
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {icon && <span className="inline-flex">{icon}</span>}
        <span>{children}</span>
      </span>
    </button>
  );
}
