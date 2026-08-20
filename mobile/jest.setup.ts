import { notifyManager } from "@tanstack/react-query";

process.env.EXPO_PUBLIC_API_URL ??= "https://api.test.local/api/v1";

// TanStack Query batches observer notifications via setTimeout(fn, 0) by
// default. That macrotask fires after RTL's act()/waitFor() have already
// closed, producing "not wrapped in act(...)" warnings and a leaked timer.
// Making it synchronous is TanStack Query's own recommended test setup.
notifyManager.setScheduler((callback) => callback());

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en" }],
}));
