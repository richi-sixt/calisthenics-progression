import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup"];

/**
 * Landing screen for the confirmation link of a mobile registration. The link
 * points to the web domain (https://…/auth/app-confirm?token_hash=…), iOS opens
 * it here as a universal link when the app is installed. Without the app the
 * same URL is served by the web (see web/src/app/(auth)/auth/app-confirm).
 */
export default function AppConfirmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token_hash, type } = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  // Whether the link itself is usable is known at render time; only the
  // result of the single-use verification arrives asynchronously.
  const otpType = (type ?? "email") as EmailOtpType;
  const invalidLink = !token_hash || !ALLOWED_TYPES.includes(otpType);
  const [verifyFailed, setVerifyFailed] = useState(false);
  const failed = invalidLink || verifyFailed;
  // The token is single-use: make sure it is verified exactly once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || invalidLink) return;
    started.current = true;

    supabase.auth.verifyOtp({ token_hash: token_hash!, type: otpType }).then(({ error }) => {
      if (error) {
        setVerifyFailed(true);
        return;
      }
      // The session now exists; the root layout switches to the signed-in area.
      router.replace("/");
    });
  }, [invalidLink, token_hash, otpType, router]);

  if (!failed) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-6" testID="app-confirm-loading">
        <ActivityIndicator />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">{t("auth.confirming")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-6">
      <Text className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-gray-100">
        {t("auth.confirmFailedTitle")}
      </Text>
      <Text className="mb-6 text-center text-gray-600 dark:text-gray-400" testID="app-confirm-error">
        {t("auth.confirmFailedMessage")}
      </Text>
      <Link href="/login" asChild>
        <Pressable testID="app-confirm-login">
          <Text className="text-center text-blue-600 dark:text-blue-400">{t("auth.backToLogin")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}
