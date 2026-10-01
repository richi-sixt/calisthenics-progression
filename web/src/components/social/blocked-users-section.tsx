"use client";

import { useBlockedUsers, useUnblockUser } from "@/hooks/use-moderation";
import { useTranslation } from "@/i18n";

export default function BlockedUsersSection() {
  const { t } = useTranslation();
  const { data } = useBlockedUsers();
  const unblock = useUnblockUser();
  const users = data?.data ?? [];

  return (
    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("moderation.blockedUsers")}
      </h2>
      {users.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("moderation.noBlocked")}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-900 dark:text-gray-100">@{u.username}</span>
              <button
                type="button"
                onClick={() => unblock.mutate(u.username)}
                disabled={unblock.isPending}
                className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {t("moderation.unblock")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
