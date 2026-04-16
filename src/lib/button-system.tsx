/**
 * Premium Button System - St. Raphael AI
 *
 * A comprehensive button utility system with consistent styling,
 * accessibility features, and multiple variants for all use cases.
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ButtonIconPosition = 'left' | 'right' | 'only';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: ButtonIconPosition;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  children?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * Base button classes - applies to all button variants
 */
export const baseButtonClasses = [
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'font-medium',
  'transition-all',
  'duration-200',
  'ease-out',
  'focus:outline-none',
  'focus:ring-4',
  'focus:ring-offset-2',
  'focus:ring-offset-gray-900',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'disabled:pointer-events-none',
  'active:scale-[0.98]',
  'select-none'
].join(' ');

/**
 * Size variants with optimal dimensions for touch and desktop
 */
export const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs min-h-[32px]',
  sm: 'px-4 py-2 text-sm min-h-[40px]',
  md: 'px-6 py-2.5 text-base min-h-[44px]',
  lg: 'px-8 py-3 text-lg min-h-[52px]',
  xl: 'px-10 py-4 text-xl min-h-[60px]'
};

/**
 * Rounded corner variants
 */
export const roundedClasses: Record<string, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full'
};

/**
 * Variant styles with premium gradients and effects
 */
export const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-r from-blue-600 to-cyan-600',
    'hover:from-blue-700 hover:to-cyan-700',
    'text-white',
    'shadow-lg shadow-blue-500/30',
    'hover:shadow-xl hover:shadow-blue-500/40',
    'focus:ring-blue-500/50',
    'border border-blue-500/20'
  ].join(' '),

  secondary: [
    'bg-gradient-to-r from-gray-700 to-gray-600',
    'hover:from-gray-600 hover:to-gray-500',
    'text-white',
    'shadow-lg shadow-gray-500/20',
    'hover:shadow-xl hover:shadow-gray-500/30',
    'focus:ring-gray-500/50',
    'border border-gray-600/30'
  ].join(' '),

  tertiary: [
    'bg-gray-800/50',
    'hover:bg-gray-700/60',
    'text-gray-200',
    'border border-gray-700',
    'hover:border-gray-600',
    'focus:ring-gray-500/30',
    'backdrop-blur-sm'
  ].join(' '),

  ghost: [
    'bg-transparent',
    'hover:bg-white/5',
    'text-gray-300',
    'hover:text-white',
    'focus:ring-white/20',
    'border border-transparent',
    'hover:border-white/10'
  ].join(' '),

  danger: [
    'bg-gradient-to-r from-red-600 to-pink-600',
    'hover:from-red-700 hover:to-pink-700',
    'text-white',
    'shadow-lg shadow-red-500/30',
    'hover:shadow-xl hover:shadow-red-500/40',
    'focus:ring-red-500/50',
    'border border-red-500/20'
  ].join(' '),

  success: [
    'bg-gradient-to-r from-green-600 to-emerald-600',
    'hover:from-green-700 hover:to-emerald-700',
    'text-white',
    'shadow-lg shadow-green-500/30',
    'hover:shadow-xl hover:shadow-green-500/40',
    'focus:ring-green-500/50',
    'border border-green-500/20'
  ].join(' '),

  warning: [
    'bg-gradient-to-r from-yellow-600 to-orange-600',
    'hover:from-yellow-700 hover:to-orange-700',
    'text-white',
    'shadow-lg shadow-yellow-500/30',
    'hover:shadow-xl hover:shadow-yellow-500/40',
    'focus:ring-yellow-500/50',
    'border border-yellow-500/20'
  ].join(' ')
};

/**
 * Icon-only button sizes (square aspect ratio)
 */
export const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'w-8 h-8 p-0',
  sm: 'w-10 h-10 p-0',
  md: 'w-12 h-12 p-0',
  lg: 'w-14 h-14 p-0',
  xl: 'w-16 h-16 p-0'
};

/**
 * Loading spinner component
 */
export const LoadingSpinner = ({ size = 'md' }: { size?: ButtonSize }) => {
  const spinnerSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
  );
};

/**
 * Utility function to generate button classes
 */
export function getButtonClasses({
  variant = 'primary',
  size = 'md',
  iconPosition,
  fullWidth = false,
  rounded = 'lg',
  className = ''
}: Partial<ButtonProps>): string {
  const classes = [
    baseButtonClasses,
    variantClasses[variant],
    iconPosition === 'only' ? iconOnlySizeClasses[size] : sizeClasses[size],
    roundedClasses[rounded],
    fullWidth ? 'w-full' : '',
    className
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Accessibility helper - generates aria attributes
 */
export function getButtonAriaProps({
  loading,
  disabled,
  children
}: Partial<ButtonProps>) {
  return {
    'aria-disabled': disabled || loading,
    'aria-busy': loading,
    'aria-label': typeof children === 'string' ? children : undefined
  };
}

/**
 * Button group container classes
 */
export const buttonGroupClasses = {
  horizontal: 'flex items-center gap-2',
  vertical: 'flex flex-col gap-2',
  attached: 'inline-flex [&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0'
};

/**
 * Floating Action Button (FAB) specific classes
 */
export const fabClasses = [
  'fixed',
  'bottom-6',
  'right-6',
  'z-50',
  'shadow-2xl',
  'hover:shadow-3xl',
  'transform',
  'hover:scale-110',
  'transition-all',
  'duration-300'
].join(' ');

/**
 * Toggle button specific classes
 */
export const toggleButtonClasses = {
  base: 'relative inline-flex items-center gap-2 cursor-pointer',
  active: 'bg-blue-600 border-blue-500',
  inactive: 'bg-gray-700 border-gray-600'
};
