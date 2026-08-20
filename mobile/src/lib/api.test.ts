import { api, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));

function mockSession(accessToken: string | null) {
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: accessToken ? { access_token: accessToken } : null },
  });
}

function mockFetchResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("sends the session's access token as a Bearer header", async () => {
    mockSession("token-123");
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse(200, { data: [] }));

    await api.get("/workouts");

    const [, init] = fetchSpy.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-123");
  });

  it("omits the Authorization header when there is no session", async () => {
    mockSession(null);
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse(200, { data: [] }));

    await api.get("/workouts");

    const [, init] = fetchSpy.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("appends query params to the URL", async () => {
    mockSession("token");
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse(200, { data: [] }));

    await api.get("/workouts", { page: "2", hide_done: "1" });

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.test.local/api/v1/workouts?page=2&hide_done=1");
  });

  it("JSON-encodes the body for post/put", async () => {
    mockSession("token");
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse(200, { data: {} }));

    await api.post("/workouts", { title: "Leg day" });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ title: "Leg day" }));
  });

  it("throws an ApiError with the server's error message on a non-ok response", async () => {
    mockSession("token");
    jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse(404, { error: "Workout not found" }));

    await expect(api.get("/workouts/999")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Workout not found",
    });
  });

  it("falls back to a generic message when the error response has no error field", async () => {
    mockSession("token");
    jest.spyOn(global, "fetch").mockResolvedValue(mockFetchResponse(500, {}));

    await expect(api.get("/workouts")).rejects.toThrow("Request failed with status 500");
  });

  it("re-exports ApiError as a proper Error subclass", () => {
    const err = new ApiError(400, "Bad request");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Bad request");
  });
});
