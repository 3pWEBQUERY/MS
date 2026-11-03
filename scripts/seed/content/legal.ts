/** Rechtstexte S50 (Entwürfe, Fachprüfung Recht D01 ausstehend). Teil des Startbestands (CON08), siehe scripts/seed/content/run.ts. */
import { COMMUNITY_RULES_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "../../../src/lib/catalog";

const DRAFT_NOTE =
  "Entwurf – rechtliche Prüfung D01 ausstehend. Trägerschaft, Kontaktadressen und Dienstleister werden vor dem Pilotstart ergänzt. Dieser Text ist noch keine verbindliche Erklärung.";

export const LEGAL_PAGES: { slug: string; title: string; textVersion: string; validFrom: string; body: string }[] = [
  {
    slug: "regeln",
    title: "Community-Regeln",
    textVersion: COMMUNITY_RULES_VERSION,
    validFrom: "2026-11-01",
    body: `Diese Regeln gelten für alle Beiträge, Antworten, Profile und Gespräche in der Community. Du bestätigst sie vor deinem ersten Beitrag. Wenn sich die Regeln ändern, zeigen wir dir die neue Fassung und bitten dich erneut um Bestätigung.

## Worum es hier geht
Die Community ist ein geschützter Ort für den Austausch unter Erwachsenen mit MS. Wir wollen, dass sich alle sicher fühlen – auch an Tagen mit wenig Energie.

## Was willkommen ist
- Eigene Erfahrungen teilen, auch mit Behandlungen, Therapien und dem Alltag
- Fragen stellen, Mut machen, zuhören
- Unterschiedliche Meinungen, solange sie respektvoll geäussert werden
- Hinweise auf geprüfte Informationen und Hilfsangebote

## Was nicht erlaubt ist
- Belästigung, Beleidigung, Drohungen und Diskriminierung
- Doxxing: persönliche Daten anderer veröffentlichen, etwa Namen, Adressen, Arbeitgeber oder Fotos
- Betrug, Spendenaufrufe unter falschen Angaben und Spam
- Werbung für Produkte, Dienstleistungen oder Studien ohne vorherige Freigabe durch das Team
- Gefährliche individuelle Therapieanweisungen, etwa «Setz dein Medikament ab» oder konkrete Dosierungsempfehlungen für andere
- Inhalte, die zu Selbstverletzung oder Gewalt auffordern

## Erfahrungen sind keine Behandlungspläne
Du darfst erzählen, was dir geholfen hat. Bitte formuliere es als eigene Erfahrung und nicht als Empfehlung für andere. Für Entscheidungen zur Behandlung sind die behandelnden Fachpersonen zuständig.

## Privatsphäre
Teile nur, was du teilen möchtest. Gib keine Informationen über andere Personen weiter, ohne deren Einverständnis. Screenshots aus Gesprächen gehören nicht in die Community.

## Melden und Blockieren
Wenn dich etwas stört oder beunruhigt, kannst du Beiträge, Antworten, Profile, Nachrichten und Gruppen melden. Du kannst andere Mitglieder jederzeit blockieren. Meldende bleiben gegenüber der gemeldeten Person anonym.

## Moderation
Die Moderation ist täglich von 9 bis 18 Uhr im Dienst. Sie berücksichtigt den Zusammenhang eines Beitrags und kann Inhalte ausblenden, verwarnen oder das Schreiben zeitweise sperren. Dauerhafte Sperren brauchen eine zweite Freigabe. Gegen Entscheide kannst du innerhalb von 30 Tagen Einspruch erheben; eine andere Person prüft ihn.

## In akuten Krisen
Die Community ist kein Notfalldienst. Bei akuter Gefahr ruf den Sanitätsnotruf 144 an. Weitere Hilfewege findest du auf der Seite «Sicherheit und akute Hilfe».`,
  },
  {
    slug: "datenschutz",
    title: "Datenschutzinformation",
    textVersion: PRIVACY_VERSION,
    validFrom: "2026-11-01",
    body: `${DRAFT_NOTE}

## Das Wichtigste in Kürze
- Dein Tagebuch ist nur für dich sichtbar. Es gibt keine Freigabe an Kontakte, Moderation, Redaktion oder Fachpersonen.
- In der Community bist du mit einem Pseudonym unterwegs. Deine E-Mail-Adresse ist nie sichtbar.
- Wir verkaufen keine Daten, zeigen keine Werbung und verwenden keine Werbe-Tracker oder Session-Replays.
- Du kannst deine Daten jederzeit exportieren und dein Konto löschen.

## Bitte beachte
Schon die Mitgliedschaft auf einer Plattform für Menschen mit MS lässt Rückschlüsse auf deine Gesundheit zu. Wir behandeln deshalb auch Kontodaten mit besonderer Sorgfalt.

## Verantwortliche Stelle
[Name und Adresse der Trägerschaft – vor Pilotstart festzulegen]
Kontakt für Datenschutzanliegen: über das Kontaktformular, Kategorie «Datenschutz und meine Rechte», oder per E-Mail an die Datenschutzkontaktstelle [Adresse folgt].

## Welche Daten wir bearbeiten und wozu
- Konto: E-Mail-Adresse, Passwort (nur als sicherer Hash), Anmeldezeiten – um dir einen sicheren Zugang zu ermöglichen.
- Community-Profil: Pseudonym, freiwillige Interessen und optional dein Kanton – damit andere Mitglieder dich in der Community erkennen.
- Beiträge, Antworten und Nachrichten – damit der Austausch funktioniert.
- Gesundheitsbereich (nur nach ausdrücklicher Aktivierung): Check-ins, Symptome, Fatigue und Notizen – ausschliesslich für dich.
- Meldungen und Moderationsfälle – um die Community zu schützen.
- Kontaktformular: dein Anliegen und optional eine Antwortadresse – um dein Anliegen zu bearbeiten.
- Technische Protokolle ohne Inhalte – für Sicherheit und Betrieb.
- Nutzungsstatistik (nur wenn du sie selbst einschaltest): fünf grobe Ereignisse wie «Einführung abgeschlossen» oder «Artikel geöffnet», ohne Inhalte, Suchtexte, Pseudonym oder Gesundheitswerte – um die Plattform verständlicher zu machen.

## Wer Daten erhält
Mitarbeitende sehen nur, was ihre Aufgabe erfordert. Die Moderation sieht gemeldete Inhalte, aber kein Tagebuch. Für den Betrieb setzen wir Dienstleister ein, etwa für Hosting, Datenbank, Objektablage und E-Mail-Versand. Sie bearbeiten Daten nur in unserem Auftrag.
[Liste der Dienstleister mit Sitz und Datenstandort – vor Pilotstart zu ergänzen]

## In welchen Ländern
Ziel ist eine primäre Datenhaltung einschliesslich Backups in der Schweiz. Ob Daten in andere Länder bekanntgegeben werden, etwa durch Fernzugriffe von Dienstleistern, wird vor dem Pilotstart geprüft und hier offengelegt.

## Wie lange wir Daten aufbewahren
Die folgenden Fristen sind vorgeschlagene betriebliche Obergrenzen und werden vor dem Pilotstart geprüft.
- Unbestätigte Konten: 7 Tage
- Konto und Profil: bis zur Löschung; nach 24 Monaten Inaktivität erhältst du zuerst eine Nachricht und hast 30 Tage Zeit zu reagieren
- Check-ins und Tagebuch: bis du sie löschst oder die Einwilligung widerrufst; danach sofort gesperrt und innert 30 Tagen gelöscht
- Beiträge und Nachrichten: bis zur Löschung des Inhalts oder Kontos
- Einwilligungsnachweise: während der Nutzung und vorgeschlagen 3 Jahre danach
- Meldungen und Belege: 180 Tage nach Abschluss des Falls
- Sicherheits- und Auditprotokolle: 180 Tage, ohne Inhalte
- Exporte: höchstens 24 Stunden ab Bereitstellung
- Nutzungsstatistik: zufälliger Analysebezug und Rohdaten höchstens 30 Tage; danach nur Summen ab zehn Personen
- Backups: rollierend höchstens 35 Tage

## Deine Rechte
Du kannst Auskunft über deine Daten verlangen, falsche Daten berichtigen lassen, deine Daten exportieren und löschen. Vieles davon kannst du direkt unter «Daten und Konto» erledigen. Für weitere Anliegen nutze das Kontaktformular. Du kannst dich ausserdem an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden.

## Einwilligungen
Den Gesundheitsbereich aktivierst du mit einer gesonderten, freiwilligen Entscheidung. Du kannst sie jederzeit widerrufen. Ohne Gesundheitsbereich stehen dir alle anderen Bereiche offen.

Die anonyme Nutzungsstatistik ist standardmässig aus. Du kannst sie unter «Privatsphäre und Einwilligungen» ein- und jederzeit wieder ausschalten; beim Ausschalten werden die Rohdaten zu deinem Konto gelöscht.

## Sicherheit
Freitexte wie Tagebuchnotizen und Nachrichten werden verschlüsselt gespeichert. Mitarbeitende melden sich mit einem zweiten Faktor an. Privilegierte Zugriffe werden protokolliert.`,
  },
  {
    slug: "bedingungen",
    title: "Nutzungsbedingungen",
    textVersion: TERMS_VERSION,
    validFrom: "2026-11-01",
    body: `${DRAFT_NOTE}

## Wer die Plattform nutzen kann
Die Plattform richtet sich an Erwachsene ab 18 Jahren, die selbst mit MS leben, sowie an Interessierte, die die öffentlichen Inhalte lesen. Wir verlangen keinen Diagnosenachweis.

## Was die Plattform bietet
- freiwillige, private Alltagsdokumentation
- moderierten Austausch in der Community und in Gesprächen nach gegenseitiger Zustimmung
- redaktionell geprüftes Wissen und ein Verzeichnis von Schweizer Hilfsangeboten

## Was die Plattform nicht ist
- kein Notfalldienst und keine Überwachung rund um die Uhr
- keine medizinische Beratung, Diagnose oder Therapieempfehlung
- keine Vermittlung von Behandlungen oder Terminen
- keine Garantie, dass andere Mitglieder antworten

## Dein Konto
Bitte schütze dein Passwort und melde dich auf fremden Geräten ab. Ein Konto ist persönlich und darf nicht geteilt werden.

## Inhalte, die du teilst
Du bist für deine Beiträge verantwortlich. Es gelten die Community-Regeln. Du behältst die Rechte an deinen Texten und erlaubst uns, sie innerhalb der Community anzuzeigen, solange du sie nicht löschst.

## Moderation und Massnahmen
Bei Regelverstössen können Inhalte ausgeblendet, Verwarnungen ausgesprochen oder Schreibrechte zeitweise eingeschränkt werden. Du erhältst einen begründeten Entscheid und kannst innerhalb von 30 Tagen Einspruch erheben. Auch bei einer Sperre bleiben Auskunft, Export, Löschung und Einspruch möglich.

## Verfügbarkeit
Wir bemühen uns um einen zuverlässigen Betrieb. Bei Störungen können einzelne Funktionen vorübergehend eingeschränkt sein; die Sicherheitsseite bleibt nach Möglichkeit erreichbar.

## Konto löschen
Du kannst dein Konto jederzeit löschen. Die Folgen und Fristen werden dir vor der Bestätigung angezeigt.

## Änderungen
Wenn sich diese Bedingungen wesentlich ändern, informieren wir dich und zeigen die neue Fassung mit Gültigkeitsdatum an.`,
  },
  {
    slug: "impressum",
    title: "Impressum",
    textVersion: "impressum-2026-11-v1",
    validFrom: "2026-11-01",
    body: `${DRAFT_NOTE}

## Betreiberin
[Name der Trägerschaft]
[Rechtsform]
[Strasse und Hausnummer]
[Postleitzahl und Ort], Schweiz

## Kontakt
Bitte nutze das Kontaktformular. Es ist kein Notfallkanal – bei akuter Gefahr ruf den Sanitätsnotruf 144 an.

## Verantwortlich für den Inhalt
- Produktverantwortung: [Name folgt]
- Medizinische Redaktionsleitung: [Name folgt]
- Moderationsleitung: [Name folgt]
- Datenschutzkontaktstelle: [Name folgt]

## Hinweis zu Inhalten
Die Wissensartikel enthalten allgemeine Informationen und ersetzen keine ärztliche oder therapeutische Beratung. Beiträge in der Community geben die persönliche Sicht der Mitglieder wieder und sind nicht fachlich geprüft.

## Externe Links
Links zu externen Websites sind als solche gekennzeichnet. Für deren Inhalte sind die jeweiligen Anbieter verantwortlich. Beim Öffnen werden keine Profil- oder Gesundheitsdaten übertragen.`,
  },
  {
    slug: "barrierefreiheit",
    title: "Erklärung zur Barrierefreiheit",
    textVersion: "barrierefreiheit-2026-11-v1",
    validFrom: "2026-11-01",
    body: `Diese Plattform wird für Menschen mit Fatigue, Seh- und motorischen Einschränkungen entwickelt. Barrierefreiheit ist deshalb kein Zusatz, sondern Grundlage.

## Unser Ziel
Wir streben die Konformität mit den Web Content Accessibility Guidelines (WCAG) 2.2 auf Stufe AA für alle Ansichten an, einschliesslich der Verwaltung. Eine verbindliche Konformitätsaussage machen wir erst nach einer dokumentierten Prüfung des gesamten Angebots.

## Stand
Die Plattform befindet sich im Aufbau. Eine vollständige Prüfung mit automatischen Tests, Tastatur, Screenreadern (VoiceOver, NVDA, TalkBack), 200 Prozent Textgrösse und 400 Prozent Zoom ist vor dem Pilotstart vorgesehen. Die Ergebnisse veröffentlichen wir hier.

## Was wir bereits umsetzen
- Bedienung vollständig per Tastatur mit sichtbarem Fokus
- Kontraste von mindestens 4,5 zu 1 für normalen Text
- Darstellung ab 320 Pixel Breite ohne seitliches Scrollen
- grosse Schaltflächen von mindestens 44 mal 44 Pixel für Hauptaktionen
- einfache Ansicht, Schriftvergrösserung und reduzierte Bewegung unter «Anzeige und Bedienung» – auch ohne Konto
- Status nie nur über Farbe, sondern immer auch als Text
- keine Zeitlimits, keine automatisch startenden Medien, keine Endlos-Feeds

## Bekannte Einschränkungen
Einzelne Bereiche wurden noch nicht vollständig mit Screenreadern geprüft. Dekorative Animationen werden bei reduzierter Bewegung und in der einfachen Ansicht ausgeschaltet.

## Barriere melden
Wenn dir eine Barriere auffällt oder du Inhalte in einer anderen Form brauchst, schreib uns über das Kontaktformular mit der Kategorie «Barriere melden». Beschreibe, wo das Problem auftritt und welches Gerät oder Hilfsmittel du nutzt. Wir melden uns, wenn du eine Antwortadresse angibst.`,
  },
];
