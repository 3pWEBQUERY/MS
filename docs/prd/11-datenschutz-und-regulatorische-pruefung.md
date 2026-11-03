# 11 Datenschutz und regulatorische Prüfung

## Rechtlicher Rahmen und Zweckbestimmung

Gesundheitsdaten gehören nach Schweizer DSG zu den besonders
schützenswerten Personendaten. Grundsätze wie Zweckbindung,
Verhältnismässigkeit, Datensicherheit und Datenschutz durch Technik und
Voreinstellungen prägen die Umsetzung. Das PRD ersetzt weder die Prüfung
des konkreten Betriebsmodells noch rechtliche Freigaben. Eine
ausformulierte Datenschutzerklärung entsteht nach Festlegung von
Trägerschaft und Dienstleistern. \[Q1\]

Die DSGVO gilt nicht allein deshalb, weil eine Schweizer Website aus der
EU erreichbar ist. Ihre räumliche Anwendbarkeit ist anhand Art. 3 zu
prüfen. Falls sie greift, sind unter anderem eine Grundlage nach Art. 6
und eine Ausnahme nach Art. 9 für Gesundheitsdaten sowie einschlägige
Betroffenenrechte und gegebenenfalls Vertretungs- oder
Datenschutzbeauftragtenpflichten zu bewerten. \[Q5\]

**Fachprüfung Recht D01** erstellt vor Erhebung produktiver Daten eine
Zweck- und Rechtsgrundlagenmatrix für Konto, Community, Gesundheit,
Moderation, Sicherheit und Analytics. Ausdrückliche
Gesundheitsaktivierung ist eine Produktvorgabe; sie bedeutet nicht, dass
jede Bearbeitung nach Schweizer Recht zwingend auf Einwilligung beruhen
muss. Widerruf und gesetzliche Aufbewahrungsgründe werden je Zweck
getrennt behandelt.

**Fachprüfung Medizin und Regulierung D02** dokumentiert die konkrete
Zweckbestimmung anhand von Funktionen, Skalen, Export, Texten und
Vermarktung. Software kann aufgrund ihrer medizinischen Zweckbestimmung
unter Medizinprodukterecht fallen. Die Bezeichnung «Alltagshilfe» oder
ein Disclaimer allein legt die Einordnung nicht fest. Neue
Interpretationen, Risikoalarme und Therapieunterstützung erfordern vor
Umsetzung eine erneute Prüfung. \[Q6\]

## Datenschutzfolgen und Lieferanten

Vor Pilotstart wird als interne Freigabebedingung eine DSFA erstellt.
Die gesetzliche Pflicht hängt vom potenziell hohen Risiko der konkreten
Bearbeitung ab. Risiken, Schutzmassnahmen und Restrisiken werden
bewertet; der erforderliche Konsultationsweg bei hohem Restrisiko ist
rechtlich festzulegen. \[Q2\]

Vorgabe ist primäre Datenhaltung einschliesslich Backups in der Schweiz.
Hosting allein schafft keine Compliance-Garantie. Zugriffsländer,
Support, E-Mail, CDN, Fehlermonitoring und Unterauftragsbearbeiter
werden vollständig erfasst. Verträge, Weisungen, Schutzmassnahmen und
Auslandbekanntgaben sind vor Beauftragung zu prüfen. Ausländische
Fernzugriffe sind in diese Prüfung einzubeziehen. \[Q4\]

## Produktseitige Schutzvorgaben

Keine Werbe-Tracker, Session-Replays, Fingerprints oder Weitergabe an
Datenbroker. Keine Nutzung privater Inhalte zum Modelltraining, zur
Forschung oder zur Produktanalyse. Öffentliche Inhalte dürfen
zwischengespeichert werden; geschützte Inhalte erhalten private, nicht
gemeinsam nutzbare Caches. Fehlerberichte entfernen E-Mail, Token, URLs
mit Identifikatoren und Inhaltsfelder. Einwilligungen sind granular,
ohne vorausgewählte Optionen und ohne erzwungene Verknüpfung mit dem
Mitgliederzugang.

## Lebenszyklus Aufbewahrung und Rechte

Die folgenden Zeiten sind vorgeschlagene **betriebliche Obergrenzen**,
keine gesetzlichen Pauschalfristen. Datenschutzberatung und Trägerschaft
geben sie in D05 frei oder ersetzen sie begründet. Eine längere
Aufbewahrung benötigt einen konkreten Zweck, eingeschränkten Zugriff und
ein Enddatum.

  ------------------------------------------------------------------------------
  **Datenklasse**          **Vorgeschlagene            **Löschregel und Beleg**
                           Aufbewahrung**              
  ------------------------ --------------------------- -------------------------
  Unbestätigte Konten      7 Tage                      Automatische Löschung,
                                                       Token spätestens 24
                                                       Stunden

  Konto und Profil         Bis zur Löschung; bei 24    Keine unbegrenzte
                           Monaten Inaktivität         Vorratshaltung;
                           vorherige Benachrichtigung  dokumentierte Bereinigung
                           und Frist von 30 Tagen      

  Check-ins und Tagebuch   Bis zu eigener Löschung     Sofort sperren, aktive
                           oder Widerruf ohne weitere  Systeme binnen 30 Tagen
                           zulässige Grundlage         löschen

  Beiträge und Nachrichten Bis eigener Inhalts- oder   Text für beide Ansichten
                           Kontolöschung               ausblenden; aktive
                                                       Systeme binnen 30 Tagen
                                                       bereinigen

  Einwilligungsnachweise   Während Nutzung und         Rechtlich zu prüfen;
                           vorgeschlagen 3 Jahre nach  getrennt von
                           Ende, nur erforderlicher    Gesundheitsinhalten
                           Nachweis                    

  Meldungen und Belege     180 Tage nach Fallabschluss Bei begründeter Ausnahme
                                                       monatlich prüfen; danach
                                                       löschen

  Sicherheits- und         180 Tage                    Inhaltsfrei,
  Auditlogs                                            eingeschränkt; Frist auf
                                                       mögliche
                                                       Protokollpflichten prüfen

  Rohe Webserverlogs       14 Tage                     Keine Inhaltsfelder,
                                                       Zugriff begrenzt, keine
                                                       Analytics-Zweckänderung

  Optionale                30 Tage                     Danach nur nicht
  Analytics-Rohdaten                                   rückführbare Aggregate
                                                       mit Mindestgruppengrösse

  Exporte                  Höchstens 24 Stunden ab     Verschlüsselt, Download
                           Bereitstellung              stets authentifiziert,
                                                       automatische Entfernung

  Backups                  Rollierend höchstens 35     Keine produktive Nutzung;
                           Tage                        Löschjournal vor
                                                       Wiederfreigabe anwenden
  ------------------------------------------------------------------------------

**Rechteprozess** Kontakt und S15 ermöglichen Auskunft, Berichtigung,
Export und Löschung sowie rechtlich einschlägige weitere Rechte.
Identität wird verhältnismässig geprüft, vorzugsweise über bestehende
Sitzung und bestätigte E-Mail. Ausweiskopien werden nicht standardmässig
angefordert. Die Datenschutzstelle führt eine Fristenliste nach dem
tatsächlich anwendbaren Recht; Produktziele ersetzen keine gesetzlichen
Antwortfristen. Ein Datenexport allein ist nicht automatisch eine
vollständige rechtliche Auskunft. \[Q1, Q5\]

**Löschung über Systeme** Ein Auftrag umfasst Datenbank, Suchindex,
Objektablage, Cache, Warteschlangen und Dienstleister. Bei Kontolöschung
verschwinden eigene Texte auch aus der Ansicht des Gesprächspartners;
fremde Texte bleiben dessen Daten und sind nur unter dessen Rechten
verfügbar. Unnötige Teilnehmerverknüpfungen werden entfernt. Gesondert
zulässig gesicherte Fallbelege bleiben nur befristet und nicht im
normalen Chat sichtbar.

**Wiederherstellung und Sicherungsnachlauf** Bei maximal 30 Tagen
aktiver Bereinigung und 35 Tagen Backupdauer können letzte
Sicherungskopien bis zu 65 Tage nach Auftrag bestehen. Sie sind nur zur
kontrollierten Wiederherstellung zugänglich. Vor Wiederfreigabe wird das
aktuelle Löschjournal angewendet; gelöschte Konten und Freigaben dürfen
nicht reaktiviert werden. Externe Kopien und diese zeitlichen Grenzen
werden verständlich erklärt.
