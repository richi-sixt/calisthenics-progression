"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "@/components/ui/empty-state";
import ErrorMessage from "@/components/ui/error-message";
import Loading from "@/components/ui/loading";
import { useTranslation } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import type { WorkoutStatsResponse } from "@/types";
import { useChartColors } from "./chart-theme";

export type FrequencyMetric = "workout_count" | "total_reps" | "total_duration";

const METRIC_LABEL_KEY: Record<FrequencyMetric, TranslationKey> = {
  workout_count: "statistics.frequency.sessions",
  total_reps: "statistics.frequency.volumeReps",
  total_duration: "statistics.frequency.volumeDuration",
};

export default function WorkoutFrequencyChart({
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
  const c = useChartColors();

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data || data.buckets.every((b) => b[metric] === 0)) {
    return <EmptyState title={t("statistics.frequency.noData")} />;
  }

  const metricLabel = t(METRIC_LABEL_KEY[metric]);

  return (
    <div className="mt-4 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.buckets} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="period"
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
          />
          <YAxis
            stroke={c.axis}
            tick={{ fill: c.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: 6,
              fontSize: 12,
              color: c.tooltipText,
            }}
            labelStyle={{ color: c.tooltipText }}
            formatter={(value) => [value, metricLabel]}
          />
          <Bar dataKey={metric} fill={c.accent} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
