# 04 Navigation und Interaktionsprinzipien

## Informationsarchitektur

Die Hauptnavigation besteht aus **Heute**, **Community**, **Mein MS**,
**Wissen** und **Hilfe**. Desktop verwendet eine Seitenleiste, Mobil
eine gut erreichbare untere Navigation mit Textbeschriftung. Gespräche
und Gruppen liegen unter Community; ein Nachrichtenindikator führt
direkt dorthin. Konto, Privatsphäre und Anzeige sind über das Profilmenü
erreichbar. Der Hilfezugang bleibt an konsistenter Stelle sichtbar.

Der öffentliche Bereich enthält Startseite, Wissen,
Unterstützungsverzeichnis, Sicherheit, Kontakt, Impressum, Datenschutz
und Nutzungsregeln. Ein geschützter Link führt zunächst zum Login und
danach zum ursprünglich gewünschten Ziel, sofern die Berechtigung
besteht. Die sichtbare Fehlermeldung verrät keine Existenz privater
Objekte.

## Mein Moment und ruhiger Einstieg

Die drei Einstiegsoptionen lauten «Etwas festhalten», «Austausch finden»
und «Wissen oder Hilfe finden». Eine Auswahl zeigt höchstens drei
beschriftete Ziele. Ohne Eingabe bleiben alle Module über die Navigation
erreichbar. Es gibt keine Bewertung, keine Einteilung in Risikogruppen
und keine Ableitung aus dem Tagebuch. Nach «Austausch finden» erscheinen
Gruppen und der Weg zu bereits bekannten Kontakten; eine spontane
Gesprächsvermittlung gehört zu Phase 2.

## Gemeinsame Zustände für alle Screens

**Laden** zeigt kurze, stabile Platzhalter ohne unruhige Animation.
**Leer** erklärt den nächsten freiwilligen Schritt. **Fehler** nennt
verständlich Ursache soweit bekannt und eine Wiederholung. **Offline**
bestätigt ausdrücklich, dass eine Änderung noch nicht gespeichert ist.
**Erfolg** wird erst nach Serverbestätigung angezeigt und für assistive
Technik angekündigt. **Kein Zugriff** enthält einen neutralen Hinweis
und einen sicheren Rückweg.

Bei ungespeicherten Eingaben warnt die Navigation. Eingaben bleiben bei
einem vorübergehenden Fehler im Arbeitsspeicher erhalten; sensible
Entwürfe werden nicht in Browser-Dauerspeicher geschrieben. Nach
Abmeldung werden geschützte Ansichten und temporäre Inhalte verworfen.
Eine abgelaufene Sitzung erfordert erneute Anmeldung, ohne Speicherung
privater Entwürfe auf einem öffentlichen Gerät.

## Sprache und Darstellung

Auslieferung in de-CH, verständliche Du-Ansprache, Schweizer
Schreibweise. Kein Zwang zu medizinischer Fachsprache. Datum und Zeit
werden lokal dargestellt; Standardzeitzone Europe/Zurich mit Sommerzeit.
Systemmeldungen verwenden klare Verben. Einfache Ansicht reduziert
optionale Karten, Animationen und Informationsdichte; sie entfernt keine
Sicherheitsfunktionen. Texte sind inhaltlich mit medizinischer Redaktion
und Betroffenen zu testen.

Die folgenden Screens sind logische Ansichten. Dialoge sind mit erfasst;
responsives Layout erzeugt keine neuen Screen-IDs. Ein Designsystem
spezifiziert Fokus, Formulare, Tabellen, Karten, Dialoge und
Rückmeldungen vor der Entwicklung.
