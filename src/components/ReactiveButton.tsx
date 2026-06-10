import React from 'react';

interface ReactiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'teal' | 'gold';
  children: React.ReactNode;
}

export default function ReactiveButton({
  variant = 'teal',
  children,
  className = '',
  ...props
}: ReactiveButtonProps) {
  return (
    <button
      className={`btn-reactive ${className}`}
      data-variant={variant}
      {...props}
    >
      <span>{children}</span>
      <i className="edge" aria-hidden="true"></i>
    </button>
  );
}
