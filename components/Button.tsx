import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}) => {

  const baseStyles = `
    inline-flex items-center justify-center gap-2
    rounded-xl font-semibold
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
    transition-all duration-200
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
  `;

  const variants = {
    primary: `
      bg-primary-600 text-white
      hover:bg-primary-700
      focus:ring-primary-500
      shadow-lg shadow-primary-500/25
      hover:shadow-xl hover:shadow-primary-500/30
    `,
    gradient: `
      bg-gradient-to-r from-primary-600 via-primary-500 to-violet-500
      text-white
      hover:from-primary-700 hover:via-primary-600 hover:to-violet-600
      focus:ring-primary-500
      shadow-lg shadow-primary-500/25
      hover:shadow-xl hover:shadow-primary-500/30
      relative overflow-hidden
    `,
    secondary: `
      bg-white dark:bg-gray-800
      text-gray-700 dark:text-gray-200
      hover:bg-gray-50 dark:hover:bg-gray-750
      hover:text-gray-900 dark:hover:text-white
      focus:ring-gray-300 dark:focus:ring-gray-600
      border border-gray-200 dark:border-gray-700
      shadow-sm hover:shadow
    `,
    danger: `
      bg-danger-500 text-white
      hover:bg-danger-600
      focus:ring-danger-500
      shadow-lg shadow-danger-500/25
      hover:shadow-xl hover:shadow-danger-500/30
    `,
    success: `
      bg-success-500 text-white
      hover:bg-success-600
      focus:ring-success-500
      shadow-lg shadow-success-500/25
      hover:shadow-xl hover:shadow-success-500/30
    `,
    outline: `
      border-2 border-primary-500/50
      bg-transparent
      text-primary-600 dark:text-primary-400
      hover:bg-primary-50 dark:hover:bg-primary-900/20
      hover:border-primary-500
      focus:ring-primary-300
    `,
    ghost: `
      bg-transparent
      text-gray-600 dark:text-gray-400
      hover:bg-gray-100 dark:hover:bg-gray-800
      hover:text-gray-900 dark:hover:text-white
      focus:ring-gray-200 dark:focus:ring-gray-700
    `
  };

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs gap-1',
    sm: 'px-3 py-2 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {/* Shimmer effect for gradient variant */}
      {variant === 'gradient' && !isDisabled && (
        <span className="absolute inset-0 shimmer pointer-events-none" />
      )}

      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        icon && iconPosition === 'left' && (
          <span className={iconSizes[size]}>{icon}</span>
        )
      )}

      <span className="relative">{children}</span>

      {!loading && icon && iconPosition === 'right' && (
        <span className={iconSizes[size]}>{icon}</span>
      )}
    </button>
  );
};

// Modern Link Button variant
interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'primary' | 'default';
  size?: 'sm' | 'md';
}

export const LinkButton: React.FC<LinkButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const variants = {
    primary: 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300',
    default: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
  };

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  return (
    <a
      className={`
        inline-flex items-center gap-1.5 font-medium
        ${variants[variant]}
        ${sizes[size]}
        hover:underline underline-offset-2
        transition-colors
        ${className}
      `}
      {...props}
    >
      {children}
    </a>
  );
};

// Button Group component
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex rounded-xl overflow-hidden shadow-sm ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${child.props.className || ''} rounded-none first:rounded-l-xl last:rounded-r-xl border-r-0 last:border-r focus:z-10`
          });
        }
        return child;
      })}
    </div>
  );
};

export default Button;
