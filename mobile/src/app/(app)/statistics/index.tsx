import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useExercises, useExercise } from "@/hooks/use-exercises";
import { useCategories } from "@/hooks/use-categories";
import { useExerciseStats, useWorkoutStats } from "@/hooks/use-workout-stats";
import { ListPickerField } from "@/components/statistics/ListPickerField";
import { SegmentedControl } from "@/components/statistics/SegmentedControl";
import { ExerciseProgressionChart } from "@/components/statistics/ExerciseProgressionChart";
import {
  WorkoutFrequencyChart,
  type FrequencyMetric,
} from "@/components/statistics/WorkoutFrequencyChart";
import { useTranslation } from "@/i18n";
import type { StatsGranularity } from "@/types";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return formatDate(d);
}

function todayStr(): string {
  return formatDate(new Date());
}

type RangePreset = "3m" | "6m" | "12m";

const RANGE_MONTHS: Record<RangePreset, number> = { "3m": 3, "6m": 6, "12m": 12 };

export default function StatisticsScreen() {
  const { t } = useTranslation();

  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [progression, setProgression] = useState<string | null>(null);
  const [metric, setMetric] = useState<"best" | "total">("best");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [freqMetric, setFreqMetric] = useState<FrequencyMetric>("workout_count");
  const [granularity, setGranularity] = useState<StatsGranularity>("month");
  const [range, setRange] = useState<RangePreset>("12m");

  const to = todayStr();
  const from = monthsAgo(RANGE_MONTHS[range]);

  // Progression levels are exercise-specific, so a previously selected
  // progression no longer applies once the exercise changes.
  const handleExerciseChange = (id: string | null) => {
    setExerciseId(id ? Number(id) : null);
    setProgression(null);
  };

  const { data: exercisesData } = useExercises(1, "mine");
  const exercises = exercisesData?.data ?? [];
  const selectedExercise = useExercise(exerciseId);
  const progressionLevels = selectedExercise.data?.data.progression_levels ?? [];

  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data ?? [];

  const exerciseStats = useExerciseStats(exerciseId, from, to, granularity, progression);
  const workoutStats = useWorkoutStats(from, to, granularity, categoryId);

  const progressionItems = [
    { id: "", label: t("statistics.progressionFilter.all") },
    ...[...progressionLevels]
      .sort((a, b) => a.level_order - b.level_order)
      .map((lvl) => ({ id: lvl.name, label: lvl.name })),
  ];

  const categoryItems = [
    { id: "", label: t("statistics.categoryFilter.all") },
    ...categories.map((c) => ({ id: String(c.id), label: c.name })),
  ];

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerStyle={{ padding: 16 }}
    >
      <ListPickerField
        label={t("statistics.exercisePicker.label")}
        placeholder={t("workoutForm.selectExercise")}
        value={exerciseId != null ? String(exerciseId) : null}
        items={exercises.map((ex) => ({ id: String(ex.id), label: ex.title }))}
        onChange={handleExerciseChange}
        searchable
        searchPlaceholder={t("workoutForm.searchExercisePlaceholder")}
        emptyText={t("workoutForm.noExercisesFound")}
        testID="statistics-exercise-picker"
      />

      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("statistics.range.label")}
          </Text>
          <View className="mt-1">
            <SegmentedControl
              options={[
                { value: "3m" as RangePreset, label: t("statistics.range.3m") },
                { value: "6m" as RangePreset, label: t("statistics.range.6m") },
                { value: "12m" as RangePreset, label: t("statistics.range.12m") },
              ]}
              value={range}
              onChange={setRange}
              testID="statistics-range"
            />
          </View>
        </View>
        <SegmentedControl
          options={[
            { value: "week" as StatsGranularity, label: t("statistics.granularity.week") },
            { value: "month" as StatsGranularity, label: t("statistics.granularity.month") },
          ]}
          value={granularity}
          onChange={setGranularity}
          testID="statistics-granularity"
        />
      </View>

      <View className="mt-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("statistics.progression.title")}
          </Text>
          {exerciseId != null && (
            <SegmentedControl
              options={[
                { value: "best" as const, label: t("statistics.metric.best") },
                { value: "total" as const, label: t("statistics.metric.total") },
              ]}
              value={metric}
              onChange={setMetric}
              testID="statistics-metric"
            />
          )}
        </View>
        {exerciseId != null && progressionItems.length > 1 && (
          <View className="mt-3">
            <ListPickerField
              label={t("statistics.progressionFilter.label")}
              placeholder={t("statistics.progressionFilter.all")}
              value={progression ?? ""}
              items={progressionItems}
              onChange={(id) => setProgression(id || null)}
              testID="statistics-progression-picker"
            />
          </View>
        )}
        <ExerciseProgressionChart
          data={exerciseStats.data?.data}
          isLoading={exerciseStats.isLoading}
          error={exerciseStats.error}
          exerciseSelected={exerciseId != null}
          metric={metric}
        />
      </View>

      <View className="mb-4 mt-8">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("statistics.frequency.title")}
        </Text>
        {categoryItems.length > 1 && (
          <View className="mt-3">
            <ListPickerField
              label={t("statistics.categoryFilter.label")}
              placeholder={t("statistics.categoryFilter.all")}
              value={categoryId != null ? String(categoryId) : ""}
              items={categoryItems}
              onChange={(id) => setCategoryId(id ? Number(id) : null)}
              testID="statistics-category-picker"
            />
          </View>
        )}
        <View className="mt-3">
          <SegmentedControl
            options={[
              {
                value: "workout_count" as FrequencyMetric,
                label: t("statistics.frequency.sessions"),
              },
              {
                value: "total_reps" as FrequencyMetric,
                label: t("statistics.frequency.volumeReps"),
              },
              {
                value: "total_duration" as FrequencyMetric,
                label: t("statistics.frequency.volumeDuration"),
              },
            ]}
            value={freqMetric}
            onChange={setFreqMetric}
            testID="statistics-freq-metric"
          />
        </View>
        <WorkoutFrequencyChart
          data={workoutStats.data?.data}
          isLoading={workoutStats.isLoading}
          error={workoutStats.error}
          metric={freqMetric}
        />
      </View>
    </ScrollView>
  );
}
