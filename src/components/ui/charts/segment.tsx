'use client';

import React from 'react';
import {
  useChartHoverSelector,
  useChartStable,
  type ChartSelection,
} from './chart-context';

export interface SegmentBackgroundProps {
  /** Background fill color or CSS variable. Default: var(--chart-segment-background, rgba(223, 255, 82, 0.25)) */
  fill?: string;
  /** Fill opacity. Default: 1 */
  fillOpacity?: number;
  /** Additional CSS class */
  className?: string;
}

export interface SegmentLineProps {
  /** Line stroke color. Default: var(--chart-segment-line, #191B19) */
  stroke?: string;
  /** Stroke width in pixels. Default: 1.5 */
  strokeWidth?: number;
  /** Stroke variant. Default: "solid" */
  variant?: 'solid' | 'dashed';
  /** Stroke opacity. Default: 0.95 */
  strokeOpacity?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Shaded band highlighting a user-selected range on the chart
 */
export function SegmentBackground({
  fill = 'var(--chart-segment-background, rgba(223, 255, 82, 0.25))',
  fillOpacity = 1,
  className = '',
}: SegmentBackgroundProps) {
  const { innerHeight } = useChartStable();
  const selection = useChartHoverSelector((h) => h.selection);

  if (!selection || !selection.active) return null;

  const width = Math.max(0, selection.endX - selection.startX);
  if (width <= 0) return null;

  return (
    <rect
      x={selection.startX}
      y={0}
      width={width}
      height={innerHeight}
      fill={fill}
      fillOpacity={fillOpacity}
      className={className}
      pointerEvents="none"
      rx={2}
    />
  );
}
SegmentBackground.displayName = 'SegmentBackground';
(SegmentBackground as any).__isUnderlay = true;

/**
 * Vertical boundary line at the start of the selected range
 */
export function SegmentLineFrom({
  stroke = 'var(--chart-segment-line, #191B19)',
  strokeWidth = 1.5,
  variant = 'solid',
  strokeOpacity = 0.95,
  className = '',
}: SegmentLineProps) {
  const { innerHeight } = useChartStable();
  const selection = useChartHoverSelector((h) => h.selection);

  if (!selection || !selection.active) return null;

  return (
    <line
      x1={selection.startX}
      x2={selection.startX}
      y1={0}
      y2={innerHeight}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeDasharray={variant === 'dashed' ? '3 3' : undefined}
      className={className}
      pointerEvents="none"
    />
  );
}
SegmentLineFrom.displayName = 'SegmentLineFrom';
(SegmentLineFrom as any).__isPostOverlay = true;

/**
 * Vertical boundary line at the end of the selected range
 */
export function SegmentLineTo({
  stroke = 'var(--chart-segment-line, #191B19)',
  strokeWidth = 1.5,
  variant = 'solid',
  strokeOpacity = 0.95,
  className = '',
}: SegmentLineProps) {
  const { innerHeight } = useChartStable();
  const selection = useChartHoverSelector((h) => h.selection);

  if (!selection || !selection.active) return null;

  return (
    <line
      x1={selection.endX}
      x2={selection.endX}
      y1={0}
      y2={innerHeight}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeOpacity={strokeOpacity}
      strokeDasharray={variant === 'dashed' ? '3 3' : undefined}
      className={className}
      pointerEvents="none"
    />
  );
}
SegmentLineTo.displayName = 'SegmentLineTo';
(SegmentLineTo as any).__isPostOverlay = true;
