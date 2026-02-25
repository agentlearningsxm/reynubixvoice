import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

function cn(...inputs: ClassValue[])
{
  return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<"button">
{
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  ...props
}) =>
{
  const variants = {
    primary: [
      'text-white border border-transparent font-semibold',
      'shadow-[0_0_20px_rgba(14,165,233,0.22),0_4px_14px_rgba(0,0,0,0.3)]',
      'hover:shadow-[0_0_30px_rgba(14,165,233,0.38),0_6px_20px_rgba(0,0,0,0.35)]',
    ].join(' '),
    secondary: 'bg-bg-card hover:bg-white/[0.055] text-text-primary border border-border font-medium',
    outline: 'bg-transparent hover:bg-white/[0.04] text-text-primary border border-border font-medium',
    danger: 'bg-money-loss hover:bg-red-600 text-white shadow-lg shadow-red-500/25 border border-transparent font-semibold',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[13px] tracking-[0.01em]',
    md: 'px-6 py-2.5 text-[14px] tracking-[0.01em]',
    lg: 'px-7 py-3.5 text-[15px] tracking-[0.01em]',
  };

  const primaryStyle = variant === 'primary'
    ? { background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' }
    : undefined;

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.025, y: -1.5 }}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      className={cn(
        'rounded-full transition-all duration-200 motion-reduce:transition-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      style={primaryStyle}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
