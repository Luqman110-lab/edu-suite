import React from 'react';
import { X, Check, AlertCircle, Info, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

// ============================================================================
// MODERN CARD COMPONENT
// ============================================================================

interface CardProps {
    children: React.ReactNode;
    className?: string;
    glass?: boolean;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    glass = false,
    hover = false,
    padding = 'md'
}) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    return (
        <div className={`
      rounded-2xl
      ${glass
                ? 'glass dark:glass-dark'
                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50'
            }
      ${hover ? 'hover-lift cursor-pointer' : ''}
      shadow-card
      ${paddingClasses[padding]}
      ${className}
    `}>
            {children}
        </div>
    );
};

// ============================================================================
// MODERN BADGE COMPONENT
// ============================================================================

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'violet';
    size?: 'sm' | 'md';
    dot?: boolean;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    className = ''
}) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
        success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
        danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
        violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    };

    const dotColors = {
        default: 'bg-gray-500',
        primary: 'bg-primary-500',
        success: 'bg-success-500',
        warning: 'bg-warning-500',
        danger: 'bg-danger-500',
        violet: 'bg-violet-500',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm'
    };

    return (
        <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
            {children}
        </span>
    );
};

// ============================================================================
// MODERN AVATAR COMPONENT
// ============================================================================

interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'away' | 'busy';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = '',
    name = '',
    size = 'md',
    status,
    className = ''
}) => {
    const sizes = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl'
    };

    const statusSizes = {
        xs: 'w-1.5 h-1.5 border',
        sm: 'w-2 h-2 border',
        md: 'w-2.5 h-2.5 border-2',
        lg: 'w-3 h-3 border-2',
        xl: 'w-4 h-4 border-2'
    };

    const statusColors = {
        online: 'bg-success-500',
        offline: 'bg-gray-400',
        away: 'bg-warning-500',
        busy: 'bg-danger-500'
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={`relative inline-flex ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt || name}
                    className={`${sizes[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800`}
                />
            ) : (
                <div className={`
          ${sizes[size]} 
          rounded-full 
          bg-gradient-to-br from-primary-400 to-violet-500
          flex items-center justify-center 
          text-white font-semibold
          ring-2 ring-white dark:ring-gray-800
        `}>
                    {getInitials(name)}
                </div>
            )}
            {status && (
                <span className={`
          absolute bottom-0 right-0 
          ${statusSizes[size]} 
          ${statusColors[status]}
          rounded-full 
          border-white dark:border-gray-800
        `} />
            )}
        </div>
    );
};

// ============================================================================
// MODERN STAT WIDGET COMPONENT
// ============================================================================

interface StatWidgetProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    trend?: number;
    trendLabel?: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}

export const StatWidget: React.FC<StatWidgetProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendLabel,
    variant = 'primary',
    className = ''
}) => {
    const gradients = {
        primary: 'stat-gradient-primary',
        success: 'stat-gradient-success',
        warning: 'stat-gradient-warning',
        danger: 'stat-gradient-danger'
    };

    const iconBg = {
        primary: 'bg-primary-500',
        success: 'bg-success-500',
        warning: 'bg-warning-500',
        danger: 'bg-danger-500'
    };

    return (
        <Card className={`relative overflow-hidden ${className}`} hover>
            <div className={`absolute inset-0 ${gradients[variant]}`} />
            <div className="relative">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                            {value}
                        </h3>
                    </div>
                    <div className={`${iconBg[variant]} p-3 rounded-xl shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>
                {(trend !== undefined || subtitle) && (
                    <div className="mt-4 flex items-center gap-2">
                        {trend !== undefined && (
                            <span className={`
                inline-flex items-center gap-1 text-sm font-semibold
                ${trend > 0 ? 'text-success-600' : trend < 0 ? 'text-danger-600' : 'text-gray-500'}
              `}>
                                {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
                            </span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {trendLabel || subtitle}
                        </span>
                    </div>
                )}
            </div>
        </Card>
    );
};

// ============================================================================
// MODERN LOADING SPINNER
// ============================================================================

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    return (
        <Loader2 className={`${sizes[size]} animate-spin text-primary-500 ${className}`} />
    );
};

// ============================================================================
// MODERN SKELETON LOADER
// ============================================================================

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height
}) => {
    const variants = {
        text: 'rounded-md h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-xl'
    };

    return (
        <div
            className={`
        bg-gray-200 dark:bg-gray-700 
        animate-pulse
        ${variants[variant]}
        ${className}
      `}
            style={{ width, height }}
        />
    );
};

// ============================================================================
// MODERN EMPTY STATE
// ============================================================================

interface EmptyStateProps {
    icon?: React.ElementType;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            {Icon && (
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
};

// ============================================================================
// MODERN TOAST / ALERT
// ============================================================================

interface AlertProps {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

export const Alert: React.FC<AlertProps> = ({
    variant = 'info',
    title,
    children,
    onClose,
    className = ''
}) => {
    const variants = {
        info: {
            bg: 'bg-primary-50 dark:bg-primary-900/20',
            border: 'border-primary-200 dark:border-primary-800',
            icon: Info,
            iconColor: 'text-primary-500'
        },
        success: {
            bg: 'bg-success-50 dark:bg-success-900/20',
            border: 'border-success-200 dark:border-success-800',
            icon: CheckCircle,
            iconColor: 'text-success-500'
        },
        warning: {
            bg: 'bg-warning-50 dark:bg-warning-900/20',
            border: 'border-warning-200 dark:border-warning-800',
            icon: AlertTriangle,
            iconColor: 'text-warning-500'
        },
        error: {
            bg: 'bg-danger-50 dark:bg-danger-900/20',
            border: 'border-danger-200 dark:border-danger-800',
            icon: AlertCircle,
            iconColor: 'text-danger-500'
        }
    };

    const config = variants[variant];
    const IconComponent = config.icon;

    return (
        <div className={`
      ${config.bg} ${config.border}
      border rounded-xl p-4
      animate-fade-in-up
      ${className}
    `}>
            <div className="flex gap-3">
                <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                    {title && (
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h4>
                    )}
                    <div className="text-sm text-gray-700 dark:text-gray-300">{children}</div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// MODERN TABS COMPONENT
// ============================================================================

interface Tab {
    id: string;
    label: string;
    icon?: React.ElementType;
    count?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    variant?: 'pills' | 'underline';
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    onChange,
    variant = 'pills',
    className = ''
}) => {
    if (variant === 'underline') {
        return (
            <div className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
                <nav className="flex gap-6">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onChange(tab.id)}
                                className={`
                  flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition-all
                  ${isActive
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }
                `}
                            >
                                {Icon && <Icon className="w-4 h-4" />}
                                {tab.label}
                                {tab.count !== undefined && (
                                    <Badge variant={isActive ? 'primary' : 'default'} size="sm">
                                        {tab.count}
                                    </Badge>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        );
    }

    return (
        <div className={`inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`}>
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${isActive
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }
            `}
                    >
                        {Icon && <Icon className="w-4 h-4" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <Badge variant={isActive ? 'primary' : 'default'} size="sm">
                                {tab.count}
                            </Badge>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

// ============================================================================
// MODERN INPUT COMPONENT
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ElementType;
    iconPosition?: 'left' | 'right';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    ...props
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && iconPosition === 'left' && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
            w-full px-4 py-2.5 rounded-xl
            bg-white dark:bg-gray-800
            border ${error ? 'border-danger-500' : 'border-gray-200 dark:border-gray-700'}
            text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
            transition-all
            ${Icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${Icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${className}
          `}
                    {...props}
                />
                {Icon && iconPosition === 'right' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-danger-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

// ============================================================================
// MODERN PROGRESS BAR
// ============================================================================

interface ProgressProps {
    value: number;
    max?: number;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
    value,
    max = 100,
    variant = 'primary',
    size = 'md',
    showLabel = false,
    className = ''
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const heights = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4'
    };

    const colors = {
        primary: 'bg-gradient-to-r from-primary-500 to-violet-500',
        success: 'bg-gradient-to-r from-success-500 to-success-600',
        warning: 'bg-gradient-to-r from-warning-500 to-warning-600',
        danger: 'bg-gradient-to-r from-danger-500 to-danger-600'
    };

    return (
        <div className={className}>
            {showLabel && (
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
                </div>
            )}
            <div className={`${heights[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
                <div
                    className={`${heights[size]} ${colors[variant]} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

// ============================================================================
// MODERN DIVIDER
// ============================================================================

interface DividerProps {
    label?: string;
    className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className = '' }) => {
    if (label) {
        return (
            <div className={`flex items-center gap-4 ${className}`}>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
        );
    }

    return <div className={`h-px bg-gray-200 dark:bg-gray-700 ${className}`} />;
};

// ============================================================================
// MODERN ICON BUTTON
// ============================================================================

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ElementType;
    variant?: 'default' | 'primary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon: Icon,
    variant = 'default',
    size = 'md',
    className = '',
    ...props
}) => {
    const sizes = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3'
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    const variants = {
        default: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
        primary: 'bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400',
        danger: 'bg-danger-100 hover:bg-danger-200 dark:bg-danger-900/30 dark:hover:bg-danger-900/50 text-danger-600 dark:text-danger-400',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
    };

    return (
        <button
            className={`
        ${sizes[size]} 
        ${variants[variant]}
        rounded-xl
        transition-all
        focus:outline-none focus:ring-2 focus:ring-primary-500/30
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
            {...props}
        >
            <Icon className={iconSizes[size]} />
        </button>
    );
};

// ============================================================================
// MODERN SELECT COMPONENT
// ============================================================================

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
    label,
    error,
    options,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    ref={ref}
                    className={`
            w-full px-4 py-2.5 rounded-xl
            bg-white dark:bg-gray-800
            border ${error ? 'border-danger-500' : 'border-gray-200 dark:border-gray-700'}
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
            transition-all
            appearance-none
            ${className}
          `}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-danger-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';

export default {
    Card,
    Badge,
    Avatar,
    StatWidget,
    Spinner,
    Skeleton,
    EmptyState,
    Alert,
    Tabs,
    Input,
    Select,
    Progress,
    Divider,
    IconButton
};
