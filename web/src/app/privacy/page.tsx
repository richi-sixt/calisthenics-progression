import type { Metadata } from "next";
import { ContactEmail } from "@/components/legal/contact-email";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy – Calisthenics Progression",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Datenschutzerklärung / Privacy Policy">
      <p>Stand / Last updated: 30.09.2026</p>
      <p>
        Calisthenics Progression ist ein nicht-kommerzielles Privatprojekt.
        Diese Erklärung informiert nach Art. 19 des Schweizer
        Datenschutzgesetzes (DSG) über die Bearbeitung von Personendaten.
        Für Nutzerinnen und Nutzer in der EU/im EWR gilt zusätzlich Abschnitt 9.
      </p>

      <h2>1. Verantwortlicher / Controller</h2>
      <p>
        Rüchan Sixt, Schweiz · Kontakt:{" "}
        <ContactEmail />
      </p>

      <h2>2. Welche Daten ich bearbeite / Data I process</h2>
      <ul>
        <li>Account: E-Mail-Adresse, Benutzername, Passwort (nur als Hash beim Authentifizierungsdienst).</li>
        <li>Profil: optionales Profilbild, &quot;Über mich&quot;-Text, Sichtbarkeitseinstellungen.</li>
        <li>Trainingsdaten: Workouts, Übungen, Sätze/Wiederholungen/Dauer, Vorlagen, Kategorien, Übungsbilder, Notizen.</li>
        <li>Soziale Funktionen: Follower-Beziehungen, Direktnachrichten, Benachrichtigungen.</li>
        <li>Technische Daten: Server-Logs (IP-Adresse, Zeitpunkt, aufgerufene Adresse) zur Sicherheit und Fehlersuche.</li>
      </ul>
      <p>
        I do not use advertising, tracking or analytics tools, and I do not
        sell your data or share it for advertising.
      </p>

      <h2>3. Zweck und Grundsätze / Purpose and principles</h2>
      <p>
        Ich bearbeite deine Daten nur, um die App und ihre Funktionen
        bereitzustellen (Konto, Training erfassen, Statistiken, Austausch mit
        anderen Nutzern) sowie für Sicherheit, Missbrauchsschutz und
        Fehlerbehebung. Die Bearbeitung erfolgt nach den Grundsätzen von Art. 6
        DSG (Rechtmässigkeit, Treu und Glauben, Verhältnismässigkeit,
        Zweckbindung, Transparenz). Ich bearbeite nur Daten, die dafür
        erforderlich sind, und bewahre sie nicht länger auf als nötig.
      </p>

      <h2>4. Hosting, Empfänger und Auslandbekanntgabe / Hosting and recipients</h2>
      <p>
        Die App läuft auf einem Server bei Hetzner Online GmbH (Rechenzentrum in
        Deutschland). Die Anmeldung wird über Supabase abgewickelt; die Daten
        liegen in Irland (Region West EU). Supabase ist ein US-Unternehmen
        (Supabase Inc.), ein Zugriff aus den USA kann daher nicht vollständig
        ausgeschlossen werden. Mit Supabase besteht eine
        Auftragsverarbeitungsvereinbarung mit Standardvertragsklauseln.
        E-Mails (z. B. zum Zurücksetzen des Passworts) werden über Proton AG
        (Schweiz) versendet. Diese Dienstleister bearbeiten Daten nur in
        meinem Auftrag. Die Datenbekanntgabe in die EU ist zulässig, weil die
        EU nach Einschätzung des Bundesrates einen angemessenen Datenschutz
        bietet (Art. 16 Abs. 1 DSG). Eine Weitergabe zu Werbezwecken findet
        nicht statt.
      </p>

      <h2>5. Sichtbarkeit / Visibility</h2>
      <p>
        Profile, Workouts und Übungen sind für andere Nutzer nur so sichtbar,
        wie du es einstellst (öffentlich, nur Follower oder privat).
        Direktnachrichten sind nur für Absender und Empfänger sichtbar.
      </p>

      <h2>6. Speicherdauer und Löschung / Retention and deletion</h2>
      <p>
        Ich speichere deine Daten, solange dein Konto besteht. Du kannst dein
        Konto jederzeit in der App oder im Web unter Profil → Konto löschen
        selbst löschen. Dabei werden Konto, Trainingsdaten, Nachrichten und
        hochgeladene Bilder dauerhaft entfernt. Server-Logs werden nach
        14 Tagen automatisch gelöscht.
      </p>

      <h2>7. Datensicherheit / Security</h2>
      <p>
        Die Übertragung erfolgt verschlüsselt (HTTPS). Ich treffe angemessene
        technische und organisatorische Massnahmen (Art. 8 DSG), kann aber
        keine absolute Sicherheit garantieren.
      </p>

      <h2>8. Deine Rechte / Your rights</h2>
      <p>
        Du hast nach dem DSG das Recht auf Auskunft (Art. 25), Herausgabe oder
        Übertragung deiner Daten (Art. 28), Berichtigung (Art. 32) sowie
        Löschung und Widerspruch (Art. 32). Schreib mir dazu an{" "}
        <ContactEmail />. Du kannst dich ausserdem an
        den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)
        wenden. Kinder unter 13 Jahren sollen die App nicht ohne Zustimmung der
        Eltern nutzen.
      </p>

      <h2>9. Nutzer in der EU/im EWR / Users in the EU/EEA</h2>
      <p>
        Da die App auch in der EU/im EWR angeboten wird, gilt für Nutzer dort
        zusätzlich die DSGVO. Ich bearbeite ihre Daten auf folgenden
        Rechtsgrundlagen: Vertragserfüllung bzw. Bereitstellung der App (Art. 6
        Abs. 1 lit. b DSGVO) sowie berechtigtes Interesse an Sicherheit und
        Missbrauchsschutz (Art. 6 Abs. 1 lit. f DSGVO). Zusätzlich zu den
        oben genannten Rechten bestehen das Recht auf Einschränkung der
        Bearbeitung und auf Widerspruch (Art. 15–21 DSGVO) sowie auf Beschwerde
        bei der Aufsichtsbehörde deines Aufenthaltsstaates. Die Schweiz gilt
        nach einem Angemessenheitsbeschluss der EU-Kommission als Land mit
        angemessenem Datenschutzniveau.
      </p>
      <p>
        If you are in the EU/EEA, the GDPR applies to you in addition. My legal
        bases are performance of the service (Art. 6(1)(b) GDPR) and my
        legitimate interest in security and abuse prevention (Art. 6(1)(f)
        GDPR). You may also request restriction of processing, object to
        processing, and lodge a complaint with your local supervisory authority.
      </p>

      <h2>10. Änderungen / Changes</h2>
      <p>
        Ich passe diese Erklärung an, wenn sich die App ändert; das Datum oben
        zeigt den aktuellen Stand.
      </p>
    </LegalPage>
  );
}
