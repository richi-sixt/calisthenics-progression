import { View, Text, ActivityIndicator } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { useTranslation } from "@/i18n";
import type { WorkoutStatsBucket, WorkoutStatsResponse } from "@/types";
import { useChartTheme } from "./chart-theme";

export type FrequencyMetric = "workout_count" | "total_reps" | "total_duration";

export function WorkoutFrequencyChart({
  data,
  isLoading,
  error,
  metric,
}: {
  data?: WorkoutStatsResponse;
  isLoading: boolean;
  error: unknown;
  metric: FrequencyMetric;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View className="mt-4 items-center py-8">
        <ActivityIndicator />
      </View>
    );
  }
  if (error) {
    return (
      <Text className="mt-4 text-center text-red-600 dark:text-red-400">
        {t("statistics.loadError")}
      </Text>
    );
  }
  if (!data || data.buckets.every((b) => b[metric] === 0)) {
    return (
      <View className="mt-4 items-center py-8">
        <Text className="text-base font-medium text-gray-600 dark:text-gray-400">
          {t("statistics.frequency.noData")}
        </Text>
      </View>
    );
  }

  return <WorkoutFrequencyChartCanvas buckets={data.buckets} metric={metric} />;
}

function WorkoutFrequencyChartCanvas({
  buckets,
  metric,
}: {
  buckets: WorkoutStatsBucket[];
  metric: FrequencyMetric;
}) {
  const theme = useChartTheme();
  const chartData = buckets.map((b) => ({ period: b.period, value: b[metric] }));

  return (
    <View className="mt-4 h-64">
      <CartesianChart
        data={chartData}
        xKey="period"
        yKeys={["value"]}
        domainPadding={{ left: 16, right: 16, top: 16, bottom: 8 }}
        axisOptions={{
          font: theme.font,
          labelColor: theme.axis,
          lineColor: theme.grid,
          formatYLabel: (v) => String(Math.round(v)),
        }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.value}
            chartBounds={chartBounds}
            color={theme.accent}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}
