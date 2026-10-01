import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Switch } from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { useForm, Controller } from "react-hook-form";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/i18n";
import { LEGAL_BASE_URL } from "@/lib/contact";

type RegisterForm = {
  email: string;
  password: string;
};

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterForm>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    if (!acceptedTerms) {
      setError(t("auth.termsRequired"));
      return;
    }
    const { error } = await supabase.auth.signUp({
      ...data,
      options: { data: { terms_accepted_at: new Date().toISOString() } },
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSubmittedEmail(data.email);
    setSubmitted(true);
  };

if (submitted) {
  return (
    <View className="flex-1 justify-center items-center px-6 bg-white dark:bg-gray-900">
      <Text className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">{t("auth.checkEmail")}</Text>
      <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
        {t("auth.confirmationSent", { email: submittedEmail ?? "" })}
      </Text>
      <Link href="/login" asChild>
        <Pressable>
          <Text className="text-center text-blue-600 dark:text-blue-400">{t("auth.backToLogin")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

  return (
    <View className="flex-1 justify-center px-6 bg-white dark:bg-gray-900">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t("auth.createAccount")}</Text>

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
        rules={{ required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } }}
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

      <View className="mb-4 flex-row items-center gap-3">
        <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} accessibilityLabel={t("auth.acceptTerms")} />
        <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
          {t("auth.acceptTerms")}{" "}
          <Text
            className="text-blue-600 dark:text-blue-400"
            onPress={() => openBrowserAsync(`${LEGAL_BASE_URL}/terms`)}
            accessibilityRole="link"
          >
            {t("legal.terms")}
          </Text>
        </Text>
      </View>

      {error && <Text className="text-red-500 dark:text-red-400 mb-4">{error}</Text>}

      <Pressable
        className="bg-blue-600 rounded-lg py-3 items-center"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">{t("auth.createAccount")}</Text>
        )}
      </Pressable>

      <Link href="/login" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-blue-600 dark:text-blue-400">
            {t("auth.haveAccount")} {t("auth.login")}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
