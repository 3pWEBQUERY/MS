# 12 Barrierefreiheit und geringe Belastung

Verbindliches Produktziel ist WCAG 2.2 auf Stufe AA für alle
MVP-Ansichten einschliesslich Administration. Eine Konformitätsaussage
erfolgt erst nach dokumentierter Prüfung des gesamten Geltungsbereichs.
Die konkrete rechtliche Anwendbarkeit weiterer Vorgaben wird in D01
bewertet; «barrierearm» ist keine pauschale Rechtsgarantie. \[Q7\]

## Prüfvorgaben für Design und Entwicklung

**A01 Wahrnehmung** Normaler Text erreicht mindestens 4,5 zu 1 Kontrast,
grosser Text mindestens 3 zu 1; erforderliche Bedien- und
Fokusinformationen mindestens 3 zu 1. Status nutzt Text zusätzlich zu
Farbe. Charts bieten Datentabellen. Icons haben zugängliche Namen; rein
dekorative Elemente bleiben für Screenreader verborgen. \[Q7\]

**A02 Vergrösserung und Umbruch** Text ist bis 200 Prozent
vergrösserbar. Bei einer Breite von 320 CSS-Pixeln beziehungsweise
entsprechendem 400-Prozent-Zoom bleiben Inhalt und Funktion ohne
zweidimensionales Seitenscrollen erhalten, soweit keine sachlich
erforderliche Ausnahme vorliegt. Formulare, Navigation und Chat werden
ausdrücklich geprüft. \[Q7, Q8\]

**A03 Bedienung** Sämtliche Aktionen funktionieren mit Tastatur,
sichtbarem und nicht verdecktem Fokus. Dialoge verwalten Fokus und
Rückkehr. Keine ausschliessliche Drag-and-drop-Aktion, keine Geste ohne
Alternative. Das Projektziel für primäre Touchflächen ist mindestens 44
mal 44 CSS-Pixel und liegt über dem WCAG-AA-Mindestziel von 24 mal 24
CSS-Pixeln mit dessen Ausnahmen. \[Q7\]

**A04 Verständlichkeit und Anmeldung** Felder besitzen Namen, Hinweise
und zugeordnete Fehlermeldungen. Wiederkehrende Navigation und Hilfe
bleiben konsistent. Passwortmanager und Einfügen werden unterstützt;
keine Gedächtnisaufgabe als einzige Anmeldung. Meldungen erscheinen auch
semantisch, ohne Fokus willkürlich zu verschieben. \[Q7\]

## Zusätzliche Produktziele für Fatigue und Kognition

Eine Hauptaktion pro Arbeitsansicht, kurze Absätze und klare
Zwischentitel. Formulare beginnen mit dem Minimum und öffnen Ergänzungen
erst auf Wunsch. Keine vorausgewählten Skalenwerte,
Countdown-Aufforderungen, automatisch startenden Medien, Endlosfeeds
oder Werbeunterbrechungen. Die Standardansicht ist ruhig; reduzierte
Bewegung respektiert Systemeinstellungen. Eine Animation darf nie den
Speicherstatus vermitteln müssen.

Die einfache Ansicht reduziert Dashboardkarten und optionale Metadaten.
Sie bewahrt Hauptnavigation, Hilfe, Datenschutz- und
Sicherheitsaktionen. Hinweise sind kurz und konkret; medizinische
Begriffe erhalten redaktionell geprüfte Erläuterungen. Eine Kurzfassung
ist eine Verständnishilfe und keine behauptete Zertifizierung in
Leichter Sprache.

## Nachweis und Beteiligung

Automatische Prüfungen werden durch manuelle Tastaturtests, VoiceOver
mit Safari, NVDA mit Firefox oder Chrome sowie TalkBack mit Chrome
ergänzt. Testpersonen mit Seh-, motorischen oder kognitiven
Einschränkungen und Fatigue erhalten Pausen, kurze Aufgaben und mehrere
Sitzungsoptionen. Keine Gesundheitsdaten sind für die Testteilnahme
nötig. Alle kritischen Flows werden mit 200-Prozent-Text und
400-Prozent-Zoom durchlaufen. Abnahme enthält Befunde, Fixes, Retest und
eine öffentliche Kontaktmöglichkeit für Barrieren.
