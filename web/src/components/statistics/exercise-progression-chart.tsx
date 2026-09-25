"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "@/components/ui/empty-state";
import ErrorMessage from "@/components/ui/error-message";
import Loading from "@/components/ui/loading";
import { useTranslation } from "@/i18n";
import type { ExerciseStatsResponse } from "@/types";
import { useChartColors } from "./chart-theme";

export default function ExerciseProgressionChart({
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
  const c = useChartColors();

  if (!exerciseSelected) {
    return (
      <EmptyState
        title={t("statistics.progression.empty")}
        description={t("statistics.progression.emptyDescription")}
      />
    );
  }
  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!data || data.buckets.every((b) => b.total === 0)) {
    return <EmptyState title={t("statistics.progression.noData")} />;
  }

  const unit = data.counting_type === "duration" ? "s" : "";
  const metricLabel = metric === "best" ? t("statistics.metric.best") : t("statistics.metric.total");

  return (
    <div className="mt-4 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.buckets} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
            formatter={(value) => [`${value}${unit}`, metricLabel]}
          />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={c.accent}
            strokeWidth={2}
            dot={{ r: 4, fill: c.accent, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
