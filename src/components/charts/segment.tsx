"use client";

import { m, useTransform } from "motion/react";
import { chartCssVars, useChartStable } from "./chart-context";
import { useHighlightSegment } from "./use-highlight-segment";

export interface SegmentBackgroundProps {
  /** Fill color for the segment highlight band. Default: var(--chart-segment-background) */
  fill?: string;
  /** Number of data points on either side of hovered point when not dragging. Default: 1 */
  span?: number;
}

export function SegmentBackground({
  fill = chartCssVars.segmentBackground,
  span = 1,
}: SegmentBackgroundProps) {
  const { innerHeight, isLoaded } = useChartStable();
  const { xSpring, widthSpring, isActive } = useHighlightSegment({
    enabled: true,
    span,
  });

  if (!(isActive && isLoaded) || innerHeight <= 0) {
    return null;
  }

  return (
    <m.rect
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      fill={fill}
      height={innerHeight}
      initial={{ opacity: 0 }}
      pointerEvents="none"
      transition={{ duration: 0.2, ease: "easeOut" }}
      width={widthSpring}
      x={xSpring}
      y={0}
    />
  );
}
SegmentBackground.displayName = "SegmentBackground";

export interface SegmentLineProps {
  /** Stroke color for the boundary line. Default: var(--chart-segment-line) */
  stroke?: string;
  /** Stroke width in pixels. Default: 1 */
  strokeWidth?: number;
  /** Dash array pattern. Default: "4,4" */
  strokeDasharray?: string;
  /** Number of data points on either side of hovered point when not dragging. Default: 1 */
  span?: number;
}

export function SegmentLineFrom({
  stroke = chartCssVars.segmentLine,
  strokeWidth = 1,
  strokeDasharray = "4,4",
  span = 1,
}: SegmentLineProps) {
  const { innerHeight, isLoaded } = useChartStable();
  const { xSpring, isActive } = useHighlightSegment({
    enabled: true,
    span,
  });

  if (!(isActive && isLoaded) || innerHeight <= 0) {
    return null;
  }

  return (
    <m.line
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      pointerEvents="none"
      stroke={stroke}
      strokeDasharray={strokeDasharray}
      strokeWidth={strokeWidth}
      transition={{ duration: 0.2, ease: "easeOut" }}
      x1={xSpring}
      x2={xSpring}
      y1={0}
      y2={innerHeight}
    />
  );
}
SegmentLineFrom.displayName = "SegmentLineFrom";

export function SegmentLineTo({
  stroke = chartCssVars.segmentLine,
  strokeWidth = 1,
  strokeDasharray = "4,4",
  span = 1,
}: SegmentLineProps) {
  const { innerHeight, isLoaded } = useChartStable();
  const { xSpring, widthSpring, isActive } = useHighlightSegment({
    enabled: true,
    span,
  });
  const xEnd = useTransform(
    [xSpring, widthSpring],
    ([x, w]: number[]) => (x ?? 0) + (w ?? 0)
  );

  if (!(isActive && isLoaded) || innerHeight <= 0) {
    return null;
  }

  return (
    <m.line
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      pointerEvents="none"
      stroke={stroke}
      strokeDasharray={strokeDasharray}
      strokeWidth={strokeWidth}
      transition={{ duration: 0.2, ease: "easeOut" }}
      x1={xEnd}
      x2={xEnd}
      y1={0}
      y2={innerHeight}
    />
  );
}
SegmentLineTo.displayName = "SegmentLineTo";

