import { View, Text, Pressable } from "react-native";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { useTranslation } from "@/i18n";

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  markedDates,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  markedDates: Set<string>;
}) {
  const { t, locale, formatDate } = useTranslation();
  const weekStartsOn = locale === "de" ? 1 : 0;

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekdayLabels = eachDayOfInterval({
    start: gridStart,
    end: endOfWeek(gridStart, { weekStartsOn }),
  }).map((d) => format(d, "EEEEEE"));

  const goToday = () => {
    onMonthChange(new Date());
    onSelectDate(null);
  };

  return (
    <View
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
      testID="month-calendar"
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => onMonthChange(subMonths(month, 1))}
          accessibilityLabel={t("calendar.prevMonth")}
          testID="calendar-prev-month"
          className="rounded-md px-2 py-1"
        >
          <Text className="text-sm text-gray-500 dark:text-gray-400">‹</Text>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {format(month, "MMMM yyyy")}
          </Text>
          <Pressable
            onPress={goToday}
            testID="calendar-today"
            className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5"
          >
            <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {t("calendar.today")}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, 1))}
          accessibilityLabel={t("calendar.nextMonth")}
          testID="calendar-next-month"
          className="rounded-md px-2 py-1"
        >
          <Text className="text-sm text-gray-500 dark:text-gray-400">›</Text>
        </Pressable>
      </View>

      <View className="mt-2 flex-row">
        {weekdayLabels.map((label, i) => (
          <Text
            key={i}
            className="flex-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500"
          >
            {label}
          </Text>
        ))}
      </View>

      <View className="mt-1 flex-row flex-wrap">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const selected = selectedDate === iso;
          const marked = markedDates.has(iso);

          return (
            <Pressable
              key={iso}
              onPress={() => onSelectDate(selected ? null : iso)}
              testID={`calendar-day-${iso}`}
              accessibilityLabel={formatDate(day, "long")}
              accessibilityState={{ selected }}
              style={{ width: `${100 / 7}%` }}
              className="items-center justify-center py-1"
            >
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  selected
                    ? "bg-blue-600"
                    : isToday(day)
                      ? "border border-blue-400"
                      : ""
                }`}
              >
                <Text
                  className={
                    selected
                      ? "text-sm text-white"
                      : inMonth
                        ? "text-sm text-gray-900 dark:text-gray-100"
                        : "text-sm text-gray-300 dark:text-gray-600"
                  }
                >
                  {format(day, "d")}
                </Text>
              </View>
              {marked && (
                <View
                  testID={`calendar-day-${iso}-marker`}
                  className={`mt-0.5 h-1 w-1 rounded-full ${
                    selected ? "bg-blue-600" : "bg-blue-500"
                  }`}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
