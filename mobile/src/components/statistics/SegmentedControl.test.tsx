import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { SegmentedControl } from "@/components/statistics/SegmentedControl";

describe("SegmentedControl", () => {
  it("calls onChange with the pressed option's value", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <SegmentedControl
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        value="a"
        onChange={onChange}
        testID="seg"
      />
    );

    fireEvent.press(getByTestId("seg-b"));

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("still calls onChange when the already-active option is pressed", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <SegmentedControl
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
        value="a"
        onChange={onChange}
        testID="seg"
      />
    );

    fireEvent.press(getByTestId("seg-a"));

    expect(onChange).toHaveBeenCalledWith("a");
  });
});
