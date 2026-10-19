import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup"];

function getOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  return forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;
}

/**
 * Confirmation link of a registration made in the mobile app. With the app
 * installed iOS opens the app for this URL (universal link) and this handler
 * is never reached. Without the app it confirms the email here and shows a
 * "confirmed" page instead of signing the user in on the web.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const origin = getOrigin(request);

  if (token_hash && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Confirming creates a session; the user signed up in the app, not here.
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(`${origin}/email-confirmed`);
    }
  }

  return NextResponse.redirect(`${origin}/email-confirmed?status=error`);
}
