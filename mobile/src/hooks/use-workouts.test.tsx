import { act, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useToggleDone } from "@/hooks/use-workouts";
import { api } from "@/lib/api";
import type { ApiResponse, PaginatedResponse, Workout } from "@/types";

jest.mock("@/lib/api", () => ({
  api: { post: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

function makeWorkout(overrides: Partial<Workout>): Workout {
  return {
    id: 1,
    title: "Test workout",
    timestamp: null,
    user_id: 1,
    username: "tester",
    user_image_file: null,
    is_template: false,
    is_done: false,
    exercises: [],
    ...overrides,
  } as Workout;
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

// Regression test for a real bug: useWorkouts (list) caches { data: Workout[] }
// while useWorkout(id) (single) caches { data: Workout } under the same
// "workouts" key prefix. The optimistic update must branch on the cached
// shape instead of assuming every "workouts"-prefixed entry is array-shaped.
describe("useToggleDone", () => {
  it("optimistically flips is_done in a list-shaped cache entry", async () => {
    const { queryClient, wrapper } = setup();
    const workout = makeWorkout({ id: 1, is_done: false });
    queryClient.setQueryData<PaginatedResponse<Workout>>(["workouts", 1, false], {
      data: [workout],
      meta: { page: 1, per_page: 10, total: 1, has_prev: false, has_next: false },
    });
    (api.post as jest.Mock).mockResolvedValue({ data: { ...workout, is_done: true } });

    const { result } = await renderHook(() => useToggleDone(), { wrapper });
    act(() => result.current.mutate(1));

    await waitFor(() => {
      const cached = queryClient.getQueryData<PaginatedResponse<Workout>>(["workouts", 1, false]);
      expect(cached?.data[0].is_done).toBe(true);
    });
  });

  it("optimistically flips is_done in a single-object cache entry without crashing", async () => {
    const { queryClient, wrapper } = setup();
    const workout = makeWorkout({ id: 5, is_done: false });
    queryClient.setQueryData<ApiResponse<Workout>>(["workouts", 5], { data: workout });
    (api.post as jest.Mock).mockResolvedValue({ data: { ...workout, is_done: true } });

    const { result } = await renderHook(() => useToggleDone(), { wrapper });
    act(() => result.current.mutate(5));

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApiResponse<Workout>>(["workouts", 5]);
      expect(cached?.data.is_done).toBe(true);
    });
  });

  it("updates both a list entry and an unrelated single-object entry sharing the 'workouts' prefix", async () => {
    const { queryClient, wrapper } = setup();
    const listWorkout = makeWorkout({ id: 1, is_done: false });
    const singleWorkout = makeWorkout({ id: 5, is_done: false });
    queryClient.setQueryData<PaginatedResponse<Workout>>(["workouts", 1, false], {
      data: [listWorkout],
      meta: { page: 1, per_page: 10, total: 1, has_prev: false, has_next: false },
    });
    queryClient.setQueryData<ApiResponse<Workout>>(["workouts", 5], { data: singleWorkout });
    (api.post as jest.Mock).mockResolvedValue({ data: { ...listWorkout, is_done: true } });

    const { result } = await renderHook(() => useToggleDone(), { wrapper });
    act(() => result.current.mutate(1));

    await waitFor(() => {
      const list = queryClient.getQueryData<PaginatedResponse<Workout>>(["workouts", 1, false]);
      expect(list?.data[0].is_done).toBe(true);
    });
    // The single-object entry for a different workout id must be left untouched.
    const single = queryClient.getQueryData<ApiResponse<Workout>>(["workouts", 5]);
    expect(single?.data.is_done).toBe(false);
  });

  it("rolls back the optimistic update when the mutation fails", async () => {
    const { queryClient, wrapper } = setup();
    const workout = makeWorkout({ id: 1, is_done: false });
    queryClient.setQueryData<PaginatedResponse<Workout>>(["workouts", 1, false], {
      data: [workout],
      meta: { page: 1, per_page: 10, total: 1, has_prev: false, has_next: false },
    });
    (api.post as jest.Mock).mockRejectedValue(new Error("network error"));

    const { result } = await renderHook(() => useToggleDone(), { wrapper });
    act(() => result.current.mutate(1));

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<PaginatedResponse<Workout>>(["workouts", 1, false]);
    expect(cached?.data[0].is_done).toBe(false);
  });
});
