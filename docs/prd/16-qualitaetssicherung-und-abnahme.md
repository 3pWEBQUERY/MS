# 16 Qualitätssicherung und Abnahme

## Rückverfolgbarkeit und Teststrategie

Für jede FR-ID werden ein Implementierungsverweis und mindestens ein
positiver und ein risikogerechter negativer Nachweis im Arbeitssystem
hinterlegt. Die folgende Matrix definiert die verpflichtenden
Testpakete. Die Tests verwenden fiktive Konten mit aktiven, gesperrten,
blockierten, ausgetretenen und gelöschten Zuständen.

  ------------------------------------------------------------------------
  **Paket**          **Abgedeckte                **Kernnachweis**
                     Anforderungen**             
  ------------------ --------------------------- -------------------------
  QA01 Konto und     ACC01--08, PRI07--08        Verifikation, Reset, MFA,
  Rechte                                         Sitzungsentzug,
                                                 Rollenwechsel,
                                                 Fremdzugriff

  QA02 Persönlicher  HOM01--08, US02--03         Ohne Tagebuchdaten
  Einstieg                                       sinnvoll, einfache
                                                 Ansicht, Teilabschaltung

  QA03 Eigene        DIA01--08, US04--10         Skalen, null/leer,
  Dokumentation                                  Zeitwechsel, Konflikt,
                                                 Idempotenz, Export

  QA04 Community     COM01--08, US13--14         Zielgruppen, geschlossene
                                                 Gruppe, Austritt,
                                                 Archivierung, Suchfilter

  QA05 Kommunikation MSG01--08, US15--16, US23   Freigabe, Entzug während
                                                 Senden, Block,
                                                 Zustellqueue, Ruhezeit

  QA06 Redaktion und CON01--08, US21--22, US25   Vieraugenprüfung, Ablauf,
  Hilfe                                          Korrektur, Link- und
                                                 Suchprüfung

  QA07 Schutz und    SAF01--08, US17--20         Meldung, begrenzte
  Krise                                          Belege, Sanktion,
                                                 Einspruch, Krisenübung

  QA08 Datenschutz   PRI01--08, US09--10, US24   Ablehnung, Widerruf,
                                                 Auskunft, Löschung,
                                                 Dienstleister, Backup

  QA09               A01--04, alle Screens       Automatisch plus
  Barrierefreiheit                               Tastatur, Screenreader,
                                                 Zoom, Betroffenenprüfung

  QA10 Betrieb und   NFR01--20, US26             Last, Sicherheit,
  Leistung                                       Restore, Alarm, Rollback
                                                 und Störung
  ------------------------------------------------------------------------

Unit-Tests prüfen Skalen, Fristen, Zustandsautomaten und
Rechteentscheidungen. Integrationstests prüfen Datenbankregeln, Rollen,
Transaktionen und Jobs. Ende-zu-Ende-Tests decken F01--F07 ab.
Sicherheitsprüfung enthält direkte Schnittstellenzugriffe, manipulierte
IDs, XSS in Freitext, CSRF, Rate-Limits und unberechtigte
Cache-/Suchtreffer. Ein externer Pentest folgt vor Öffnung über den
geschlossenen Pilot hinaus; kritische Datenzugriffstests sind bereits
vor dem Pilot erforderlich.

## Konkrete Abnahmeszenarien

**AT01 Freiwilligkeit** Gegeben ein verifiziertes Konto ohne
Gesundheitsaktivierung. Wenn das Mitglied S18 und Community öffnet, dann
sind alle sozialen und öffentlichen Kernwege nutzbar; keine Messwerte
werden angelegt. Nach Ablehnung von S08 bleibt dieses Verhalten
erhalten.

**AT02 Null und Wiederholung** Gegeben Energie 0 und fehlende Stimmung.
Wenn derselbe Check-in nach Verbindungsabbruch erneut gesendet wird,
dann gibt es genau einen Eintrag mit Energie 0 und leerer Stimmung,
identisch in Tabelle und Export.

**AT03 Fremde Daten** Gegeben zwei aktive Mitglieder A und B. Wenn B
eine bekannte Tagebuch-ID von A über eine direkte Anfrage aufruft,
ändert oder exportiert, dann erhält B keinerlei Inhalt oder
Existenzdetail. Der Vorfall wird ohne Werte technisch erfasst. Das gilt
auch für eine gewöhnliche Administrationsrolle.

## Weitere Abnahmeszenarien und Definition of Done

**AT04 Geschlossene Gruppe** Gegeben A ist Mitglied einer geschlossenen
Gruppe, B nicht. Wenn B sucht oder einen Direktlink öffnet, dann bleiben
Titel privater Beiträge, Text, Anzahl und Mitglieder verborgen. Nach
Austritt von A sind auch offene Ansichten und neue Hinweise
unzugänglich; A kann nur eigene Texte isoliert löschen.

**AT05 Zustimmung und Konkurrenz** Gegeben ein ausstehender Kontakt.
Wenn der Sender direkt eine Chatnachricht sendet, dann wird sie
abgewiesen. Nach bewusster Annahme ist Senden möglich. Wird
Kontaktentzug bestätigt, während eine weitere Nachricht wartet, dann
kann danach kein neuer Sendevorgang erfolgreich sein. Reihenfolge und
Ergebnis sind nachvollziehbar.

**AT06 Block und Zustellqueue** Gegeben eine wartende soziale E-Mail.
Wenn die empfangende Person den Absender blockiert, dann werden
Nachricht, Anfrage und Hinweis nicht mehr zugestellt. Die Blockierliste
enthält nur eigene Entscheidungen; Aufheben erzeugt keine neue
Kontaktfreigabe.

**AT07 Chatmeldung und Einspruch** Wenn A drei Nachrichten meldet, sieht
zuständige Moderation genau diese Belege und Fallmetadaten. Andere Chats
und Tagebücher bleiben unzugänglich. Ein Einspruch wird einer anderen
Person zugewiesen; die Gegenseite erhält keine Melderidentität.

**AT08 Redaktion** Wenn ein freigegebener medizinischer Artikel
inhaltlich geändert wird, bleibt die neue Version unpubliziert bis zur
erneuten Fremdprüfung. Bei abgelaufenem Prüftermin verschwindet die
publizierte Version aus Suche und Empfehlungen. Ein gespeicherter
Verweis zeigt keinen überfälligen Text.

**AT09 Löschung und Restore** Nach bestätigter Kontolöschung sind
Sitzungen, Chatschreiben und Freigaben sofort ungültig; eigene Texte
werden ausgeblendet. Ein kontrollierter Restore aus einem alten Backup
wendet vor Freigabe das Löschjournal an. Innerhalb der aktiven
Löschfrist sind Suchindex, Exporte, Jobs und Dienstleisterstatus
geprüft.

**AT10 Barriere und Teilstörung** Eine Person erledigt F01, F02, F05 und
F06 per Tastatur und Screenreader, ohne verdeckten Fokus. Bei
400-Prozent-Zoom bleiben Hauptaktionen erreichbar. Bei Chatabschaltung
kann S49 weiterhin ohne Anmeldung gelesen werden.

## Definition of Done

Ein Arbeitspaket ist fertig, wenn FR- und S-IDs verknüpft sind,
fachliches Verhalten und Fehlerzustände implementiert und geprüft sind,
objektbezogene Rechte auch direkt getestet wurden, keine sensiblen Daten
in Logs erscheinen und Design sowie relevante Barrierefreiheitsprüfungen
bestanden sind. Schema, Export, Löschung, Dokumentation und Migration
sind aktualisiert; Review und gegebenenfalls medizinische oder
rechtliche Freigabe liegen vor. Ein bloss erfolgreicher Build genügt
nicht.

**Releasefreigabe** Alle 64 FR-Anforderungen, alle kritischen Flows und
verbindlichen NFR sind nachgewiesen. Keine offenen kritischen oder hohen
Sicherheitsmängel, keine bekannten unberechtigten Datenzugriffe, keine
blockierenden Barrieren. Niedrigere Restmängel benötigen Eigentümer,
Termin und dokumentierte Risikoentscheidung. D01--D08 sind geschlossen;
Startbestand, Moderationsdienstplan, Krisenübung, Restore,
Rechteprüfung, Datenschutzprozesse und Support sind betriebsbereit.
Product Owner, Technik, Moderation, medizinische Redaktion und
Datenschutzverantwortung geben ihren Bereich nachvollziehbar frei.
