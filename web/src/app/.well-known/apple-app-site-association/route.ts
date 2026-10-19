import { NextResponse } from "next/server";

// Never cache this at build time: APPLE_APP_ID comes from the server environment.
export const dynamic = "force-dynamic";

/**
 * Apple App Site Association: tells iOS that the app may open the email
 * confirmation link (https://<domain>/auth/app-confirm?…) instead of Safari.
 * APPLE_APP_ID is "<TeamID>.<bundle identifier>" and is set on the server only.
 * iOS requires status 200, application/json and no redirects.
 */
export function GET() {
  const appId = process.env.APPLE_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }
  return NextResponse.json(
    {
      applinks: {
        details: [{ appIDs: [appId], components: [{ "/": "/auth/app-confirm" }] }],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
