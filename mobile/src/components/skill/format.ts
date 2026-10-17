import type { SkillExercise } from "@/types";

/** "12s" for holds, "8×" for repetitions. */
export function formatSkillValue(countingType: SkillExercise["counting_type"], value: number): string {
  return countingType === "duration" ? `${value}s` : `${value}×`;
}
