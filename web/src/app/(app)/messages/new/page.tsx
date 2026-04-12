"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSendMessage } from "@/hooks/use-messages";
import SendMessageForm from "@/components/message/send-message-form";

export default function NewMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRecipient = searchParams.get("to") ?? undefined;
  const sendMessage = useSendMessage();

  return (
    <div>
      <Link href="/messages" className="text-sm text-gray-500 hover:text-gray-700">
        &larr; Back to messages
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New Message</h1>
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
