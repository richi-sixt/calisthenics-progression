import Link from "next/link";
import { BrandLogo } from "@/components/marketing/brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <BrandLogo>
            <h1 className="text-2xl font-bold tracking-tight dark:text-gray-100">
              Calisthenics Progression
            </h1>
          </BrandLogo>
        </Link>
        {children}
        <p className="mt-8 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/support" className="hover:underline">Support</Link>
        </p>
      </div>
    </div>
  );
}
