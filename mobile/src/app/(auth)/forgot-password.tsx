import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Link } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n";

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordForm>({ defaultValues: { email: "" } });

  const onSubmit = async ({ email }: ForgotPasswordForm) => {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("reset-password"),
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSubmittedEmail(email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-white dark:bg-gray-900">
        <Text className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">{t("auth.checkEmail")}</Text>
        <Text className="text-center text-gray-600 dark:text-gray-400">
          {t("auth.resetSent", { email: submittedEmail ?? "" })}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white dark:bg-gray-900">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t("auth.resetPassword")}</Text>
      <Text className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">{t("auth.resetDescription")}</Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: "Email is required" }}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-3"
              placeholder={t("auth.email")}
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {error && <Text className="text-red-500 dark:text-red-400 text-sm mt-1">{error.message}</Text>}
          </View>
        )}
      />

      {error && <Text className="text-red-500 dark:text-red-400 mb-4">{error}</Text>}

      <Pressable
        className="bg-blue-600 rounded-lg py-3 items-center"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">{t("auth.sendResetLink")}</Text>
        )}
      </Pressable>

      <Link href="/login" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-blue-600 dark:text-blue-400">{t("auth.backToLogin")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}
