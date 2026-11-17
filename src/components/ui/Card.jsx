import React from 'react';
import clsx from 'clsx';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden transition-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', title, subtitle, action }) => {
  return (
    <div className={clsx('px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        {title && <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return <div className={clsx('p-5 sm:p-6', className)}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={clsx('px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/70 border-t border-slate-100/90 text-xs text-slate-500', className)}>
      {children}
    </div>
  );
};

export default Card;
