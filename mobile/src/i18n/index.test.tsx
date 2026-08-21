import { act } from "react";
import { renderHook } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LanguageProvider, useTranslation } from "@/i18n";

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

describe("useTranslation", () => {
  beforeEach(() => AsyncStorage.clear());


  it("defaults to English", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    expect(result.current.locale).toBe("en");
    expect(result.current.t("workouts.title")).toBe("My Workouts");
  });

  it("switches locale and translates accordingly", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    await act(async () => result.current.setLocale("de"));
    expect(result.current.locale).toBe("de");
    expect(result.current.t("workouts.title")).toBe("Meine Workouts");
  });

  it("interpolates {{params}} into the translated string", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("common.pageOf", { page: 2, total: 5 })).toBe("Page 2 of 5");

    await act(async () => result.current.setLocale("de"));
    expect(result.current.t("common.pageOf", { page: 2, total: 5 })).toBe("Seite 2 von 5");
  });

  it("falls back to the key itself for an unknown key", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    // @ts-expect-error deliberately passing an invalid key to test the fallback path
    expect(result.current.t("not.a.real.key")).toBe("not.a.real.key");
  });

  it("formats dates per locale", async () => {
    const { result } = await renderHook(() => useTranslation(), { wrapper });
    // Constructed from local-time components (not a UTC ISO string) so this
    // assertion doesn't depend on the test runner's timezone offset.
    const date = new Date(2026, 2, 5, 12, 0, 0);

    expect(result.current.formatDate(date, "short")).toBe("Mar 5, 2026");

    await act(async () => result.current.setLocale("de"));
    expect(result.current.formatDate(date, "short")).toBe("05.03.2026");
  });
});
