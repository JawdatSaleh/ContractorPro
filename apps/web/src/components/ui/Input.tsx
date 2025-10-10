import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="flex flex-col gap-1 text-right text-slate-700 dark:text-slate-200">
        {label && (
          <span className="text-sm font-medium">
            {label}
            {hint && <span className="mr-1 text-xs font-normal text-slate-500">({hint})</span>}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-base shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:ring-sky-400',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 dark:border-rose-500 dark:focus:ring-rose-400',
            className
          )}
          {...props}
        />
        {(helperText || error) && (
          <span className={clsx('text-xs', error ? 'text-rose-500' : 'text-slate-500')}>{error ?? helperText}</span>
        )}
      </label>
    );
  }
);

Input.displayName = 'Input';

export default Input;
