"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSendMessage } from "@/hooks/use-messages";
import SendMessageForm from "@/components/message/send-message-form";
import { useTranslation } from "@/i18n";

export default function NewMessagePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRecipient = searchParams.get("to") ?? undefined;
  const sendMessage = useSendMessage();

  return (
    <div>
      <Link href="/messages" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        &larr; {t("common.backTo", { page: t("nav.messages").toLowerCase() })}
      </Link>
      <h1 className="mt-4 text-2xl font-bold dark:text-gray-100">{t("messages.newTitle")}</h1>
      <div className="mt-6">
        <SendMessageForm
          defaultRecipient={defaultRecipient}
          isPending={sendMessage.isPending}
          onSubmit={(data) => {
            sendMessage.mutate(data, {
              onSuccess: () => router.push("/messages"),
            });
          }}
        />
      </div>
    </div>
  );
}
