import React from 'react';
import {
  ButtonProps,
  getButtonClasses,
  getButtonAriaProps,
  LoadingSpinner
} from '../lib/button-system';

/**
 * Premium Button Component
 *
 * A fully-featured, accessible button component with multiple variants,
 * sizes, and states. Optimized for both desktop and mobile interactions.
 *
 * @example
 * <Button variant="primary" size="md" icon={<Icon />}>
 *   Click me
 * </Button>
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  rounded = 'lg',
  children,
  onClick,
  type = 'button',
  className = '',
  ...props
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const buttonClasses = getButtonClasses({
    variant,
    size,
    iconPosition: !children && icon ? 'only' : iconPosition,
    fullWidth,
    rounded,
    className
  });

  const ariaProps = getButtonAriaProps({ loading, disabled, children });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  const showIcon = icon && !loading;
  const showSpinner = loading;
  const iconOnly = !children && icon;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...ariaProps}
      {...props}
    >
      {showSpinner && <LoadingSpinner size={size} />}

      {showIcon && iconPosition === 'left' && (
        <span className="inline-flex items-center justify-center">
          {icon}
        </span>
      )}

      {children && (
        <span className={`${loading ? 'opacity-70' : ''}`}>
          {children}
        </span>
      )}

      {showIcon && iconPosition === 'right' && !iconOnly && (
        <span className="inline-flex items-center justify-center">
          {icon}
        </span>
      )}

      {iconOnly && showIcon && (
        <span className="inline-flex items-center justify-center">
          {icon}
        </span>
      )}
    </button>
  );
}

/**
 * Icon Button - Square button for icons only
 */
export function IconButton({
  icon,
  'aria-label': ariaLabel,
  ...props
}: Omit<ButtonProps, 'children' | 'iconPosition'> & {
  icon: React.ReactNode;
  'aria-label': string;
}) {
  return (
    <Button
      {...props}
      icon={icon}
      iconPosition="only"
      aria-label={ariaLabel}
    />
  );
}

/**
 * Floating Action Button (FAB)
 */
export function FloatingActionButton({
  icon,
  position = 'bottom-right',
  ...props
}: Omit<ButtonProps, 'iconPosition'> & {
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <Button
      {...props}
      icon={icon}
      iconPosition="only"
      size={props.size || 'lg'}
      rounded="full"
      className={`fixed z-50 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 ${positionClasses[position]} ${props.className || ''}`}
    />
  );
}

/**
 * Button Group - Container for grouped buttons
 */
export function ButtonGroup({
  children,
  orientation = 'horizontal',
  attached = false,
  fullWidth = false,
  className = ''
}: {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const baseClasses = orientation === 'horizontal' ? 'flex items-center' : 'flex flex-col';
  const spacingClasses = attached ? '' : 'gap-2';
  const attachedClasses = attached
    ? '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0'
    : '';
  const widthClasses = fullWidth ? 'w-full [&>button]:flex-1' : '';

  return (
    <div className={`${baseClasses} ${spacingClasses} ${attachedClasses} ${widthClasses} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Toggle Button - For on/off states
 */
export function ToggleButton({
  active,
  onToggle,
  children,
  icon,
  size = 'md',
  disabled = false,
  className = ''
}: {
  active: boolean;
  onToggle: (active: boolean) => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ButtonProps['size'];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      variant={active ? 'primary' : 'tertiary'}
      size={size}
      icon={icon}
      disabled={disabled}
      onClick={() => onToggle(!active)}
      className={`${active ? 'ring-2 ring-blue-500/50' : ''} ${className}`}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

/**
 * Link Button - Button styled as a link
 */
export function LinkButton({
  href,
  external = false,
  children,
  className = '',
  ...props
}: Omit<ButtonProps, 'onClick'> & {
  href: string;
  external?: boolean;
}) {
  const linkProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a
      href={href}
      className={getButtonClasses({ ...props, className })}
      {...linkProps}
    >
      {children}
    </a>
  );
}
