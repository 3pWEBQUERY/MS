# 19 Quellen und Begriffe

## Produktbasis und fachliche Referenzen

Quellenprüfung am 2. November 2026. Verweise Q1--Q11 begründen den
fachlichen Rahmen, nicht jede einzelne Produktentscheidung. Konkrete
Fristen, Kapazitätsziele, Screenaufteilung und MVP-Grenzen dieses PRD
sind Projektvorgaben. Gesetze und Leitlinien sind vor Launch auf
aktuelle Fassung und konkreten Anwendungsfall zu prüfen.

**Q0 Produktkonzept Variante C** Gespräch «MS Apps und Webseiten»,
Produktkonzept Version 1.0, November 2026. Grundlage für Mein Moment,
die fünf Lebensbereiche, neun langfristige Module, freiwilliges Tracking
und die Trennung von Erfahrung und Fachinformation. Die aktuelle
Beauftragung konkretisiert die MVP-Module. Link:
[[chatgpt.com/...]{.underline}](https://chatgpt.com/c/6ae8dc1d-ad84-83ed-9c35-8f8c140d8ef7)

**Q1 Schweizer Datenschutzgesetz** Fedlex, Bundesgesetz über den
Datenschutz, SR 235.1; insbesondere Art. 5--9, 16--19, 22--25 und 28.
Rahmen für Gesundheitsdaten, technische Schutzgestaltung, Information
und Rechte. Link:
[[www.fedlex.admin.ch/...]{.underline}](https://www.fedlex.admin.ch/eli/cc/2022/491/de)

**Q2 Datenschutzfolgenabschätzung** EDÖB, Erläuterungen zur DSFA und zum
risikobasierten Ansatz; Grundlage für Risikobewertung und mögliche
Konsultation. Link:
[[www.edoeb.admin.ch/...]{.underline}](https://www.edoeb.admin.ch/de/datenschutz-folgenabschaetzung)

**Q3 Datensicherheitsverletzungen** EDÖB, FAQ Datenschutz, Abschnitt
Meldung eines Datenlecks; Art. 24 DSG. Grundlage für die getrennte
Bewertung von Melde- und Informationspflichten. Link:
[[www.edoeb.admin.ch/...]{.underline}](https://www.edoeb.admin.ch/de/faq-datenschutz)

**Q4 Dienstleister und Auslandbekanntgabe** EDÖB, Bekanntgabe von
Personendaten ins Ausland sowie Outsourcing. Grundlage für Länder-,
Vertrags- und Zugriffskontrolle. Links:
[[www.edoeb.admin.ch/...]{.underline}](https://www.edoeb.admin.ch/de/bekanntgabe-von-personendaten-ins-ausland)
und
[[www.edoeb.admin.ch/...]{.underline}](https://www.edoeb.admin.ch/de/outsourcing-auftragsdatenbearbeitung)

**Q5 Datenschutzgrundverordnung** EUR-Lex, Verordnung EU 2016/679;
insbesondere Art. 3, 6, 9, 12--22, 28, 32--35 und Kapitel V. Nur soweit
für das konkrete Angebot anwendbar. Link:
[[eur-lex.europa.eu/...]{.underline}](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de)

**Q6 Medizinprodukte Software** Swissmedic, Merkblatt BW630_30_007,
Version 3.0, gültig ab 21. April 2026, insbesondere Qualifizierung,
Zweckbestimmung und Softwaremodule. Link: [[Quelle
öffnen]{.underline}](https://www.swissmedic.ch/dam/swissmedic/de/dokumente/medizinprodukte/mep_urr/bw630_30_007d_mbmedizinprodukte-software.pdf.download.pdf/BW630_30_007d_MB%20Medizinprodukte-Software.pdf)

**Q7 Barrierefreiheit** W3C, Web Content Accessibility Guidelines 2.2,
Recommendation vom 12. Dezember 2024. Verbindliches Produktziel WCAG 2.2
AA. Links: [[www.w3.org/...]{.underline}](https://www.w3.org/TR/WCAG22/)
und ergänzend zu den neuen Kriterien
[[www.w3.org/...]{.underline}](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

## Technische Referenzen und Glossar

**Q8 Vergrösserung und Umbruch** W3C WAI, Understanding Success
Criterion 1.4.10 Reflow. Präzisiert 320 CSS-Pixel und den Zusammenhang
mit 400-Prozent-Zoom. Link:
[[www.w3.org/...]{.underline}](https://www.w3.org/WAI/WCAG21/Understanding/reflow)

**Q9 Schutz im Web Framework** Next.js, Guides Data Security und
Authentication. Grundlage für explizite Feldauswahl und serverseitige
Prüfung nahe am Datenzugriff. Versionen werden vor Umsetzung festgelegt.
Links:
[[nextjs.org/...]{.underline}](https://nextjs.org/docs/app/guides/data-security)
und
[[nextjs.org/...]{.underline}](https://nextjs.org/docs/app/guides/authentication)

**Q10 Datenbankrechte** PostgreSQL, Row Security Policies, aktuelle
Dokumentation. Grundlage für ergänzende Datenbankfilter und die Prüfung
von Eigentümer- und Bypassrechten. Link:
[[www.postgresql.org/...]{.underline}](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

**Q11 Passwortschutz** OWASP Cheat Sheet Series, Password Storage und
Authentication. Grundlage für adaptive Hashes, Schutz vor
Kontoaufzählung und sichere Wiederherstellung. Links:
[[cheatsheetseries.owasp.org/...]{.underline}](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
und
[[cheatsheetseries.owasp.org/...]{.underline}](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Begriffe im PRD

  -----------------------------------------------------------------------
  **Begriff**       **Bedeutung**
  ----------------- -----------------------------------------------------
  Check-in          Ein freiwilliger Datensatz pro lokalem Tag; kein
                    medizinisches Screening

  Tagebuch          Mehrere selbst berichtete Beobachtungen mit Zeitpunkt
                    und optionaler Notiz

  Fatigue           Im Produkt eine subjektiv dokumentierte Beobachtung;
                    kein diagnostischer Messwert

  Offen             Bei Gruppen: für verifizierte Mitglieder der
                    Plattform lesbar, nicht im öffentlichen Web

  Geschlossen       Inhalt nur für aktiv aufgenommene Gruppenmitglieder;
                    keine absolute Vertraulichkeitsgarantie gegenüber
                    Kopien

  Kontaktfreigabe   Bewusste Zustimmung beider Personen zum 1 zu 1
                    Nachrichtenaustausch

  Pseudonym         Sichtbarer Anzeigename; die Plattform kann das Konto
                    intern zuordnen

  Fachliche Prüfung Dokumentierte Prüfung einer konkreten Inhalts- oder
                    Funktionsversion durch zuständige Fachperson

  DSFA              Datenschutzfolgenabschätzung mit Bewertung von
                    Risiken, Massnahmen und Restrisiken

  RPO und RTO       Maximal angestrebter Datenverlustzeitraum und
                    angestrebte Wiederanlaufzeit

  Idempotenz        Wiederholung desselben Vorgangs erzeugt keinen
                    zusätzlichen Datensatz

  Outbox            Mit der fachlichen Änderung gespeichertes Ereignis
                    für verlässliche Hintergrundaufgaben

  RLS               Zusätzliche Datenbankregeln zur Begrenzung
                    zugänglicher Datensätze

  Releasegate       Nachweisbare Bedingungen, die vor Freigabe einer
                    Auslieferung erfüllt sein müssen
  -----------------------------------------------------------------------

Die im PRD benannten Validierungen betreffen die tatsächliche
Produktfreigabe. Eine technische Implementierung allein begründet weder
medizinische Eignung noch eine allgemeine Datenschutz- oder
Barrierefreiheitsgarantie.
