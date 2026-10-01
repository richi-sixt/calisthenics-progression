"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  REPORT_REASONS,
  useBlockUser,
  useReport,
  type ReportReason,
  type ReportTargetType,
} from "@/hooks/use-moderation";
import { useProfile } from "@/hooks/use-profile";
import { useTranslation } from "@/i18n";

const TARGET_LABEL = {
  user: "moderation.reportUser",
  workout: "moderation.reportWorkout",
  exercise: "moderation.reportExercise",
  message: "moderation.reportMessage",
} as const;

/**
 * "…" menu to report content and block its author. Renders nothing for the
 * viewer's own content. `username` is the author; `targetId` is the id of the
 * reported user/workout/exercise/message.
 */
export default function ReportBlockMenu({
  username,
  targetType,
  targetId,
  leaveOnBlock = false,
}: {
  username: string;
  targetType: ReportTargetType;
  targetId: number;
  /** Navigate away after blocking (profile page of the blocked user). */
  leaveOnBlock?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();
  const blockUser = useBlockUser();
  const report = useReport();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  if (profile?.data?.username === username) return null;

  function closeReport() {
    setReportOpen(false);
    setSent(false);
    setDetails("");
    setReason("spam");
    report.reset();
  }

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton
          aria-label={t("moderation.menu")}
          className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <span aria-hidden="true">⋯</span>
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="z-40 mt-1 w-48 rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"
        >
          <MenuItem>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="block w-full px-3 py-2 text-left text-gray-700 data-focus:bg-gray-100 dark:text-gray-300 dark:data-focus:bg-gray-700"
            >
              {t(TARGET_LABEL[targetType])}
            </button>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={() => setBlockOpen(true)}
              className="block w-full px-3 py-2 text-left text-red-600 data-focus:bg-gray-100 dark:text-red-400 dark:data-focus:bg-gray-700"
            >
              {t("moderation.block")}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>

      <ConfirmDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onConfirm={() =>
          blockUser.mutate(username, {
            onSuccess: () => {
              if (leaveOnBlock) router.push("/explore");
            },
          })
        }
        title={t("moderation.blockTitle", { username })}
        message={t("moderation.blockMessage")}
        confirmLabel={t("moderation.blockConfirm")}
        variant="danger"
      />

      <Dialog open={reportOpen} onClose={closeReport} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50 dark:bg-black/60" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("moderation.reportTitle")}
            </DialogTitle>
            {sent ? (
              <>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {t("moderation.reported")}
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={closeReport}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  report.mutate(
                    {
                      target_type: targetType,
                      target_id: targetId,
                      reason,
                      details: details.trim() || undefined,
                    },
                    { onSuccess: () => setSent(true) }
                  );
                }}
              >
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t("moderation.reportIntro")}
                </p>
                <label
                  htmlFor="report-reason"
                  className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("moderation.reason")}
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`moderation.reason.${r}` as const)}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="report-details"
                  className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("moderation.details")}
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                {report.isError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {t("moderation.reportError")}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeReport}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={report.isPending}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {report.isPending
                      ? t("moderation.sending")
                      : t("moderation.submit")}
                  </button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
