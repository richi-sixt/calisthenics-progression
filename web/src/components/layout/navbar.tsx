"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadMessageCount } from "@/hooks/use-notifications";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={active ? "font-medium text-gray-900" : "text-gray-600 hover:text-gray-900"}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const unreadCount = useUnreadMessageCount();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/workouts" className="font-bold">
              Calisthenics Progression
            </Link>
            <div className="hidden items-center gap-4 text-sm sm:flex">
              <NavLink href="/workouts">Workouts</NavLink>
              <NavLink href="/templates">Templates</NavLink>
              <NavLink href="/exercises">Exercises</NavLink>
              <NavLink href="/categories">Categories</NavLink>
              <NavLink href="/explore">Explore</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <NavLink href="/messages">
              Messages
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink href="/profile">Profile</NavLink>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
