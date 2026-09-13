import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WelcomeInfo from "@/components/marketing/welcome-info";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/workouts");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 dark:bg-gray-950">
      <WelcomeInfo />
    </div>
  );
}
