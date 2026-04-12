"use client";

import { useForm } from "react-hook-form";

interface SendMessageFormData {
  recipient: string;
  body: string;
}

export default function SendMessageForm({
  defaultRecipient,
  onSubmit,
  isPending,
}: {
  defaultRecipient?: string;
  onSubmit: (data: SendMessageFormData) => void;
  isPending: boolean;
}) {
  const { register, handleSubmit, reset } = useForm<SendMessageFormData>({
    defaultValues: {
      recipient: defaultRecipient ?? "",
      body: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => {
        onSubmit(data);
        reset({ recipient: data.recipient, body: "" });
      })}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">To</label>
        <input
          {...register("recipient", { required: true })}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Username"
          readOnly={!!defaultRecipient}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Message</label>
        <textarea
          {...register("body", { required: true })}
          rows={4}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Write your message..."
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
