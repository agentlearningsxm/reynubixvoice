import { type ClassValue, clsx } from 'clsx';
import { type HTMLMotionProps, motion } from 'framer-motion';
import type React from 'react';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<'button'> {
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
}) => {
  const variants = {
    primary: [
      'text-accent-ink border border-black/10 font-semibold',
      'shadow-[0_16px_32px_-18px_var(--accent-glow),0_8px_18px_rgba(0,0,0,0.24)]',
      'hover:shadow-[0_24px_40px_-18px_var(--accent-glow),0_12px_24px_rgba(0,0,0,0.3)] hover:brightness-[1.03]',
    ].join(' '),
    secondary:
      'bg-surface-raised hover:bg-control-hover text-text-primary border border-border-subtle font-medium',
    outline:
      'bg-transparent hover:bg-control text-text-primary border border-border-subtle font-medium',
    danger:
      'bg-money-loss hover:bg-red-600 text-white shadow-lg shadow-red-500/25 border border-transparent font-semibold',
  };

  const sizes = {
    sm: 'px-4 py-2 text-[13px] tracking-[0.01em]',
    md: 'px-6 py-2.5 text-[14px] tracking-[0.01em]',
    lg: 'px-7 py-3.5 text-[15px] tracking-[0.01em]',
  };

  const primaryStyle =
    variant === 'primary'
      ? {
          background:
            'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
        }
      : undefined;

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.025, y: -1.5 }}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      className={cn(
        'rounded-full transition-all duration-200 motion-reduce:transition-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main',
        variants[variant],
        sizes[size],
        className,
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
