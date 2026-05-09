import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface HSelectOption {
  value: string;
  label: string;
}

interface HSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: HSelectOption[];
  isDark: boolean;
  /** Extra classes applied to the outer wrapper div */
  className?: string;
  /**
   * If provided, fully replaces the theme-derived trigger button classes
   * (background, border, text colour). Structural layout classes are kept.
   */
  triggerClassName?: string;
  /** 'sm' for compact inline uses; 'md' (default) for normal form inputs */
  size?: 'sm' | 'md';
}

interface DropPos {
  top: number;
  left: number;
  width: number;
  minWidth: number;
}

export const HSelect = ({
  value,
  onChange,
  options,
  isDark,
  className = '',
  triggerClassName,
  size = 'md',
}: HSelectProps) => {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState<DropPos>({ top: 0, left: 0, width: 0, minWidth: 160 });
  const buttonRef             = useRef<HTMLButtonElement>(null);
  const dropRef               = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  /* Position the floating dropdown below the trigger button */
  const calcPos = () => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setPos({
      top:      r.bottom + 4,
      left:     r.left,
      width:    r.width,
      minWidth: Math.max(r.width, 160),
    });
  };

  const toggle = () => {
    calcPos();
    setOpen(v => !v);
  };

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Trigger theme classes (used when triggerClassName is not provided) */
  const defaultTrigger = isDark
    ? [
        'bg-slate-950 border-slate-700 text-white',
        'hover:border-slate-500',
        open ? 'border-blue-500/50 ring-1 ring-blue-500/20' : '',
      ].join(' ')
    : [
        'bg-white border-gray-300 text-slate-800',
        'hover:border-gray-400',
        open ? 'border-blue-400 ring-1 ring-blue-100' : '',
      ].join(' ');

  const triggerTheme = triggerClassName ?? defaultTrigger;

  /* Whether the chevron should inherit text colour or use a muted tint */
  const chevronCls = triggerClassName
    ? 'opacity-60' // inherit the badge/custom colour, slightly dimmed
    : isDark ? 'text-slate-400' : 'text-gray-400';

  /* Padding/text-size by size variant */
  const padCls = size === 'sm' ? 'pl-2 pr-2 py-1 text-xs' : 'pl-3 pr-2.5 py-2 text-sm';
  const itemPadCls = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const iconSize   = size === 'sm' ? 11 : 13;
  const chevronSize = size === 'sm' ? 12 : 14;

  /* Portal dropdown */
  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top:      pos.top,
        left:     pos.left,
        width:    pos.width,
        minWidth: pos.minWidth,
        zIndex:   9999,
      }}
      className={[
        'rounded-lg border shadow-xl overflow-hidden',
        isDark
          ? 'bg-slate-900 border-slate-700 shadow-black/50'
          : 'bg-white border-gray-200 shadow-gray-300/40',
      ].join(' ')}
    >
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            /* Use onMouseDown + preventDefault so the button doesn't lose focus
               before the click is processed, avoiding premature close. */
            onMouseDown={e => {
              e.preventDefault();
              onChange(opt.value);
              setOpen(false);
            }}
            className={[
              'flex items-center justify-between w-full gap-3',
              itemPadCls,
              'text-left transition-colors duration-100',
              isSelected
                ? isDark
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'bg-blue-50 text-blue-600'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-700 hover:bg-gray-50',
            ].join(' ')}
          >
            <span className="truncate">{opt.label}</span>
            {isSelected && (
              <Check
                size={iconSize}
                className={`shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              />
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={[
          'flex items-center justify-between gap-2 w-full rounded-lg border',
          'transition-all duration-150 cursor-pointer outline-none select-none',
          padCls,
          triggerTheme,
        ].join(' ')}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown
          size={chevronSize}
          className={[
            'shrink-0 transition-transform duration-150',
            open ? 'rotate-180' : '',
            chevronCls,
          ].join(' ')}
        />
      </button>

      {typeof document !== 'undefined' &&
        ReactDOM.createPortal(dropdown, document.body)}
    </div>
  );
};
