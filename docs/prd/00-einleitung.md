Variante C · Responsive Web App · Deutschschweiz

Version 1.0 · 2. November 2026

Dieses PRD spezifiziert eine barrierearme Plattform für Erwachsene mit
Multipler Sklerose. Sie verbindet persönliche Alltagsdokumentation,
moderierten Austausch, fachlich kuratiertes Wissen und passende
Unterstützungsangebote. Die Nutzung funktioniert auch ohne
Tagebucheinträge, Angaben zum Krankheitsverlauf oder tägliche Teilnahme.

Die erste Auslieferung ist eine responsive Web App. Ein gemeinsames
Backend schafft die Grundlage für spätere iOS und Android Apps. Das MVP
umfasst Dashboard, freiwilligen Check-in, Symptom- und Fatigue-Tagebuch,
Community und Gruppen, gegenseitig freigegebenes Messaging,
Wissensbibliothek und Unterstützungsverzeichnis.

**Adressaten**: Produktverantwortung, Design, Entwicklung,
Qualitätssicherung, Betrieb, Moderation, medizinische Redaktion und
Datenschutzberatung.

**Dokumentverantwortung**: Product Owner, durch die Trägerschaft vor
Projektstart zu benennen.

**Freigabestatus**: Spezifikation zur fachlichen und organisatorischen
Freigabe. Die Anforderungs-IDs sind stabil; offene Freigaben sind im
Entscheidungsregister erfasst. Medizinische Inhalte, Zweckbestimmung,
Datenschutz und Krisenprozesse benötigen die bezeichneten Fachprüfungen
vor Produktivbetrieb.

**Produktgrenze**: Die Plattform dokumentiert selbst berichtete
Beobachtungen und erleichtert Information und Austausch. Diagnose,
individuelle Therapieempfehlungen, Schuberkennung, medizinische
Überwachung und ein Notfallversprechen gehören nicht zum MVP. Die
regulatorische Einordnung erfolgt anhand der tatsächlichen Funktionen
und Kommunikation.

# Orientierung und Dokumentsteuerung

Das PRD dient als gemeinsame Arbeitsgrundlage für die Umsetzung und die
Abnahme des MVP. Es beschreibt Sollverhalten, Datenzugriffe und
Betriebsprozesse so, dass daraus Arbeitspakete und Tests entstehen
können. Ein Launch setzt die Freigabekriterien in Kapitel 16 voraus.

## Inhalt

[[01 Produktauftrag und Erfolg]{.underline}](#produktauftrag-und-erfolg)
3

[[02 MVP und Produktgrenzen]{.underline}](#mvp-und-produktgrenzen) 4

[[03 Verantwortung und Rechte]{.underline}](#verantwortung-und-rechte) 5

[[04 Navigation und
Interaktionsprinzipien]{.underline}](#navigation-und-interaktionsprinzipien)
6

[[05 Screen Inventar]{.underline}](#screen-inventar) 7

[[06 Konkrete User Stories]{.underline}](#konkrete-user-stories) 11

[[07 User Flows]{.underline}](#user-flows) 13

[[08 Funktionale Anforderungen]{.underline}](#funktionale-anforderungen)
15

[[09 Datenlogisches Modell]{.underline}](#datenlogisches-modell) 23

[[10 Moderation und Krisen]{.underline}](#moderation-und-krisen) 26

[[11 Datenschutz und regulatorische
Prüfung]{.underline}](#datenschutz-und-regulatorische-prüfung) 28

[[12 Barrierefreiheit und geringe
Belastung]{.underline}](#barrierefreiheit-und-geringe-belastung) 30

[[13 Nichtfunktionale
Anforderungen]{.underline}](#nichtfunktionale-anforderungen) 31

[[14 Technische Architektur]{.underline}](#technische-architektur) 33

[[15 Analytics und
Erfolgsmessung]{.underline}](#analytics-und-erfolgsmessung) 35

[[16 Qualitätssicherung und
Abnahme]{.underline}](#qualitätssicherung-und-abnahme) 36

[[17 Roadmap und Einführung]{.underline}](#roadmap-und-einführung) 38

[[18 Risiken und offene
Entscheidungen]{.underline}](#risiken-und-offene-entscheidungen) 39

[[19 Quellen und Begriffe]{.underline}](#quellen-und-begriffe) 41

## Verbindlichkeit und Leseschlüssel

**MUSS** bezeichnet eine MVP-Anforderung. **SOLL** bezeichnet ein
begründet abweichbares Ziel; Product Owner und zuständige
Fachverantwortung dokumentieren jede Abweichung. **Später** ist
ausdrücklich kein Teil der MVP-Abnahme. Alle FR-Anforderungen in Kapitel
8 sind MUSS-Anforderungen.

FR = funktionale Anforderung, US = User Story, S = Screen, F = User
Flow, NFR = nichtfunktionale Anforderung, QA = Testfall, D = offene
Entscheidung. Die Verknüpfungen ermöglichen die Rückverfolgung vom
Bedürfnis bis zur Abnahme.

**Fachprüfung Recht**, **Fachprüfung Medizin**, **Fachprüfung
Sicherheit** und **Nutzertest** markieren notwendige Validierungen.
Zahlen zu Nutzung, Kapazität und Servicezeiten sind vorgeschlagene
Produktziele, keine bereits nachgewiesenen Ergebnisse oder gesetzlichen
Fristen.

Die Fassung präzisiert das bestehende Produktkonzept. Neue
Umsetzungsentscheidungen, insbesondere geschlossene
Erwachsenencommunity, Textformate und minimale Datenerhebung, sind in
diesem PRD als MVP-Baseline festgelegt und vor Entwicklungsstart durch
die Produktverantwortung freizugeben. Quellen und Prüfdatum stehen in
Kapitel 19. Änderungen an Schutzgrenzen, Sichtbarkeit, Datenverwendung
oder Zweckbestimmung erfordern eine versionierte Neubewertung.
