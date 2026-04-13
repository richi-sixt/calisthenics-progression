
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export function WorkoutCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <div className="mt-2 space-y-1">
            <Skeleton className="h-3.5 w-full max-w-xs" />
            <Skeleton className="h-3.5 w-full max-w-[280px]" />
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-56" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-18 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="mt-2 space-y-1">
            <Skeleton className="h-3.5 w-full max-w-xs" />
            <Skeleton className="h-3.5 w-full max-w-[280px]" />
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function MessageCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="mt-2 h-4 w-full max-w-lg" />
    </div>
  );
}

export function ExploreCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="mt-2 space-y-1">
            <Skeleton className="h-3.5 w-full max-w-xs" />
            <Skeleton className="h-3.5 w-full max-w-[280px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-18 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
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
    <div className="mt-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
