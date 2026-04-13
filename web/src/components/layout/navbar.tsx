"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverButton,
  PopoverBackdrop,
  PopoverPanel,
} from "@headlessui/react";
import { useTranslation } from "@/i18n";
import { useUnreadMessageCount } from "@/hooks/use-notifications";

function CloseIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="m17.25 6.75-10.5 10.5M6.75 6.75l10.5 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 12.25A4.25 4.25 0 0 1 12.25 8v0a4.25 4.25 0 0 1 4.25 4.25v0a4.25 4.25 0 0 1-4.25 4.25v0A4.25 4.25 0 0 1 8 12.25v0Z" />
      <path
        d="M12.25 3v1.5M21.5 12.25H20M18.791 18.791l-1.06-1.06M18.791 5.709l-1.06 1.06M12.25 20v1.5M4.5 12.25H3M6.77 6.77 5.709 5.709M6.77 17.73l-1.061 1.061"
        fill="none"
      />
    </svg>
  );
}

function MoonIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M17.25 16.22a6.937 6.937 0 0 1-9.47-9.47 7.451 7.451 0 1 0 9.47 9.47ZM12.75 7C17 7 17 2.75 17 2.75S17 7 21.25 7C17 7 17 11.25 17 11.25S17 7 12.75 7Z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 8 6" aria-hidden="true" {...props}>
      <path
        d="M1.75 1.75 4 4.25l2.25-2.5"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useNavItems() {
  const { t } = useTranslation();
  return [
    { href: "/workouts", label: t("nav.workouts") },
    { href: "/templates", label: t("nav.templates") },
    { href: "/exercises", label: t("nav.exercises") },
    { href: "/categories", label: t("nav.categories") },
    { href: "/explore", label: t("nav.explore") },
  ];
}

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
      className={
        active
          ? "font-medium text-gray-900 dark:text-white"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      }
    >
      {children}
    </Link>
  );
}

function MobileNavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <PopoverButton as={Link} href={href} className="block py-2">
        {children}
      </PopoverButton>
    </li>
  );
}

function MobileNavigation() {
  const { t } = useTranslation();
  const navItems = useNavItems();
  const unreadCount = useUnreadMessageCount();

  return (
    <Popover className="md:hidden">
      <PopoverButton className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
        <MenuIcon className="h-5 w-5" />
        {t("nav.menu")}
        <ChevronDownIcon className="h-auto w-2 stroke-gray-500 dark:stroke-gray-400" />
      </PopoverButton>
      <PopoverBackdrop
        transition
        className="fixed inset-0 z-50 bg-gray-800/40 backdrop-blur-xs duration-150 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in dark:bg-black/60"
      />
      <PopoverPanel
        focus
        transition
        className="fixed inset-x-4 top-8 z-50 origin-top rounded-2xl bg-white p-6 ring-1 ring-gray-900/5 duration-150 data-closed:scale-95 data-closed:opacity-0 data-enter:ease-out data-leave:ease-in dark:bg-gray-800 dark:ring-white/10"
      >
        <div className="flex flex-row-reverse items-center justify-between">
          <PopoverButton aria-label="Close menu" className="-m-1 p-1">
            <CloseIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </PopoverButton>
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t("nav.navigation")}
          </h2>
        </div>
        <nav className="mt-4">
          <ul className="-my-2 divide-y divide-gray-100 text-base text-gray-800 dark:divide-gray-700 dark:text-gray-200">
            {navItems.map((item) => (
              <MobileNavItem key={item.href} href={item.href}>
                {item.label}
              </MobileNavItem>
            ))}
            <MobileNavItem href="/messages">
              {t("nav.messages")}
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </MobileNavItem>
            <MobileNavItem href="/profile">{t("nav.profile")}</MobileNavItem>
          </ul>
        </nav>
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {t("nav.logout")}
            </button>
          </form>
        </div>
      </PopoverPanel>
    </Popover>
  );
}

function DesktopNavigation() {
  const navItems = useNavItems();

  return (
    <div className="hidden items-center gap-4 text-sm md:flex">
      {navItems.map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const otherTheme = resolvedTheme === "dark" ? "light" : "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      aria-label={
        mounted
          ? resolvedTheme === "dark"
            ? t("header.switchToLight")
            : t("header.switchToDark")
          : t("header.toggleTheme")
      }
      className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      onClick={() => setTheme(otherTheme)}
    >
      <SunIcon className="h-5 w-5 fill-gray-100 stroke-gray-500 dark:hidden" />
      <MoonIcon className="hidden h-5 w-5 fill-gray-700 stroke-gray-500 dark:block" />
    </button>
  );
}

function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      aria-label={
        mounted
          ? locale === "en"
            ? t("header.switchToGerman")
            : t("header.switchToEnglish")
          : t("header.toggleLanguage")
      }
      className="rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      onClick={() => setLocale(locale === "en" ? "de" : "en")}
    >
      {mounted ? (locale === "en" ? "DE" : "EN") : "DE"}
    </button>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const unreadCount = useUnreadMessageCount();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/workouts"
              className="font-bold text-gray-900 dark:text-white"
            >
              {t("nav.appName")}
            </Link>
            <DesktopNavigation />
          </div>
          <div className="flex items-center gap-2">
            <MobileNavigation />

            <div className="hidden items-center gap-2 text-sm md:flex">
              <NavLink href="/messages">
                {t("nav.messages")}
                {unreadCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
              <NavLink href="/profile">{t("nav.profile")}</NavLink>
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("nav.logout")}
                </button>
              </form>
            </div>

            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
