import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/workouts");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 dark:bg-gray-950">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight dark:text-gray-100">
            Calisthenics Progression
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            Track your workouts, manage exercises, and progress your skills.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
