"use client";

import { useTheme } from "next-themes";

// Mirrors this app's existing Tailwind accent/gray tokens (the same blue used
// for primary buttons/links, the same grays used for borders and muted text)
// so the charts read as part of the app rather than a bolted-on palette.
// Recharts renders to raw SVG, so these need to be literal colors rather than
// Tailwind's `dark:` class variant.
const CHART_COLORS = {
  light: {
    accent: "#2563eb", // blue-600
    grid: "#e5e7eb", // gray-200
    axis: "#6b7280", // gray-500
    tooltipBg: "#ffffff",
    tooltipBorder: "#e5e7eb",
    tooltipText: "#111827", // gray-900
  },
  dark: {
    accent: "#60a5fa", // blue-400
    grid: "#374151", // gray-700
    axis: "#9ca3af", // gray-400
    tooltipBg: "#1f2937", // gray-800
    tooltipBorder: "#374151",
    tooltipText: "#f3f4f6", // gray-100
  },
} as const;

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;
}
