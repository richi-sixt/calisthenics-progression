import type { Metadata } from "next";
import { ContactEmail } from "@/components/legal/contact-email";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use – Calisthenics Progression",
};

export default function TermsPage() {
  return (
    <LegalPage title="Nutzungsbedingungen / Terms of Use">
      <p>Stand / Last updated: 01.10.2026</p>
      <p>
        Calisthenics Progression ist ein nicht-kommerzielles Privatprojekt. Mit
        der Registrierung akzeptierst du diese Bedingungen. / By creating an
        account you agree to these terms.
      </p>

      <h2>1. Deine Inhalte / Your content</h2>
      <p>
        Du bist für alles verantwortlich, was du in der App veröffentlichst
        (Profil, Workouts, Übungen, Bilder, Nachrichten). Du darfst nur Inhalte
        teilen, an denen du die nötigen Rechte hast. Du bestimmst mit den
        Sichtbarkeitseinstellungen, wer deine Inhalte sieht.
      </p>

      <h2>2. Verbotene Inhalte und Verhalten / Prohibited content</h2>
      <p>
        Es gilt eine Null-Toleranz-Regel für Inhalte und Verhalten, die:
      </p>
      <ul>
        <li>beleidigend, belästigend, bedrohend, diskriminierend oder hasserfüllt sind,</li>
        <li>sexuell explizit oder pornografisch sind oder Minderjährige gefährden,</li>
        <li>rechtswidrig sind oder zu Straftaten aufrufen,</li>
        <li>Spam, Werbung oder Betrug darstellen oder die Rechte Dritter verletzen,</li>
        <li>die App oder andere Nutzer stören (z. B. Angriffe, Missbrauch von Nachrichten).</li>
      </ul>

      <h2>3. Melden und Blockieren / Reporting and blocking</h2>
      <p>
        Du kannst Nutzer, Workouts, Übungen und Nachrichten über das Menü „⋯“
        melden und Nutzer blockieren. Blockierte Nutzer sehen deine Inhalte
        nicht und können dir weder folgen noch schreiben. Ich prüfe Meldungen
        innerhalb von 24 Stunden und entferne Inhalte, die gegen diese
        Bedingungen verstossen.
      </p>

      <h2>4. Massnahmen / Enforcement</h2>
      <p>
        Bei Verstössen kann ich Inhalte löschen und Konten ohne Vorwarnung
        sperren oder löschen.
      </p>

      <h2>5. Haftung / Liability</h2>
      <p>
        Die App wird ohne Gewähr bereitgestellt. Training erfolgt auf eigene
        Verantwortung; die App ersetzt keine ärztliche oder fachliche Beratung.
        Soweit gesetzlich zulässig, ist die Haftung ausgeschlossen. Das Projekt
        kann jederzeit geändert oder eingestellt werden.
      </p>

      <h2>6. Anwendbares Recht / Governing law</h2>
      <p>Es gilt Schweizer Recht. Zwingende Verbraucherrechte bleiben unberührt.</p>

      <h2>7. Kontakt / Contact</h2>
      <p>
        <ContactEmail />
      </p>
    </LegalPage>
  );
}
