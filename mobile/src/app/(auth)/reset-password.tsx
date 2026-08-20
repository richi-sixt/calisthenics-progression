import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type ResetPasswordForm = {
  password: string;
};

export default function ResetPasswordScreen() {
  const { clearPasswordRecovery } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetPasswordForm>({ defaultValues: { password: "" } });

  const onSubmit = async ({ password }: ResetPasswordForm) => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }
    clearPasswordRecovery(); // guard now lets Stack.Protected move on to (app)
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white dark:bg-gray-900">
      <Text className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Set a new password</Text>

      <Controller
        control={control}
        name="password"
        rules={{ required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } }}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-3"
              placeholder="New password"
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
          <Text className="text-white font-semibold">Update password</Text>
        )}
      </Pressable>
    </View>
  );
}
