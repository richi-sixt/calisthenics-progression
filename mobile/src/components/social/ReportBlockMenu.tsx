import { useState } from "react";
import { View, Text, Pressable, Modal, TextInput, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
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
 * "…" button that lets the viewer report content and block its author.
 * Renders nothing for the viewer's own content.
 */
export function ReportBlockMenu({
  username,
  targetType,
  targetId,
  leaveOnBlock = false,
}: {
  username: string;
  targetType: ReportTargetType;
  targetId: number;
  /** Go back after blocking (the blocked user's profile / exercise page). */
  leaveOnBlock?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: profile } = useProfile();
  const blockUser = useBlockUser();
  const report = useReport();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);

  if (profile?.data?.username === username) return null;

  const closeReport = () => {
    setReportOpen(false);
    setSent(false);
    setDetails("");
    setReason("spam");
    report.reset();
  };

  const confirmBlock = () =>
    Alert.alert(t("moderation.blockTitle", { username }), t("moderation.blockMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("moderation.blockConfirm"),
        style: "destructive",
        onPress: () =>
          blockUser.mutate(username, {
            onSuccess: () => {
              if (leaveOnBlock && router.canGoBack()) router.back();
            },
          }),
      },
    ]);

  const openMenu = () =>
    Alert.alert(t("moderation.menu"), undefined, [
      { text: t(TARGET_LABEL[targetType]), onPress: () => setReportOpen(true) },
      { text: t("moderation.block"), style: "destructive", onPress: confirmBlock },
      { text: t("common.cancel"), style: "cancel" },
    ]);

  return (
    <>
      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t("moderation.menu")}
        hitSlop={8}
        testID="report-block-menu"
        className="rounded-md px-2 py-1"
      >
        <Text className="text-lg text-gray-400 dark:text-gray-500">⋯</Text>
      </Pressable>

      <Modal visible={reportOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeReport}>
        <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("moderation.reportTitle")}</Text>
          {sent ? (
            <>
              <Text className="mt-4 text-gray-600 dark:text-gray-400">{t("moderation.reported")}</Text>
              <Pressable onPress={closeReport} className="mt-6 items-center rounded-lg bg-blue-600 py-3">
                <Text className="font-semibold text-white">OK</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("moderation.reportIntro")}</Text>
              <Text className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t("moderation.reason")}</Text>
              <View className="mt-2 gap-2">
                {REPORT_REASONS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setReason(r)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: reason === r }}
                    className={`rounded-lg border px-4 py-3 ${
                      reason === r
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <Text className="text-gray-900 dark:text-gray-100">{t(`moderation.reason.${r}` as const)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">{t("moderation.details")}</Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                maxLength={500}
                multiline
                numberOfLines={3}
                className="mt-2 min-h-[80px] rounded-lg border border-gray-300 px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                textAlignVertical="top"
              />
              {report.isError && (
                <Text className="mt-2 text-sm text-red-600 dark:text-red-400">{t("moderation.reportError")}</Text>
              )}
              <View className="mt-6 flex-row gap-3">
                <Pressable onPress={closeReport} className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-600">
                  <Text className="font-medium text-gray-700 dark:text-gray-300">{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    report.mutate(
                      {
                        target_type: targetType,
                        target_id: targetId,
                        reason,
                        details: details.trim() || undefined,
                      },
                      { onSuccess: () => setSent(true) }
                    )
                  }
                  disabled={report.isPending}
                  className="flex-1 items-center rounded-lg bg-red-600 py-3 disabled:opacity-50"
                >
                  <Text className="font-semibold text-white">
                    {report.isPending ? t("moderation.sending") : t("moderation.submit")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}
