import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import LibraryScreen from "@/app/(app)/(tabs)/library";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe("LibraryScreen", () => {
  beforeEach(() => mockPush.mockClear());

  it("opens the app library exercises", async () => {
    const { getByTestId } = await renderWithProviders(<LibraryScreen />);
    await fireEvent.press(getByTestId("library-catalog-exercises"));
    expect(mockPush).toHaveBeenCalledWith("/catalog");
  });

  it("opens the app library directly on the skills tab", async () => {
    const { getByTestId } = await renderWithProviders(<LibraryScreen />);
    await fireEvent.press(getByTestId("library-catalog-skills"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/catalog", params: { tab: "skills" } });
  });
});
