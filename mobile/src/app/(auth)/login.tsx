import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Linking } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n";
import { CONTACT_EMAIL } from "@/lib/contact";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) setError(error.message);
    // No manual navigation here — signing in fires onAuthStateChange in
    // AuthProvider, session updates, and Stack.Protected swaps to (app)
    // on its own.
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-900"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 }}
    >
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t("auth.login")}</Text>

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

      <Controller
        control={control}
        name="password"
        rules={{ required: "Password is required" }}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-3"
              placeholder={t("auth.password")}
              secureTextEntry
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
          <Text className="text-white font-semibold">{t("auth.login")}</Text>
        )}
      </Pressable>

      <Link href="/register" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-blue-600 dark:text-blue-400">
            {t("auth.noAccount")} {t("auth.register")}
          </Text>
        </Pressable>
      </Link>
      <Link href="/forgot-password" asChild>
        <Pressable className="mt-2">
          <Text className="text-center text-blue-600 dark:text-blue-400">{t("auth.forgotPassword")}</Text>
        </Pressable>
      </Link>

      <View className="mt-8 gap-3">
        <Text className="text-sm text-gray-600 dark:text-gray-400">{t("landing.about1")}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">{t("landing.aboutInactivity")}</Text>
        <View className="h-px bg-gray-200 dark:bg-gray-700" />
        <View>
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{t("landing.featuresTitle")}</Text>
          <View className="mt-2 gap-1">
            <Text className="text-sm text-gray-600 dark:text-gray-400">• {t("landing.feature1")}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">• {t("landing.feature2")}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">• {t("landing.feature3")}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">• {t("landing.feature4")}</Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">• {t("landing.feature5")}</Text>
          </View>
        </View>
        <View className="h-px bg-gray-200 dark:bg-gray-700" />
        <Pressable onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {t("landing.contactPrompt")}{" "}
            <Text className="text-blue-600 dark:text-blue-400">{CONTACT_EMAIL}</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
