'use client';

import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface BorderGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Border radius class (must match inner card radius). Default: "rounded-[24px]" */
  roundedClassName?: string;
  /** Spotlight radius in pixels. Default: 260 */
  glowRadius?: number;
  /** Whether the cursor-responsive white border glow is active. Default: true */
  enabled?: boolean;
}

/**
 * React Bits–inspired BorderGlow component configured strictly with a PURE WHITE
 * edge illumination and soft white outer glow.
 *
 * - Subtle white edge illumination (#FFFFFF)
 * - Soft white outer glow on hover
 * - Cursor-responsive lighting via CSS variables (zero React re-renders on pointer move)
 * - Thin 1px visible border
 */
export function BorderGlow({
  children,
  className,
  roundedClassName = 'rounded-[24px]',
  glowRadius = 260,
  enabled = true,
  ...props
}: BorderGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty('--glow-x', `${x}px`);
      containerRef.current.style.setProperty('--glow-y', `${y}px`);
    },
    [enabled]
  );

  const handlePointerEnter = useCallback(() => {
    if (!enabled || !containerRef.current) return;
    containerRef.current.style.setProperty('--glow-opacity', '1');
  }, [enabled]);

  const handlePointerLeave = useCallback(() => {
    if (!enabled || !containerRef.current) return;
    containerRef.current.style.setProperty('--glow-opacity', '0');
  }, [enabled]);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={
        {
          '--glow-x': '50%',
          '--glow-y': '50%',
          '--glow-opacity': '0',
          '--glow-radius': `${glowRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        'group/glow relative transition-shadow duration-300',
        roundedClassName,
        enabled &&
          'hover:shadow-[0_0_28px_-6px_rgba(255,255,255,0.16),0_12px_36px_-8px_rgba(0,0,0,0.55)]',
        className
      )}
      {...props}
    >
      {/* Base resting subtle 1px border */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 z-20 border border-white/[0.08] transition-colors duration-300 group-hover/glow:border-white/[0.14]',
          roundedClassName
        )}
      />

      {/* Cursor-responsive PURE WHITE 1px border illumination mask */}
      {enabled && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 z-20 transition-opacity duration-300',
            roundedClassName
          )}
          style={{
            opacity: 'var(--glow-opacity, 0)',
            padding: '1px',
            background:
              'radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y), rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.2) 42%, transparent 72%)',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}

      {/* Subtle pure-white ambient surface reflection */}
      {enabled && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 z-10 transition-opacity duration-300',
            roundedClassName
          )}
          style={{
            opacity: 'var(--glow-opacity, 0)',
            background:
              'radial-gradient(calc(var(--glow-radius) * 1.15) circle at var(--glow-x) var(--glow-y), rgba(255, 255, 255, 0.035), transparent 70%)',
          }}
        />
      )}

      {/* Card Content */}
      {children}
    </div>
  );
}

export default BorderGlow;

