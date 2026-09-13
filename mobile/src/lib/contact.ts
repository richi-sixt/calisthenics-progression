// Username of the account that receives "Contact" messages sent via the
// in-app messaging system. Set EXPO_PUBLIC_CONTACT_USERNAME in the mobile
// build environment (eas.json) before going live.
export const CONTACT_USERNAME =
  process.env.EXPO_PUBLIC_CONTACT_USERNAME ?? "calisthenics-progression";

export const CONTACT_EMAIL = "calisthenics-progression@sixt.services";
