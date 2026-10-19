import { waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import AppConfirmScreen from "@/app/auth/app-confirm";
import { supabase } from "@/lib/supabase/client";

const mockReplace = jest.fn();
let mockParams: { token_hash?: string; type?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { verifyOtp: jest.fn() } },
}));

const verifyOtp = supabase.auth.verifyOtp as jest.Mock;

describe("AppConfirmScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    verifyOtp.mockReset();
    mockParams = { token_hash: "abc123", type: "email" };
  });

  it("verifies the token and opens the signed-in area", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    await renderWithProviders(<AppConfirmScreen />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "email" });
  });

  it("shows an error with a login link when verification fails", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("expired") });
    const { findByTestId } = await renderWithProviders(<AppConfirmScreen />);
    expect(await findByTestId("app-confirm-error")).toBeTruthy();
    expect(await findByTestId("app-confirm-login")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("rejects a link without a token without calling Supabase", async () => {
    mockParams = {};
    const { findByTestId } = await renderWithProviders(<AppConfirmScreen />);
    expect(await findByTestId("app-confirm-error")).toBeTruthy();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("rejects token types that are not email confirmations", async () => {
    mockParams = { token_hash: "abc123", type: "recovery" };
    const { findByTestId } = await renderWithProviders(<AppConfirmScreen />);
    expect(await findByTestId("app-confirm-error")).toBeTruthy();
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
