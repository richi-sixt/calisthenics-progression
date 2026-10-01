import type { Metadata } from "next";
import { ContactEmail } from "@/components/legal/contact-email";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Support – Calisthenics Progression",
};

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <p>
        Fragen, Fehler oder Feedback? Schreib mir per E-Mail:{" "}
        <ContactEmail />. / Questions, bugs or feedback?
        Email me at <ContactEmail />.
      </p>

      <h2>FAQ</h2>
      <p>
        <strong>Passwort vergessen? / Forgot your password?</strong> Use
        &quot;Forgot password&quot; on the login screen; you will receive a reset
        link by email.
      </p>
      <p>
        <strong>Konto löschen / Delete my account:</strong> Profile → Delete
        account (app and web). This permanently removes your account, workouts,
        exercises, messages and uploaded images.
      </p>
      <p>
        <strong>Inhalte melden / Report content or users:</strong> Email me with
        the username and a short description. I review reports and remove
        content that violates the rules within 48 hours.
      </p>
      <p>
        <a href="/privacy">Datenschutz / Privacy Policy</a>
      </p>
    </LegalPage>
  );
}
