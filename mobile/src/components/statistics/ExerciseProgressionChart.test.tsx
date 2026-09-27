import { renderWithProviders } from "@/test-utils";
import { ExerciseProgressionChart } from "@/components/statistics/ExerciseProgressionChart";

// The canvas sub-component (mounted only once real bucket data exists) pulls
// in Skia/Reanimated, which need a native runtime this jest environment
// doesn't provide. These tests are about our own branching logic (empty /
// loading / error / has-data), not about verifying Skia actually draws
// pixels -- that's covered by manual/native testing instead.
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
  Line: () => null,
}));
jest.mock("@/components/statistics/chart-theme", () => ({
  useChartTheme: () => ({ accent: "#000", grid: "#000", axis: "#000", font: null }),
}));

describe("ExerciseProgressionChart", () => {
  it("prompts to select an exercise when none is selected", async () => {
    const { getByText } = await renderWithProviders(
      <ExerciseProgressionChart
        exerciseSelected={false}
        isLoading={false}
        error={null}
        metric="best"
      />
    );

    expect(getByText("No exercise selected")).toBeTruthy();
  });

  it("shows a no-data message when all buckets are zero", async () => {
    const { getByText } = await renderWithProviders(
      <ExerciseProgressionChart
        exerciseSelected
        isLoading={false}
        error={null}
        metric="best"
        data={{
          exercise_id: 1,
          counting_type: "reps",
          granularity: "month",
          progression: null,
          buckets: [{ period: "2026-01", best: 0, total: 0, session_count: 0 }],
        }}
      />
    );

    expect(getByText("No logged sets in this range")).toBeTruthy();
  });

  it("renders the chart without the empty-state message when data is present", async () => {
    const { queryByText } = await renderWithProviders(
      <ExerciseProgressionChart
        exerciseSelected
        isLoading={false}
        error={null}
        metric="best"
        data={{
          exercise_id: 1,
          counting_type: "reps",
          granularity: "month",
          progression: null,
          buckets: [{ period: "2026-01", best: 10, total: 10, session_count: 1 }],
        }}
      />
    );

    expect(queryByText("No logged sets in this range")).toBeNull();
    expect(queryByText("No exercise selected")).toBeNull();
  });

  it("shows a load-error message on failure", async () => {
    const { getByText } = await renderWithProviders(
      <ExerciseProgressionChart
        exerciseSelected
        isLoading={false}
        error={new Error("network error")}
        metric="best"
      />
    );

    expect(getByText("Failed to load statistics.")).toBeTruthy();
  });
});
