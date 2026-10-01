import Link from "next/link";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Calisthenics Progression
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700 dark:text-gray-300 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 dark:[&_h2]:text-gray-100 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 dark:[&_a]:text-blue-400">
        {children}
      </div>
    </main>
  );
}
