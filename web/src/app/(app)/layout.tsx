import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/workouts" className="font-bold">
                Calisthenics
              </Link>
              <div className="hidden items-center gap-4 text-sm sm:flex">
                <Link
                  href="/workouts"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Workouts
                </Link>
                <Link
                  href="/templates"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Templates
                </Link>
                <Link
                  href="/exercises"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Exercises
                </Link>
                <Link
                  href="/explore"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Explore
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/messages"
                className="text-gray-600 hover:text-gray-900"
              >
                Messages
              </Link>
              <Link
                href="/profile"
                className="text-gray-600 hover:text-gray-900"
              >
                Profile
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/auth/logout" method="POST">
      <button
        type="submit"
        className="text-sm text-gray-600 hover:text-gray-900"
      >
        Logout
      </button>
    </form>
  );
}
