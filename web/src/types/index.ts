// ---- Model types (matching Flask to_dict() responses) ----

export interface User {
  id: number;
  username: string;
  email: string;
  about_me: string | null;
  image_file: string;
  confirmed: boolean;
  last_seen: string | null;
  registered_on: string | null;
  follower_count: number;
  following_count: number;
}

export interface UserWithFollowing extends User {
  is_following: boolean;
}

export interface Workout {
  id: number;
  title: string;
  timestamp: string | null;
  user_id: number;
  username: string | null;
  user_image_file: string | null;
  is_template: boolean;
  is_done: boolean;
  exercises?: Exercise[];
}

export interface Exercise {
  id: number;
  exercise_order: number;
  workout_id: number;
  exercise_definition_id: number | null;
  exercise_definition_title: string | null;
  counting_type: "reps" | "duration";
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: number;
  set_order: number;
  progression: string | null;
  reps: number | null;
  duration: number | null;
  duration_formatted: string;
}

export interface ExerciseDefinition {
  id: number;
  title: string;
  description: string | null;
  counting_type: "reps" | "duration";
  date_created: string | null;
  user_id: number;
  username: string | null;
  user_image_file: string | null;
  archived: boolean;
  progression_levels: ProgressionLevel[];
  category_ids: number[];
}

export interface ProgressionLevel {
  id: number;
  name: string;
  level_order: number;
}

export interface ExerciseCategory {
  id: number;
  name: string;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_username: string | null;
  recipient_id: number;
  body: string | null;
  timestamp: string | null;
}

export interface Notification {
  id: number;
  name: string;
  timestamp: number;
  data: Record<string, unknown> | null;
}

// ---- API envelope types ----

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  error: string;
}

// ---- Composite response types ----

export interface UserProfileResponse {
  user: UserWithFollowing;
  workouts: Workout[];
}
