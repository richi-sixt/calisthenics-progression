import { fireEvent } from "@testing-library/react-native";
import { format, addMonths, subMonths } from "date-fns";
import { renderWithProviders } from "@/test-utils";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";

describe("MonthCalendar", () => {
  it("selects a day by tapping it", async () => {
    const onSelectDate = jest.fn();
    const month = new Date(2026, 8, 1); // September 2026
    const { getByTestId } = await renderWithProviders(
      <MonthCalendar
        month={month}
        onMonthChange={jest.fn()}
        selectedDate={null}
        onSelectDate={onSelectDate}
        markedDates={new Set()}
      />
    );

    await fireEvent.press(getByTestId("calendar-day-2026-09-15"));
    expect(onSelectDate).toHaveBeenCalledWith("2026-09-15");
  });

  it("deselects by tapping the already-selected day again", async () => {
    const onSelectDate = jest.fn();
    const month = new Date(2026, 8, 1);
    const { getByTestId } = await renderWithProviders(
      <MonthCalendar
        month={month}
        onMonthChange={jest.fn()}
        selectedDate="2026-09-15"
        onSelectDate={onSelectDate}
        markedDates={new Set()}
      />
    );

    await fireEvent.press(getByTestId("calendar-day-2026-09-15"));
    expect(onSelectDate).toHaveBeenCalledWith(null);
  });

  it("renders a marker on days present in markedDates", async () => {
    const month = new Date(2026, 8, 1);
    const { getByTestId, queryByTestId } = await renderWithProviders(
      <MonthCalendar
        month={month}
        onMonthChange={jest.fn()}
        selectedDate={null}
        onSelectDate={jest.fn()}
        markedDates={new Set(["2026-09-15"])}
      />
    );

    expect(getByTestId("calendar-day-2026-09-15-marker")).toBeTruthy();
    expect(queryByTestId("calendar-day-2026-09-16-marker")).toBeNull();
  });

  it("calls onMonthChange with the adjacent month when the nav buttons are pressed", async () => {
    const onMonthChange = jest.fn();
    const month = new Date(2026, 8, 1);
    const { getByTestId } = await renderWithProviders(
      <MonthCalendar
        month={month}
        onMonthChange={onMonthChange}
        selectedDate={null}
        onSelectDate={jest.fn()}
        markedDates={new Set()}
      />
    );

    await fireEvent.press(getByTestId("calendar-next-month"));
    expect(format(onMonthChange.mock.calls[0][0], "yyyy-MM")).toBe(
      format(addMonths(month, 1), "yyyy-MM")
    );

    await fireEvent.press(getByTestId("calendar-prev-month"));
    expect(format(onMonthChange.mock.calls[1][0], "yyyy-MM")).toBe(
      format(subMonths(month, 1), "yyyy-MM")
    );
  });

  it("clears the selection and resets to the current month via the Today button", async () => {
    const onMonthChange = jest.fn();
    const onSelectDate = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <MonthCalendar
        month={new Date(2026, 8, 1)}
        onMonthChange={onMonthChange}
        selectedDate="2026-09-15"
        onSelectDate={onSelectDate}
        markedDates={new Set()}
      />
    );

    await fireEvent.press(getByTestId("calendar-today"));
    expect(onSelectDate).toHaveBeenCalledWith(null);
    expect(onMonthChange).toHaveBeenCalled();
  });
});
