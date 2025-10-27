/**
 * Edge Sparkle Button Component
 *
 * A button with contrasting edge/border colors that sparkles on hover.
 * Matches the visual style of the sign-out button's hover animation.
 */

import React from 'react';
import './EdgeSparkleButton.css';

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
  const classes = [
    'edge-sparkle-button',
    `edge-sparkle-button--${variant}`,
    `edge-sparkle-button--${size}`,
    disabled && 'edge-sparkle-button--disabled',
    loading && 'edge-sparkle-button--loading',
    fullWidth && 'edge-sparkle-button--full-width',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {/* Sparkling Border Container */}
      <span className="edge-sparkle-button__border" aria-hidden="true">
        <span className="edge-sparkle-button__border-inner"></span>
      </span>

      {/* Button Content */}
      <span className="edge-sparkle-button__content">
        {loading && (
          <span className="edge-sparkle-button__spinner" aria-label="Loading">
            <svg
              className="edge-sparkle-button__spinner-svg"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="32"
              />
            </svg>
          </span>
        )}
        {icon && <span className="edge-sparkle-button__icon">{icon}</span>}
        <span className="edge-sparkle-button__text">{children}</span>
      </span>
    </button>
  );
}
