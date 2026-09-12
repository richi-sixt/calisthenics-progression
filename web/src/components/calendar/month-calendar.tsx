"use client";

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

export default function MonthCalendar({
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(month, 1))}
          aria-label={t("calendar.prevMonth")}
          className="rounded-md px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          &lsaquo;
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t("calendar.today")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label={t("calendar.nextMonth")}
          className="rounded-md px-2 py-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          &rsaquo;
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
        {weekdayLabels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const selected = selectedDate === iso;
          const marked = markedDates.has(iso);

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(selected ? null : iso)}
              className={`relative flex h-9 flex-col items-center justify-center rounded-md text-sm transition-colors ${
                selected
                  ? "bg-blue-600 text-white"
                  : inMonth
                    ? "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    : "text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              } ${isToday(day) && !selected ? "ring-1 ring-inset ring-blue-400" : ""}`}
              aria-label={formatDate(day, "long")}
              aria-pressed={selected}
            >
              {format(day, "d")}
              {marked && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    selected ? "bg-white" : "bg-blue-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {t("common.clear")}
        </button>
      )}
    </div>
  );
}
