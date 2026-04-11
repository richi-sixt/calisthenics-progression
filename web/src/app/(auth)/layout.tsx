import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Calisthenics Progression
          </h1>
        </Link>
        {children}
      </div>
    </div>
  );
}
