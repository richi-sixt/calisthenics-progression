import { Alert } from "react-native";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { ReportBlockMenu } from "@/components/social/ReportBlockMenu";
import { api } from "@/lib/api";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, push: jest.fn() }),
}));
jest.mock("@/lib/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const get = api.get as jest.Mock;
const post = api.post as jest.Mock;

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  get.mockResolvedValue({ data: { id: 1, username: "me" } });
  post.mockResolvedValue({ data: { id: 5, status: "open" } });
});

function menuActions(alertSpy: jest.SpyInstance) {
  return alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
}

describe("ReportBlockMenu", () => {
  it("renders nothing for the viewer's own content", async () => {
    const { queryByTestId } = await renderWithProviders(
      <ReportBlockMenu username="me" targetType="workout" targetId={3} />
    );
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(queryByTestId("report-block-menu")).toBeNull();
  });

  it("sends a report with the chosen reason", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId, getByText } = await renderWithProviders(
      <ReportBlockMenu username="other" targetType="workout" targetId={3} />
    );
    await fireEvent.press(getByTestId("report-block-menu"));
    await act(async () => menuActions(alertSpy).find((a) => a.text === "Report workout")!.onPress!());

    await fireEvent.press(getByText("Harassment or hate"));
    await fireEvent.press(getByText("Send report"));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/reports", {
        target_type: "workout",
        target_id: 3,
        reason: "harassment",
        details: undefined,
      })
    );
    await waitFor(() => getByText("Thank you. Your report was sent."));
  });

  it("blocks the author after confirmation", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByTestId } = await renderWithProviders(
      <ReportBlockMenu username="other" targetType="user" targetId={9} />
    );
    await fireEvent.press(getByTestId("report-block-menu"));
    await act(async () => menuActions(alertSpy).find((a) => a.text === "Block user")!.onPress!());

    const confirm = (alertSpy.mock.calls[1][2] as { text: string; onPress?: () => void }[]).find(
      (a) => a.text === "Block"
    )!;
    await act(async () => confirm.onPress!());

    await waitFor(() => expect(post).toHaveBeenCalledWith("/users/other/block"));
  });
});
