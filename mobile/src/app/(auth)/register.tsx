import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase/client";

type RegisterForm = {
  email: string;
  password: string;
};

export default function RegisterScreen() {
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterForm>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    const { error } = await supabase.auth.signUp(data);
    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  };

if (submitted) {
  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-xl font-bold text-center mb-2">Check your email</Text>
      <Text className="text-center text-gray-600 mb-6">
        We sent a confirmation link — tap it to activate your account.
      </Text>
      <Link href="/login" asChild>
        <Pressable>
          <Text className="text-center text-blue-600">Back to login</Text>
        </Pressable>
      </Link>
    </View>
  );
}

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-2xl font-bold mb-6">Create account</Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: "Email is required" }}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {error && <Text className="text-red-500 text-sm mt-1">{error.message}</Text>}
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
              className="border border-gray-300 rounded-lg px-4 py-3"
              placeholder="Password"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {error && <Text className="text-red-500 text-sm mt-1">{error.message}</Text>}
          </View>
        )}
      />

      {error && <Text className="text-red-500 mb-4">{error}</Text>}

      <Pressable
        className="bg-blue-600 rounded-lg py-3 items-center"
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">Create account</Text>
        )}
      </Pressable>

      <Link href="/login" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-blue-600">Already have an account? Log in</Text>
        </Pressable>
      </Link>
    </View>
  );
}
