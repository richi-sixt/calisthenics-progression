"use client";

import { useMounted } from "@/hooks/use-mounted";
import { CONTACT_EMAIL_USER, CONTACT_EMAIL_DOMAIN } from "@/lib/contact";

/**
 * Contact address as a mailto link, assembled only in the browser so it never
 * appears in the server-rendered HTML (same approach as the landing page).
 */
export function ContactEmail() {
  const mounted = useMounted();
  if (!mounted) return <span className="text-gray-400">…</span>;

  const address = `${CONTACT_EMAIL_USER}${String.fromCharCode(64)}${CONTACT_EMAIL_DOMAIN}`;
  return <a href={`mailto:${address}`}>{address}</a>;
}
