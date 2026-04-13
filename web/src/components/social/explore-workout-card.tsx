"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { Workout } from "@/types";
import { useTranslation } from "@/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!.replace(/\/api\/v1$/, "");

function ProfilePic({ imageFile, username }: { imageFile: string | null; username: string }) {
  const src = imageFile
    ? `${API_BASE}/static/profile_pics/${imageFile}`
    : null;

  return src ? (
    <img src={src} alt={username} className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-sm font-bold text-gray-500 dark:text-gray-400">
      {username[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function ExploreWorkoutCard({ workout }: { workout: Workout }) {
  const { t } = useTranslation();
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          {workout.username && (
            <Link href={`/users/${workout.username}`} className="flex-shrink-0">
              <ProfilePic
                imageFile={workout.user_image_file}
                username={workout.username}
              />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{workout.title}</p>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              {workout.username && (
                <Link
                  href={`/users/${workout.username}`}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  @{workout.username}
                </Link>
              )}
              {workout.timestamp && (
                <time dateTime={workout.timestamp}>
                  {format(new Date(workout.timestamp), "MMM d, yyyy")}
                </time>
              )}
              <span>
                {exerciseCount} {exerciseCount === 1 ? t("explore.exercise") : t("explore.exercises")}
              </span>
            </div>
            {workout.exercises && workout.exercises.length > 0 && (
              <div className="mt-2 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                {workout.exercises.map((ex, i) => {
                  const sets = ex.sets ?? [];
                  const setDetails = sets.length > 0
                    ? sets.map((s) => {
                        if (s.reps != null) return `${s.reps ?? "None"} ${t("workouts.reps")}`;
                        if (s.duration != null) return s.duration_formatted || "00:00";
                        return ex.counting_type === "duration" ? "00:00" : `None ${t("workouts.reps")}`;
                      }).join(" , ")
                    : null;
                  return (
                    <p key={ex.id}>
                      <span className="text-gray-400 dark:text-gray-500">{i + 1}.</span>{" "}
                      <span className="font-medium">
                        {ex.exercise_definition_title ?? t("workouts.exercise")}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500"> — </span>
                      <span>
                        {sets.length} {sets.length === 1 ? t("workouts.set") : t("workouts.sets")}
                        {setDetails && (
                          <span className="text-gray-400 dark:text-gray-500"> ( {setDetails} )</span>
                        )}
                      </span>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {workout.is_done && (
          <span className="ml-4 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            {t("workouts.done")}
          </span>
        )}
      </div>
    </div>
  );
}
