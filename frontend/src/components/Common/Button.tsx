import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const baseClasses = 'rounded-md font-medium transition-colors duration-200';

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' },
    secondary: { backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)' },
    danger: { backgroundColor: 'var(--accent-red)', color: '#ffffff' },
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`.trim()}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
};
