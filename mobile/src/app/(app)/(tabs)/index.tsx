import { useState } from "react";
import { View, Text, FlatList, Pressable, Switch, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { useWorkouts, useWorkoutsCalendar } from "@/hooks/use-workouts";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { CardListSkeleton, WorkoutCardSkeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n";
import type { Workout } from "@/types";

export default function WorkoutsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [hideDone, setHideDone] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const { data, isLoading, error, refetch, isRefetching } = useWorkouts(
    page,
    hideDone,
    selectedDate
  );
  const { data: calendarData } = useWorkoutsCalendar(format(calendarMonth, "yyyy-MM"));
  const markedDates = new Set(calendarData?.data ?? []);

  const workouts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      <View className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("workouts.title")}</Text>
          <Pressable
            onPress={() => router.push("/workouts/new")}
            className="rounded-md bg-blue-600 px-4 py-2"
          >
            <Text className="text-sm font-medium text-white">{t("workouts.new")}</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 pb-3">
          <Switch
            value={hideDone}
            onValueChange={(value) => {
              setHideDone(value);
              setPage(1);
            }}
          />
          <Text className="text-sm text-gray-600 dark:text-gray-400">{t("workouts.hideCompleted")}</Text>
        </View>

        {isLoading && <CardListSkeleton count={3} Card={WorkoutCardSkeleton} />}

        {error && (
          <View className="mt-6">
            <Text className="text-red-600 dark:text-red-400">{t("workouts.loadError")}</Text>
            <Text className="mt-1 text-sm text-red-400 dark:text-red-500">
              {error instanceof Error ? error.message : String(error)}
            </Text>
          </View>
        )}

        {!isLoading && !error && (
          <FlatList
            className="flex-1"
            data={workouts}
            keyExtractor={(item: Workout) => String(item.id)}
            renderItem={({ item }) => <WorkoutCard workout={item} />}
            ListHeaderComponent={
              <MonthCalendar
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setPage(1);
                }}
                markedDates={markedDates}
              />
            }
            ListHeaderComponentStyle={{ marginBottom: 12 }}
            ListEmptyComponent={
              <Text className="mt-6 text-gray-500 dark:text-gray-400">
                {t("workouts.empty")}
              </Text>
            }
            ItemSeparatorComponent={() => <View className="h-3" />}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          />
        )}

        {meta && (meta.has_prev || meta.has_next) && (
          <View className="flex-row items-center justify-between py-4">
            <Pressable
              onPress={() => setPage((p) => p - 1)}
              disabled={!meta.has_prev}
              className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2"
            >
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.previous")}</Text>
            </Pressable>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.pageOf", { page: meta.page, total: Math.ceil(meta.total / meta.per_page) })}
            </Text>
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              disabled={!meta.has_next}
              className="rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2"
            >
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.next")}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
