// Username of the account that receives "Contact" messages sent via the
// in-app messaging system. Set NEXT_PUBLIC_CONTACT_USERNAME in the web
// deployment's environment before going live.
export const CONTACT_USERNAME =
  process.env.NEXT_PUBLIC_CONTACT_USERNAME ?? "calisthenics-progression";

// Split so the address never appears as a single literal string in the
// bundled JS, which keeps it out of naive scraper regexes.
export const CONTACT_EMAIL_USER = "calisthenics-progression";
export const CONTACT_EMAIL_DOMAIN = "sixt.services";
