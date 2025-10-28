import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: ReactNode;
  padded?: boolean;
}

export function Card({ title, actions, padded = true, className, children, ...props }: CardProps) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5 transition dark:border-slate-700/80 dark:bg-slate-900',
        className
      )}
      {...props}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4 dark:border-slate-700/80">
          {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(padded ? 'px-6 py-5' : '', 'text-slate-700 dark:text-slate-200')}>{children}</div>
    </section>
  );
}

export default Card;
