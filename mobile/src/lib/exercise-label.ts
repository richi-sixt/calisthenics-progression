import type { ExerciseDefinition } from "@/types";

/** "Title (username)" for exercises owned by someone else, plain title otherwise. */
export function exerciseLabel(def: ExerciseDefinition, myId: number | undefined): string {
  return myId !== undefined && def.user_id !== myId && def.username
    ? `${def.title} (${def.username})`
    : def.title;
}
