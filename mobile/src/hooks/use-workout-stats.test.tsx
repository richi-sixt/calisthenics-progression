import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useExerciseStats, useWorkoutStats } from "@/hooks/use-workout-stats";
import { api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  api: { get: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper };
}

describe("useExerciseStats", () => {
  it("does not call the API when exerciseId is null", () => {
    const { wrapper } = setup();
    renderHook(() => useExerciseStats(null, "2026-01-01", "2026-12-31", "month"), { wrapper });
    expect(api.get).not.toHaveBeenCalled();
  });

  it("requests the exercise stats endpoint with from/to/granularity", async () => {
    const { wrapper } = setup();
    (api.get as jest.Mock).mockResolvedValue({ data: { buckets: [] } });

    renderHook(() => useExerciseStats(7, "2026-01-01", "2026-12-31", "week"), { wrapper });

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/exercises/7/stats", {
        from: "2026-01-01",
        to: "2026-12-31",
        granularity: "week",
      })
    );
  });

  it("includes progression only when set", async () => {
    const { wrapper } = setup();
    (api.get as jest.Mock).mockResolvedValue({ data: { buckets: [] } });

    renderHook(
      () => useExerciseStats(7, "2026-01-01", "2026-12-31", "month", "Advanced"),
      { wrapper }
    );

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/exercises/7/stats", {
        from: "2026-01-01",
        to: "2026-12-31",
        granularity: "month",
        progression: "Advanced",
      })
    );
  });
});

describe("useWorkoutStats", () => {
  it("requests the workout stats endpoint without a category by default", async () => {
    const { wrapper } = setup();
    (api.get as jest.Mock).mockResolvedValue({ data: { buckets: [] } });

    renderHook(() => useWorkoutStats("2026-01-01", "2026-12-31", "month"), { wrapper });

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/workouts/stats", {
        from: "2026-01-01",
        to: "2026-12-31",
        granularity: "month",
      })
    );
  });

  it("includes category only when set", async () => {
    const { wrapper } = setup();
    (api.get as jest.Mock).mockResolvedValue({ data: { buckets: [] } });

    renderHook(() => useWorkoutStats("2026-01-01", "2026-12-31", "month", 3), { wrapper });

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/workouts/stats", {
        from: "2026-01-01",
        to: "2026-12-31",
        granularity: "month",
        category: "3",
      })
    );
  });
});
