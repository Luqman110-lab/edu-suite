import React from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
  mobilePrimary?: boolean;
}

interface MobileDataViewProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  actions?: (item: T) => React.ReactNode;
  isDark?: boolean;
}

export function MobileDataView<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data found',
  loading = false,
  actions,
  isDark = false,
}: MobileDataViewProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {emptyMessage}
      </div>
    );
  }

  const primaryColumn = columns.find(c => c.mobilePrimary) || columns[0];
  const secondaryColumns = columns.filter(c => !c.mobileHidden && c !== primaryColumn).slice(0, 3);

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
            <tr>
              {columns.filter(c => !c.mobileHidden).map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  } ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`${onRowClick ? 'cursor-pointer' : ''} ${
                  isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                } transition-colors`}
              >
                {columns.filter(c => !c.mobileHidden).map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'} ${column.className || ''}`}
                  >
                    {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '-')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div onClick={e => e.stopPropagation()}>{actions(item)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`rounded-xl border p-4 ${onRowClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${
              isDark 
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
            } transition-all`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {primaryColumn.render ? primaryColumn.render(item) : String(item[primaryColumn.key as keyof T] ?? '-')}
                </div>
                <div className="mt-2 space-y-1.5">
                  {secondaryColumns.map((column) => (
                    <div key={String(column.key)} className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {column.header}:
                      </span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {actions && (
                <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                  {actions(item)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => (
  <div className={`flex flex-col sm:flex-row gap-3 mb-4 ${className}`}>
    {children}
  </div>
);

interface MobileSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  isDark?: boolean;
}

export const MobileSelect: React.FC<MobileSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  isDark = false,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full sm:w-auto px-3 py-2.5 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
      isDark 
        ? 'bg-gray-800 border-gray-600 text-white' 
        : 'bg-white border-gray-300 text-gray-700'
    } ${className}`}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isDark?: boolean;
}

export const MobileSearch: React.FC<MobileSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  isDark = false,
}) => (
  <div className={`relative flex-1 ${className}`}>
    <svg
      className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
        isDark 
          ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' 
          : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
      }`}
    />
  </div>
);

export const MobilePageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  isDark?: boolean;
}> = ({ title, subtitle, actions, isDark }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <div>
      <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
      {subtitle && <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{subtitle}</p>}
    </div>
    {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const MobileCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  isDark?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}> = ({ children, className = '', isDark = false, padding = 'md' }) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };
  
  return (
    <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

export const MobileTabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  isDark?: boolean;
}> = ({ tabs, activeTab, onChange, isDark }) => (
  <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
    <div className={`inline-flex rounded-lg border p-1 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
            activeTab === tab.id
              ? isDark 
                ? 'bg-gray-700 text-white shadow' 
                : 'bg-white text-gray-900 shadow'
              : isDark 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);

export const MobileActionButton: React.FC<{
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
}> = ({ icon, label, onClick, variant = 'ghost', size = 'sm', className = '' }) => {
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400',
    ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700',
  };

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      title={label}
    >
      {icon}
      {label && <span className="text-xs font-medium hidden sm:inline">{label}</span>}
    </button>
  );
};
