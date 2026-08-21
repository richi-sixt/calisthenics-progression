import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSendMessage } from "@/hooks/use-messages";
import { useTranslation } from "@/i18n";

type SendMessageFormData = {
  recipient: string;
  body: string;
};

export default function NewMessageScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { to } = useLocalSearchParams<{ to?: string }>();
  const sendMessage = useSendMessage();

  const { control, handleSubmit } = useForm<SendMessageFormData>({
    defaultValues: { recipient: to ?? "", body: "" },
  });

  const onSubmit = (data: SendMessageFormData) => {
    sendMessage.mutate(data, { onSuccess: () => router.back() });
  };

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900" contentContainerStyle={{ padding: 16 }}>
      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("messages.to")}</Text>
          <Controller
            control={control}
            name="recipient"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                placeholder={t("messages.usernamePlaceholder")}
                autoCapitalize="none"
                editable={!to}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("messages.message")}</Text>
          <Controller
            control={control}
            name="body"
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm"
                placeholder={t("messages.messagePlaceholder")}
                multiline
                numberOfLines={4}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>
        <Pressable onPress={handleSubmit(onSubmit)} disabled={sendMessage.isPending} className="items-center rounded-md bg-blue-600 py-3">
          {sendMessage.isPending ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{t("messages.sendMessage")}</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}
