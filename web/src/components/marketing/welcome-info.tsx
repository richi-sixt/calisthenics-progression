"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { CONTACT_EMAIL_USER, CONTACT_EMAIL_DOMAIN } from "@/lib/contact";

export default function WelcomeInfo() {
  const { t } = useTranslation();
  const [contactEmail, setContactEmail] = useState<{ href: string; text: string } | null>(null);

  useEffect(() => {
    const at = String.fromCharCode(64);
    setContactEmail({
      href: `mailto:${CONTACT_EMAIL_USER}${at}${CONTACT_EMAIL_DOMAIN}`,
      text: `${CONTACT_EMAIL_USER}${at}${CONTACT_EMAIL_DOMAIN}`,
    });
  }, []);

  return (
    <div className="w-full max-w-md space-y-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight dark:text-gray-100">
          {t("landing.title")}
        </h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          {t("landing.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {t("auth.login")}
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {t("auth.createAccount")}
        </Link>
      </div>

      <div className="space-y-4 text-left text-sm text-gray-600 dark:text-gray-400">
        <p>{t("landing.about1")}</p>
        <p>{t("landing.aboutInactivity")}</p>
        <p>{t("landing.about2")}</p>
        <hr className="border-gray-200 dark:border-gray-700" />
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {t("landing.featuresTitle")}
          </h4>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{t("landing.feature1")}</li>
            <li>{t("landing.feature2")}</li>
            <li>{t("landing.feature3")}</li>
            <li>{t("landing.feature4")}</li>
            <li>{t("landing.feature5")}</li>
          </ul>
        </div>
        <hr className="border-gray-200 dark:border-gray-700" />
        <p>
          {t("landing.contactPrompt")}{" "}
          {contactEmail ? (
            <a href={contactEmail.href} className="text-blue-600 dark:text-blue-400 hover:underline">
              {contactEmail.text}
            </a>
          ) : (
            <span className="text-gray-400">…</span>
          )}
        </p>
      </div>
    </div>
  );
}
