import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export default function GlassCard({
  children,
  hover = true,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`glass-card ${hover ? '' : 'hover:transform-none hover:shadow-none'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
