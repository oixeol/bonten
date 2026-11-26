import { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const base =
  'w-full h-9 px-3 text-sm text-fg bg-surface rounded-md border ' +
  'placeholder:text-fg-subtle transition-colors ease-snappy ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid = false, className = '', ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid}
      className={`${base} ${invalid ? 'border-danger' : 'border-border hover:border-border-strong'} ${className}`}
      {...props}
    />
  ),
);
Input.displayName = 'Input';