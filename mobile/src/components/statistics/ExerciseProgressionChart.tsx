import { View, Text, ActivityIndicator } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { useTranslation } from "@/i18n";
import type { ExerciseStatsBucket, ExerciseStatsResponse } from "@/types";
import { useChartTheme } from "./chart-theme";

export function ExerciseProgressionChart({
  data,
  isLoading,
  error,
  exerciseSelected,
  metric,
}: {
  data?: ExerciseStatsResponse;
  isLoading: boolean;
  error: unknown;
  exerciseSelected: boolean;
  metric: "best" | "total";
}) {
  const { t } = useTranslation();

  if (!exerciseSelected) {
    return (
      <View className="mt-4 items-center py-8">
        <Text className="text-base font-medium text-gray-600 dark:text-gray-400">
          {t("statistics.progression.empty")}
        </Text>
        <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("statistics.progression.emptyDescription")}
        </Text>
      </View>
    );
  }
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
  if (!data || data.buckets.every((b) => b.total === 0)) {
    return (
      <View className="mt-4 items-center py-8">
        <Text className="text-base font-medium text-gray-600 dark:text-gray-400">
          {t("statistics.progression.noData")}
        </Text>
      </View>
    );
  }

  return <ExerciseProgressionChartCanvas buckets={data.buckets} metric={metric} />;
}

function ExerciseProgressionChartCanvas({
  buckets,
  metric,
}: {
  buckets: ExerciseStatsBucket[];
  metric: "best" | "total";
}) {
  const theme = useChartTheme();
  const chartData = buckets.map((b) => ({
    period: b.period,
    value: metric === "best" ? b.best : b.total,
  }));

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
        {({ points }) => (
          <Line points={points.value} color={theme.accent} strokeWidth={2} curveType="natural" />
        )}
      </CartesianChart>
    </View>
  );
}
