import { renderWithProviders } from "@/test-utils";
import { WorkoutFrequencyChart } from "@/components/statistics/WorkoutFrequencyChart";

// See ExerciseProgressionChart.test.tsx for why victory-native/chart-theme
// are mocked here: the canvas sub-component needs a native Skia runtime this
// jest environment doesn't provide.
jest.mock("victory-native", () => ({
  CartesianChart: ({
    children,
  }: {
    children: (args: {
      points: { value: unknown[] };
      chartBounds: { left: number; right: number; top: number; bottom: number };
    }) => React.ReactNode;
  }) =>
    children({ points: { value: [] }, chartBounds: { left: 0, right: 0, top: 0, bottom: 0 } }),
  Bar: () => null,
}));
jest.mock("@/components/statistics/chart-theme", () => ({
  useChartTheme: () => ({ accent: "#000", grid: "#000", axis: "#000", font: null }),
}));

describe("WorkoutFrequencyChart", () => {
  it("shows a no-data message when all buckets are zero", async () => {
    const { getByText } = await renderWithProviders(
      <WorkoutFrequencyChart
        isLoading={false}
        error={null}
        metric="workout_count"
        data={{
          granularity: "month",
          category_id: null,
          buckets: [
            { period: "2026-01", workout_count: 0, total_sets: 0, total_reps: 0, total_duration: 0 },
          ],
        }}
      />
    );

    expect(getByText("No workouts logged in this range")).toBeTruthy();
  });

  it("renders the chart without the empty-state message when data is present", async () => {
    const { queryByText } = await renderWithProviders(
      <WorkoutFrequencyChart
        isLoading={false}
        error={null}
        metric="workout_count"
        data={{
          granularity: "month",
          category_id: null,
          buckets: [
            { period: "2026-01", workout_count: 3, total_sets: 12, total_reps: 100, total_duration: 0 },
          ],
        }}
      />
    );

    expect(queryByText("No workouts logged in this range")).toBeNull();
  });

  it("shows a load-error message on failure", async () => {
    const { getByText } = await renderWithProviders(
      <WorkoutFrequencyChart
        isLoading={false}
        error={new Error("network error")}
        metric="workout_count"
      />
    );

    expect(getByText("Failed to load statistics.")).toBeTruthy();
  });
});
