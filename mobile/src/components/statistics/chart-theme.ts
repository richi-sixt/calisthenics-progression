import { useMemo } from "react";
import { matchFont } from "@shopify/react-native-skia";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Mirrors the web app's chart colors (same blue accent, same grays) so both
// clients read as the same product. Skia draws raw pixels, so these need to
// be literal colors rather than NativeWind's `dark:` class variant.
const CHART_COLORS = {
  light: {
    accent: "#2563eb", // blue-600
    grid: "#e5e7eb", // gray-200
    axis: "#6b7280", // gray-500
  },
  dark: {
    accent: "#60a5fa", // blue-400
    grid: "#374151", // gray-700
    axis: "#9ca3af", // gray-400
  },
} as const;

export function useChartTheme() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;
  // matchFont queries the system font manager synchronously (no bundled
  // font asset needed), unlike useFont's async data-source loading.
  const font = useMemo(() => matchFont({ fontSize: 11 }), []);
  return { ...colors, font };
}
