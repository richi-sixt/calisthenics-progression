import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

function usePulse() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 800 }), withTiming(1, { duration: 800 })), -1, true);
  }, [opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function Skeleton({ className = "" }: { className?: string }) {
  const animatedStyle = usePulse();
  return (
    <Animated.View style={animatedStyle}>
      <View className={`rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
    </Animated.View>
  );
}

export function WorkoutCardSkeleton() {
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </View>
      <Skeleton className="mt-1 h-4 w-32" />
      <View className="mt-2 gap-1">
        <Skeleton className="h-3.5 w-full max-w-[240px]" />
        <Skeleton className="h-3.5 w-full max-w-[200px]" />
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </View>
    </View>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-40" />
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </View>
          <Skeleton className="h-3.5 w-full max-w-[260px]" />
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Skeleton className="h-7 w-14 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </View>
    </View>
  );
}

export function TemplateCardSkeleton() {
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <Skeleton className="h-5 w-40" />
      <View className="mt-2 gap-1">
        <Skeleton className="h-3.5 w-full max-w-[240px]" />
        <Skeleton className="h-3.5 w-full max-w-[200px]" />
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </View>
    </View>
  );
}

export function MessageCardSkeleton() {
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-28" />
      </View>
      <Skeleton className="mt-2 h-4 w-full max-w-[280px]" />
    </View>
  );
}

export function ExploreCardSkeleton() {
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-40" />
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </View>
          <View className="mt-1 gap-1">
            <Skeleton className="h-3.5 w-full max-w-[240px]" />
            <Skeleton className="h-3.5 w-full max-w-[200px]" />
          </View>
        </View>
      </View>
    </View>
  );
}

export function CategorySkeleton() {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
      <Skeleton className="h-4 w-28" />
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="flex-row items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
        </View>
      </View>
      <View className="mt-6 gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full max-w-[220px]" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </View>
    </View>
  );
}

export function CardListSkeleton({
  count = 3,
  Card,
}: {
  count?: number;
  Card: () => React.JSX.Element;
}) {
  return (
    <View className="mt-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </View>
  );
}
