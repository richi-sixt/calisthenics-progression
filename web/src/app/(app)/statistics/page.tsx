"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/page-header";
import ExercisePicker from "@/components/statistics/exercise-picker";
import ProgressionFilter from "@/components/statistics/progression-filter";
import CategorySelect from "@/components/statistics/category-select";
import ExerciseProgressionChart from "@/components/statistics/exercise-progression-chart";
import WorkoutFrequencyChart, {
  type FrequencyMetric,
} from "@/components/statistics/workout-frequency-chart";
import { useExerciseStats, useWorkoutStats } from "@/hooks/use-workout-stats";
import { useExercise } from "@/hooks/use-exercises";
import { useTranslation } from "@/i18n";
import type { StatsGranularity } from "@/types";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Shift a "YYYY-MM" string by `n` months (negative moves backward). */
function shiftMonth(monthStr: string, n: number): string {
  const [year, month] = monthStr.split("-").map(Number);
  const total = year * 12 + (month - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function firstOfMonth(monthStr: string): string {
  return `${monthStr}-01`;
}

function lastOfMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  // Day 0 of the following month is the last day of this one; computed in
  // UTC throughout to avoid local-timezone off-by-one shifts near midnight.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthStr}-${String(lastDay).padStart(2, "0")}`;
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

export default function StatisticsPage() {
  const { t } = useTranslation();
  const nowMonth = currentMonth();

  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [progression, setProgression] = useState<string | null>(null);
  const [metric, setMetric] = useState<"best" | "total">("best");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [freqMetric, setFreqMetric] = useState<FrequencyMetric>("workout_count");
  const [granularity, setGranularity] = useState<StatsGranularity>("month");
  const [fromMonth, setFromMonth] = useState(() => shiftMonth(nowMonth, -11));
  const [toMonth, setToMonth] = useState(nowMonth);

  const from = firstOfMonth(fromMonth);
  const to = lastOfMonth(toMonth);

  // Progression levels are exercise-specific, so a previously selected
  // progression no longer applies once the exercise changes.
  const handleExerciseChange = (id: number | null) => {
    setExerciseId(id);
    setProgression(null);
  };

  const selectedExercise = useExercise(exerciseId);
  const progressionLevels = selectedExercise.data?.data.progression_levels ?? [];

  const exerciseStats = useExerciseStats(exerciseId, from, to, granularity, progression);
  const workoutStats = useWorkoutStats(from, to, granularity, categoryId);

  return (
    <div>
      <PageHeader title={t("statistics.title")} />

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <ExercisePicker value={exerciseId} onChange={handleExerciseChange} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("statistics.rangeFrom")}
          </label>
          <input
            type="month"
            value={fromMonth}
            max={toMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("statistics.rangeTo")}
          </label>
          <input
            type="month"
            value={toMonth}
            min={fromMonth}
            max={nowMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div className="flex gap-2">
          <ToggleButton active={granularity === "week"} onClick={() => setGranularity("week")}>
            {t("statistics.granularity.week")}
          </ToggleButton>
          <ToggleButton active={granularity === "month"} onClick={() => setGranularity("month")}>
            {t("statistics.granularity.month")}
          </ToggleButton>
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("statistics.progression.title")}
          </h2>
          {exerciseId != null && (
            <div className="flex flex-wrap items-end gap-3">
              <ProgressionFilter
                levels={progressionLevels}
                value={progression}
                onChange={setProgression}
              />
              <div className="flex gap-2">
                <ToggleButton active={metric === "best"} onClick={() => setMetric("best")}>
                  {t("statistics.metric.best")}
                </ToggleButton>
                <ToggleButton active={metric === "total"} onClick={() => setMetric("total")}>
                  {t("statistics.metric.total")}
                </ToggleButton>
              </div>
            </div>
          )}
        </div>
        <ExerciseProgressionChart
          data={exerciseStats.data?.data}
          isLoading={exerciseStats.isLoading}
          error={exerciseStats.error}
          exerciseSelected={exerciseId != null}
          metric={metric}
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("statistics.frequency.title")}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <CategorySelect value={categoryId} onChange={setCategoryId} />
            <div className="flex gap-2">
              <ToggleButton
                active={freqMetric === "workout_count"}
                onClick={() => setFreqMetric("workout_count")}
              >
                {t("statistics.frequency.sessions")}
              </ToggleButton>
              <ToggleButton
                active={freqMetric === "total_reps"}
                onClick={() => setFreqMetric("total_reps")}
              >
                {t("statistics.frequency.volumeReps")}
              </ToggleButton>
              <ToggleButton
                active={freqMetric === "total_duration"}
                onClick={() => setFreqMetric("total_duration")}
              >
                {t("statistics.frequency.volumeDuration")}
              </ToggleButton>
            </div>
          </div>
        </div>
        <WorkoutFrequencyChart
          data={workoutStats.data?.data}
          isLoading={workoutStats.isLoading}
          error={workoutStats.error}
          metric={freqMetric}
        />
      </section>
    </div>
  );
}
