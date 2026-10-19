"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/i18n";

/** Shown after the confirmation link of a mobile registration was opened in a browser. */
function EmailConfirmedContent() {
  const { t } = useTranslation();
  const failed = useSearchParams().get("status") === "error";

  return (
    <div className="text-center" data-testid="email-confirmed">
      <h2 className="text-xl font-semibold dark:text-gray-100">
        {failed ? t("auth.confirmFailedTitle") : t("auth.emailConfirmedTitle")}
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {failed ? t("auth.confirmFailedMessage") : t("auth.emailConfirmedMessage")}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {!failed && (
          <a
            href="mobile://"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t("auth.openApp")}
          </a>
        )}
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t("auth.loginOnWeb")}
        </Link>
      </div>
    </div>
  );
}

export default function EmailConfirmedPage() {
  // useSearchParams needs a Suspense boundary on statically rendered pages.
  return (
    <Suspense fallback={null}>
      <EmailConfirmedContent />
    </Suspense>
  );
}
