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

# 01 Produktauftrag und Erfolg

## Problem und Nutzenversprechen

Menschen mit MS sollen mit wenig Aufwand persönliche Beobachtungen
festhalten, andere Menschen kennenlernen und verlässliche Informationen
sowie Schweizer Hilfsangebote erreichen können. Die Plattform verbindet
diese Aufgaben in einer ruhigen Oberfläche. Sie verspricht weder eine
klinische Verbesserung noch eine vollständige Abdeckung aller
Lebenssituationen.

Die Differenzierung liegt im durchgängigen Einstieg **Mein Moment**. Die
Frage «Was brauchst du gerade?» führt zu höchstens drei freiwilligen
nächsten Schritten: etwas festhalten, Austausch finden oder Wissen und
Hilfe öffnen. Regeln beruhen auf der aktuell gewählten Absicht.
Tagebuchdaten werden im MVP nicht für Community-Vorschläge,
Personenranking oder Werbung verwendet. Die Kombination dieser
Funktionen ist ein zu validierendes Nutzenversprechen, kein belegter
exklusiver Marktanspruch.

## Zielgruppen und Bedürfnisse

  -----------------------------------------------------------------------
  **Gruppe**        **Relevante Aufgabe**       **Konsequenz für das
                                                MVP**
  ----------------- --------------------------- -------------------------
  Neu               Orientierung finden und     Verständlicher Einstieg,
  diagnostizierte   sicher Fragen stellen       Grundlagenartikel,
  Erwachsene                                    moderierte
                                                Kennenlerngruppe

  Erwachsene in     Mit wenig Energie           Kurzer Check-in, direkt
  Beruf und Familie dokumentieren und           erreichbare Funktionen,
                    Unterstützung finden        Themen Beruf und Alltag

  Menschen mit      Selbstbestimmt teilnehmen   Tastatur, Screenreader,
  stärkeren                                     grosse Bedienflächen,
  Einschränkungen                               einfache Ansicht

  Menschen mit      Ohne Druck zurückkehren     Keine Streaks, keine
  unregelmässiger                               Pflichtfelder zum
  Nutzung                                       Verlauf, hilfreiche leere
                                                Zustände
  -----------------------------------------------------------------------

Angehörige und Interessierte nutzen öffentliche Wissen- und Hilfeseiten.
Eigene Angehörigenkonten, Stellvertretung und gemeinsame
Gesundheitsbereiche folgen später. Der MVP-Mitgliederzugang richtet sich
an Personen ab 18 Jahren, die selbst angeben, mit MS zu leben; ein
Diagnosenachweis wird nicht erhoben.

## Ziele und Hypothesen

Z1: Mindestens 80 Prozent der Testpersonen erreichen beim ersten Besuch
eine selbst gewählte Kernaufgabe ohne Hilfe. Z2: Mindestens 80 Prozent
schliessen einen einfachen Check-in innerhalb von 60 Sekunden ab; die
Zeit ist kein Nutzerdruck. Z3: Mindestens 90 Prozent verstehen im Test,
wer ihr Tagebuch und ihre Nachrichten sehen kann. Z4: Mindestens 70
Prozent bewerten nach vier Pilotwochen mindestens ein Modul als
alltagstauglich. Basis: zwei formative Runden mit je 6--8 Personen und
ein Pilot mit 40--60 freiwilligen Personen; keine repräsentative
Wirksamkeitsstudie.

Die Plattform ist im MVP kostenlos. Finanzierung, Trägerschaft und
dauerhafte Moderationskapazität müssen vor dem Pilot geklärt sein.
Datenverkauf, personalisierte Werbung und Forschungsauswertungen sind
ausgeschlossen. Ein späteres Geschäftsmodell benötigt eine gesonderte
Produkt- und Datenschutzentscheidung.

# 02 MVP und Produktgrenzen

Das MVP muss den vollständigen Weg von Registrierung bis sicherer
Nutzung und Kontolöschung abdecken. Moderation, Datenschutzfunktionen,
redaktionelle Prüfung und barrierearme Bedienung sind Teil des
Produktumfangs.

  -------------------------------------------------------------------------
  **Modul**   **Im MVP enthalten**           **Ausserhalb des MVP**
  ----------- ------------------------------ ------------------------------
  Heute       Mein Moment, Schnellzugriffe,  Aufgabenplaner,
              Check-in, letzte eigene        Energieplanung, Ziele und
              Einträge, sichere              automatische Wochenberichte
              Benachrichtigungen             

  Mein MS     Check-in, Symptome, Fatigue,   Medikamente, Termine,
              Notizen, Verlauf mit           klinische Berichte, Wearables,
              Datentabelle, Datenexport      Fragebögen und medizinische
                                             Interpretation

  Community   Chronologischer Feed,          Anonyme Beiträge, Bilder,
              Themenfilter, Textbeiträge,    Dateien, Reaktionen mit
              Antworten, Speichern, betreute Rankings, Mitglied erstellt
              offene und geschlossene        Gruppen
              Gruppen                        

  Gespräche   Kontaktanfrage ohne Freitext,  Gruppenchat, Video, Audio,
              gegenseitige Freigabe, 1 zu 1  Anhänge, Online-Status und
              Textchat, Blockieren und       Lesebestätigungen
              Melden                         

  Wissen      Öffentliche Bibliothek,        KI-Assistent, individuelle
              Themen, Suche, geprüfte        medizinische Antworten und
              Artikel, Kurzfassung, Quellen  Therapieentscheidungen
              und Prüfdaten                  

  Hilfe       Öffentliches Verzeichnis,      Behandlung vermitteln, Termine
              Themen- und Kantonsfilter,     buchen, Live-Krisenberatung
              geprüfte Detailseiten,         
              Sicherheitsseite               

  Betrieb     Redaktion, Rechteverwaltung,   Fachpersonenportal,
              Moderationsfälle, Einspruch,   Versicherungs- und
              Audit, Export und Löschung     Forschungszugänge
  -------------------------------------------------------------------------

## Spätere Ausbaustufen

**Phase 2** umfasst freiwilliges Matching über Interessen und
Gesprächswünsche, bestätigte Peer-Angebote, Events mit
Zugänglichkeitsangaben sowie Angehörigenzugänge. Diagnose-, Symptom-
oder Medikationsdaten werden nicht als automatische Matchingmerkmale
vorgesehen.

**Phase 3** umfasst native iOS und Android Apps, erweiterte
Gesundheitsdokumentation und verifizierte Fachpersonen. Eine
Datenfreigabe an Behandlungsteams, HealthKit, Health Connect,
Medikationsfunktionen und medizinische Analysen sind eigenständige
Vorhaben mit Fachprüfung. Der Export des MVP erzeugt keine automatische
Freigabe.

## Feste Ausschlüsse und Umfangskontrolle

Keine öffentliche Indexierung von Mitgliederprofilen oder
Community-Inhalten, kein Diagnosenachweis, keine genaue Wohnadresse,
keine Standortverfolgung, keine automatischen Krankheitsprognosen. Es
gibt keine Garantie auf Antworten anderer Mitglieder und keine
24-Stunden-Überwachung.

Ein Change Request nennt Nutzen, betroffene FR- und S-IDs, Aufwand,
Schutzfolgen, Tests und Entscheidung. Die Produktverantwortung darf
Komfortfunktionen verschieben; Sicherheits- oder Rechtslücken werden
nicht durch Umbenennung einer Funktion zu «Beta» akzeptiert.

# 03 Verantwortung und Rechte

Die Trägerschaft ist für den Betrieb verantwortlich und benennt vor dem
Pilot einen Product Owner, eine Moderationsleitung, eine medizinische
Redaktionsleitung, eine technische Betriebsleitung und eine
Datenschutzkontaktstelle. Personalunion ist möglich; die erforderlichen
Freigaben bleiben dokumentiert. Medizinische Eigenfreigaben und
eigenständige Bearbeitung eigener Einsprüche sind ausgeschlossen.

  ------------------------------------------------------------------------------
  **Rolle**            **Sichtbare Daten und erlaubte  **Begrenzung**
                       Aktionen**                      
  -------------------- ------------------------------- -------------------------
  Gast                 Öffentliche Artikel,            Keine Mitgliederprofile,
                       Verzeichnis, Regeln und Hilfe   Beiträge, Chats oder
                       lesen                           Gesundheitsdaten

  Mitglied             Eigene private Daten; Community Keine fremden privaten
                       und offene Gruppen; angenommene Daten; geschlossene
                       Chats                           Gruppen erst nach
                                                       Aufnahme

  Gruppenmitglied      Zusätzlich Inhalte eigener      Keine Rechte an anderen
                       geschlossener Gruppen lesen und Gruppen oder fremden
                       schreiben                       Profilfeldern

  Moderation           Community-Inhalte und           Kein Tagebuch; Chat nur
                       Meldungen; Inhalte aus          gemeldete Auswahl mit
                       geschlossenen Gruppen nur im    begrenztem Kontext
                       zugewiesenen Fall               

  Moderationsleitung   Zuweisung, schwere Sanktionen,  Kein allgemeines Lesen
                       Eskalation, unabhängige         von Chats oder
                       Einspruchsprüfung organisieren  Gesundheitsdaten

  Redaktion            Entwürfe für Wissen und         Keine Veröffentlichung
                       Verzeichnis bearbeiten          medizinischer Texte ohne
                                                       Prüfung

  Medizinische Prüfung Zugewiesene Artikelversion      Keine
                       prüfen, freigeben oder          Mitgliedertagebücher und
                       zurückgeben                     keine Behandlung über das
                                                       System

  Administration       Rollen, Gruppen, Konfiguration  Kein pauschales
                       und Kontostatus verwalten       Inhaltsleserecht;
                                                       privilegierter Zugriff
                                                       getrennt

  Technischer Betrieb  Verfügbarkeit, Deployments und  Produktionsdatenzugriff
                       technische Metadaten            nur begründeter, zeitlich
                                                       begrenzter Sonderzugriff

  Datenschutzstelle    Identität prüfen, Auskunft,     Nur erforderliche Daten;
                       Export und Löschung im Auftrag  kein routinemässiges
                       bearbeiten                      Lesen von Inhalten
  ------------------------------------------------------------------------------

## Verbindliche Zugriffsregeln

Rechte entstehen aus Rolle, Eigentum, Gruppenzugehörigkeit,
Kontaktstatus und Kontostatus. Der Server prüft diese bei jedem Lese-
und Schreibzugriff. Versteckte Buttons sind keine Zugriffskontrolle.
Standard ist verweigert; öffentliche Inhalte müssen ausdrücklich
publiziert sein.

Gesundheitsdaten sind ausschliesslich für die betroffene Person
verfügbar. Community-Profil und Tagebuch besitzen getrennte
Datenbereiche. Es gibt im MVP keine Freigabe an Kontakte, Angehörige,
Redaktion oder Fachpersonen. Kontaktdaten wie E-Mail erscheinen nie im
Mitgliederprofil.

Sonderzugriffe benötigen Ticket, Zweck, Umfang, zweite Freigabe und
Ablauf nach höchstens 60 Minuten. Es gibt keine stille Support-Imitation
einer Sitzung. Audit enthält handelnde Person, Anlass, Objekt, Zeit und
Ergebnis, aber keine Nachrichtentexte oder Tagebuchwerte.
Rollenänderungen erfordern MFA und werden protokolliert. Gesperrte
Mitglieder behalten einen sicheren Zugang zu Auskunft, Export, Löschung
und Einspruch.

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

# 05 Screen Inventar

## Öffentlicher Einstieg und Konto

Jeder Eintrag nennt primäre Aktion und eine besondere
Zustandsanforderung. Die gemeinsamen Zustände aus Kapitel 4 gelten
zusätzlich. Die S-IDs sind Grundlage für Designübergabe, Routenregister
und Testinventar.

  -------------------------------------------------------------------------
  **ID und Ansicht**   **Inhalt und Aktion**            **Zugang und
                                                        Referenz**
  -------------------- -------------------------------- -------------------
  S01 Startseite       Nutzen, Grenzen, Wissen öffnen,  Öffentlich · ACC01,
                       registrieren; keine sensiblen    CON01
                       Vorschauen                       

  S02 Registrierung    E-Mail, Passwort,                Gast · ACC01--02
                       Erwachsenenbestätigung,          
                       Bedingungen; Verifikation        
                       auslösen                         

  S03 E-Mail           Token prüfen, erneut senden;     Gast · ACC02
  bestätigen           abgelaufen oder bereits          
                       verwendet                        

  S04 Login            E-Mail und Passwort; neutraler   Gast · ACC03
                       Fehler, Weiterleitung nach Login 

  S05 Passwort         Anfrage und neues Passwort;      Gast · ACC04
  zurücksetzen         neutraler Versandstatus          

  S06 MFA und          Zweiten Faktor bestätigen,       Berechtigte · ACC05
  Wiederherstellung    Recovery nutzen; Pflicht für     
                       Mitarbeitende                    

  S07 Einführung       Pseudonym und freiwilliges       Mitglied · ACC06
                       Nutzungsziel; Datenschutz        
                       erklären, überspringen           

  S08                  Gesonderte Erklärung und         Mitglied · PRI01
  Gesundheitsbereich   ausdrückliche Entscheidung;      
  aktivieren           ablehnen möglich                 

  S09 Eigenes Profil   Pseudonym, optionale Interessen  Mitglied · ACC06
                       und Kanton; Vorschau der         
                       Mitgliedersicht                  

  S10 Sichtbares       Freigegebene Interessen;         Mitglied · COM05,
  Mitgliederprofil     Anfrage, blockieren, melden      MSG01

  S11                  E-Mail ändern, Passwort,         Kontoinhaber ·
  Kontoeinstellungen   Sitzungen, Abmeldung             ACC07--08

  S12 Privatsphäre und Zwecke, Status, Version und      Kontoinhaber ·
  Einwilligungen       Widerruf; Folgen anzeigen        PRI01--02

  S13 Anzeige und      Einfache Ansicht, Schrift und    Alle lokal,
  Bedienung            Bewegung; sofortige Vorschau     Mitglied
                                                        synchronisiert ·
                                                        HOM06

  S14                  Kanal, Themen, Ruhezeit und      Mitglied · MSG07
  Benachrichtigungen   Pause; Test ohne Inhaltsvorschau 
  einstellen                                            

  S15 Daten und Konto  Auskunft, Export,                Kontoinhaber ·
                       Gesundheitsdaten löschen, Konto  PRI03--05
                       löschen                          

  S16 Löschbestätigung Folgen und Fristen, erneute      Kontoinhaber ·
                       Authentifizierung, Beleg         PRI04--05

  S17 Exportstatus     Auftrag, Fortschritt,            Kontoinhaber ·
                       Ablaufzeit, sicherer Download    PRI03
  -------------------------------------------------------------------------

**Navigationsregel** Anmelde-, Verifikations- und
Wiederherstellungsansichten sind auch mit Screenreader vollständig
bedienbar. Auf einem bereits angemeldeten Gerät führt die Registrierung
nicht unbemerkt zu einem zweiten Konto.

**Profilgrenze** Ein Profil enthält im MVP keine strukturierten Angaben
zu Diagnosejahr, Verlauf, Medikamenten oder Symptomen. Freitextbiografie
und Profilbild-Uploads entfallen. Dadurch muss keine komplizierte
Feldfreigabe verstanden werden; das Pseudonym und ausgewählte Interessen
sind innerhalb der Community sichtbar. Kanton ist optional und vor
Speicherung ausdrücklich als sichtbar bezeichnet.

## Persönlicher Bereich und Gesundheitsdokumentation

  --------------------------------------------------------------------------------
  **ID und Ansicht**          **Inhalt und Aktion**            **Zugang und
                                                               Referenz**
  --------------------------- -------------------------------- -------------------
  S18 Dashboard Heute         Mein Moment, Schnellzugriffe,    Mitglied ·
                              letzte eigene Einträge; ohne     HOM01--03
                              Daten voll nutzbar               

  S19 Mein Moment Auswahl     Absicht wählen, höchstens drei   Mitglied · HOM02
                              Ziele, Auswahl zurücksetzen      

  S20 Tages Check-in          Energie, Stimmung, optionale     Inhaber mit
                              Fatigue; speichern oder          Aktivierung ·
                              überspringen                     DIA01--02

  S21 Mein MS Übersicht       Neueintrag, eigener Kalender, 7  Inhaber · DIA03--06
                              oder 30 Tage, Datentabelle       

  S22 Neuer Tagebucheintrag   Datum, Symptome, Stärke,         Inhaber · DIA03--04
                              optionale Dauer und Notiz        

  S23 Eintrag ansehen und     Eigene Werte, ändern, löschen;   Inhaber · DIA04--05
  ändern                      Versionskonflikt erklären        

  S24 Fatigue Eintrag         Subjektive Skala, optional       Inhaber · DIA03
                              Schlaf und Beobachtungen         

  S25 Verlauf und             Einzelwerte mit Lücken, Datum    Inhaber · DIA06--07
  Datentabelle                und Einheit; Zeitraum wählen     

  S26 Eintrag löschen         Umfang, Bestätigung, sichtbares  Inhaber · DIA05
                              Ergebnis; keine verdeckte        
                              Wiederherstellung                

  S27 Gespeicherte Inhalte    Private Merkliste für Beiträge,  Mitglied · HOM04
                              Artikel, Hilfsangebote; nicht    
                              mehr verfügbare Einträge neutral 

  S28                         Neutrale Hinweise, lesen,        Mitglied ·
  Benachrichtigungszentrale   einzeln oder alle als gelesen    MSG07--08
                              markieren                        
  --------------------------------------------------------------------------------

## Besondere Formularzustände

Check-in und Tagebuch erklären jede Skala mit Text. Symbole sind
ergänzend. Ein Wert von null ist ein gültiger Wert; fehlende Angaben
erscheinen als «nicht erfasst». Pflichtangaben werden nicht durch Farbe
allein erkennbar. Freitext hat einen sichtbaren Zeichenzähler und kann
vor dem Speichern entfernt werden.

Bei einem zweiten Check-in am gleichen lokalen Tag wird der vorhandene
Eintrag angeboten. Es entsteht kein stilles Duplikat. Ein separater
Tagebucheintrag am selben Tag bleibt möglich. Bei zwei Geräten mit
unterschiedlichen Bearbeitungen muss die Person eine Version wählen;
eine neuere Änderung wird nicht unbemerkt überschrieben.

Die erste Nutzung von Mein MS zeigt zunächst S08. Nach Ablehnung stehen
Community, Wissen und Hilfe weiter zur Verfügung. Das Dashboard zeigt
dann keine fehlenden Gesundheitsaufgaben. Nach einem Widerruf bleibt der
Zugang zu Datenexport und Löschung erhalten; neue Gesundheitseinträge
sind gesperrt.

**Kein Übertragen in die Community** Auf den persönlichen
Gesundheitsansichten existiert im MVP keine «Teilen»-Aktion. Eine selbst
geschriebene Community-Mitteilung ist eine neue, bewusste
Veröffentlichung und erhält einen Hinweis, keine identifizierenden
Gesundheitsunterlagen einzustellen. Die Plattform stellt keinen
Zusammenhang zwischen Beitrag und Tagebuch her.

## Community und Gespräche

  -----------------------------------------------------------------------
  **ID und Ansicht** **Inhalt und Aktion**            **Zugang und
                                                      Referenz**
  ------------------ -------------------------------- -------------------
  S29 Community Feed Chronologisch, Thema wählen,     Mitglied · COM01
                     Beitrag öffnen; endliche Seiten  
                     mit «Mehr laden»                 

  S30 Beitrag        Thema und Text, Zielbereich,     Mitglied · COM02
  erstellen          Sichtbarkeit, Vorschau,          
                     publizieren                      

  S31 Beitrag und    Text, Antworten, speichern,      Berechtigte ·
  Antworten          eigene Änderung, melden und      COM02--04
                     blockieren                       

  S32 Beitrag        Zielgruppe unveränderbar,        Autor · COM03
  bearbeiten oder    Änderungshinweis; Löschfolgen    
  löschen            bestätigen                       

  S33 Gruppen        Offene und auffindbare           Mitglied · COM06
  entdecken          geschlossene Gruppen, Thema,     
                     Regeln                           

  S34 Gruppendetail  Beschreibung, Zugangstyp,        Mitglied ·
                     Regeln, beitreten oder Aufnahme  COM06--07
                     anfragen                         

  S35 Gruppenraum    Nur berechtigte Inhalte, Beitrag Gruppenmitglied ·
                     erstellen, Gruppe verlassen      COM07--08

  S36 Meine Gruppen  Mitgliedschaft, ausstehende      Mitglied · COM08
  und Anfragen       Aufnahme, zurückziehen,          
                     verlassen                        

  S37 Kontakte und   Eingehend, ausgehend, bestehend; Mitglied ·
  Anfragen           annehmen, ablehnen, zurückziehen MSG01--02

  S38 Kontaktanfrage Profil, Zweck und Grenzen,       Mitglied · MSG01
  bestätigen         Freigabe; ohne Nachrichtentext   

  S39 Gesprächsliste Freigegebene Kontakte, neutrale  Beteiligte ·
                     neue Nachricht, geschlossenes    MSG03--04
                     Gespräch                         

  S40 Einzelgespräch Text senden, Zustellstatus,      Beteiligte ·
                     Kontakt beenden, melden,         MSG03--06
                     blockieren                       

  S41 Blockieren und Folgen, Bestätigung, aufheben;   Mitglied · SAF01
  Blockierliste      keine neue Freigabe nach         
                     Aufheben                         

  S42 Inhalt melden  Grund, optionale Erläuterung,    Mitglied · SAF02
                     ausgewählte Belege, Belegnummer  

  S43 Meine          Eigener Status, Entscheidung,    Betroffene · SAF05
  Meldungen und      Einspruch; keine Identität       
  Einspruch          Meldender                        
  -----------------------------------------------------------------------

**Sichtbarkeit vor Veröffentlichung** S30 nennt die Zielgruppe
ausdrücklich: «Mitglieder der Plattform» oder «Mitglieder dieser
geschlossenen Gruppe». Ein Zielgruppenwechsel eines bestehenden Beitrags
ist ausgeschlossen. Wer später öffentlich teilen will, muss einen neuen
Text erstellen. Geschlossene Gruppen haben keine Vorschautexte,
Mitgliederlisten oder Aktivitätszahlen für Aussenstehende.

**Nachrichtenfreigabe** Ausstehende Kontaktanfragen enthalten weder
Freitext noch Links. Der sendenden Person wird nur «ausstehend» oder
«nicht aktiv» angezeigt; eine explizite Ablehnung wird nicht
offengelegt. Blockieren und Kontaktentzug wirken auch in geöffneten
Ansichten vor dem nächsten Sendeversuch. Nachrichteninhalte gehören
nicht in Browser- oder E-Mail-Vorschauen.

## Wissen Hilfe und Betriebsoberflächen

  ----------------------------------------------------------------------------
  **ID und Ansicht**      **Inhalt und Aktion**            **Zugang und
                                                           Referenz**
  ----------------------- -------------------------------- -------------------
  S44 Wissen Übersicht    Themen, Kurzbeschreibungen,      Öffentlich · CON01
                          Suche, verständlicher Einstieg   

  S45 Suchergebnisse      Getrennte Bereiche Wissen,       Gemäss Bereich ·
                          Hilfe, Community und Mitglieder; CON07
                          Filter und Leerzustand           

  S46 Wissensartikel      Kurzfassung, Volltext, Autor,    Öffentlich ·
                          Prüfung, Quellen, Datum,         CON01--03
                          speichern                        

  S47 Hilfe Übersicht     Thema und Kanton wählen; keine   Öffentlich · CON04
                          Standortfreigabe nötig           

  S48                     Zuständigkeit, Sprache,          Öffentlich ·
  Unterstützungsangebot   Kostenhinweis, Zugang, geprüfter CON04--05
                          externer Link                    

  S49 Sicherheit und      Grenzen der Plattform, fachlich  Öffentlich · SAF06
  akute Hilfe             freigegebene lokale Hilfewege    

  S50 Regeln und          Community-Regeln, Impressum,     Öffentlich · PRI01,
  rechtliche Seiten       Bedingungen, Datenschutz,        SAF07
                          Kontakt                          

  S51 Kontakt und Fehler  Produktanliegen; Hinweis keine   Öffentlich · CON06
  melden                  medizinischen Unterlagen zu      
                          senden                           

  S52                     Zugewiesene Fälle, Priorität,    Moderation · SAF03
  Moderationsübersicht    Frist, nicht bearbeitete         
                          Eskalation                       

  S53 Moderationsfall     Belege, Aktionen, Begründung,    Zugewiesene Rollen
                          Eskalation und Entscheidung      · SAF03--05

  S54                     Kontostatus, Sanktionen,         Berechtigte
  Mitgliederverwaltung    begrenzte Suche,                 Mitarbeitende ·
                          Einspruchszuordnung              ACC08, SAF04

  S55 Gruppenverwaltung   Typ, Auffindbarkeit, Regeln,     Administration ·
                          Aufnahmeanfragen, Archivierung   COM06--08

  S56 Redaktion und       Artikelversionen, Prüfauftrag,   Redaktion und
  Prüfung                 Rückgabe, Freigabe, Publikation  Prüfung · CON02--03

  S57                     Angebote prüfen, Änderungsflag,  Redaktion · CON05
  Verzeichnisverwaltung   Ablaufdatum, Publikation         

  S58 Datenschutzaufträge Identitätsprüfung, Export,       Datenschutzstelle ·
                          Löschung, Fristen und Ausnahmen  PRI03--06

  S59 Audit und Rollen    Rollenänderung,                  Berechtigte
                          Zugriffsprotokoll,               Mitarbeitende ·
                          Sonderzugriff, MFA               PRI07--08

  S60 Betrieb und         Feature-Schalter,                Betrieb · HOM08,
  Konfiguration           Zustellprobleme, technische      MSG08
                          Statusanzeigen                   

  S61 Zugriff und         Sitzung abgelaufen, neutraler    Alle · ACC03,
  Betriebsfehler          404, Wartung, Offline-Rückweg    HOM07--08
  ----------------------------------------------------------------------------

Verwaltungsansichten müssen ebenfalls tastatur- und
screenreaderbedienbar sein. Mitarbeitende sehen nur ihre
Aufgabenbereiche. Ein gemeinsamer Administrationslogin ist verboten. S52
bis S60 werden über einen separaten geschützten Bereich mit
verpflichtender MFA angeboten.

Das Screen-Inventar ist für das MVP vollständig. Folgende spätere
Screenfamilien sind reserviert, aber nicht spezifiziert: Matching,
Events, Angehörigenzugang, Fachpersonenportal, Medikamentenverwaltung,
Gesundheitsdatenfreigabe und native Systemeinstellungen. Ihre Gestaltung
beginnt erst nach eigener Umfangsfreigabe.

# 06 Konkrete User Stories

## Einstieg und persönlicher Nutzen

Die Stories beschreiben nutzbare Ergebnisse. Die verknüpften
Anforderungen enthalten die verbindlichen Detailregeln; Abnahme erfolgt
zusätzlich anhand der Szenarien in Kapitel 16.

  ------------------------------------------------------------------------
  **ID und User Story**     **Konkretes                  **Umsetzung**
                            Akzeptanzkriterium**         
  ------------------------- ---------------------------- -----------------
  US01 Als neue Person      Nach bestätigter E-Mail,     ACC01--06 ·
  möchte ich ohne           Erwachsenenbestätigung und   S02--08
  Diagnosenachweis starten  Bedingungen nutzbar; keine   
                            Diagnoseunterlage verlangt   

  US02 Als Person mit wenig Ohne Check-in sind alle drei HOM01--03 ·
  Energie möchte ich sofort Mein-Moment-Wege und fünf    S18--19
  wählen, was ich brauche   Hauptbereiche erreichbar     

  US03 Als Mitglied möchte  Überspringen erzeugt keinen  DIA01--02 · S20
  ich meinen Check-in       Datensatz, keine Warnung und 
  überspringen              keine negative Darstellung   

  US04 Als Mitglied möchte  Ein gültiger Wert wird nach  DIA01--02 · S20
  ich meine heutige Energie Bestätigung genau einmal dem 
  festhalten                lokalen Tag zugeordnet       

  US05 Als Mitglied möchte  Datum, Bezeichnung und       DIA03--04 ·
  ich ein Symptom mit       Stärke sind gespeichert;     S22--23
  Stärke dokumentieren      optionale Felder dürfen      
                            fehlen                       

  US06 Als Mitglied möchte  Beide Werte bleiben          DIA03, DIA06--07
  ich Fatigue getrennt von  unterscheidbar und haben     · S24--25
  Energie erfassen          beschriftete Skalen          

  US07 Als Mitglied möchte  Geänderter Wert erscheint im DIA04--05 · S23
  ich einen Fehler          Verlauf; bei                 
  korrigieren               Paralleländerung erfolgt     
                            kein stilles Überschreiben   

  US08 Als                  Jeder dargestellte Punkt ist DIA06--07 · S25
  Screenreader-Nutzer       mit Datum und Wert in einer  
  möchte ich meinen Verlauf gleichwertigen Tabelle       
  verstehen                 verfügbar                    

  US09 Als Mitglied möchte  Nach erneuter Anmeldung      PRI03 · S15, S17
  ich meine Daten mitnehmen erhalte ich nur meine Daten  
                            als JSON und Tagebuch-CSV    

  US10 Als Mitglied möchte  Ablehnen der Aktivierung     PRI01--02 · S08,
  ich Gesundheitsdaten      lässt Wissen, Hilfe,         S12
  nicht erfassen            Community und Gespräche      
                            nutzbar                      

  US11 Als Mitglied möchte  Gespeicherte Einträge sind   HOM04 · S27
  ich später an Hilfreiches privat und nach Bereich      
  anknüpfen                 filterbar; gelöschte Inhalte 
                            werden nicht angezeigt       

  US12 Als Mitglied möchte  Die Profilvorschau zeigt     ACC06, PRI01 ·
  ich meine Privatsphäre    dieselben freigegebenen      S09--10
  einschätzen               Felder wie die Sicht eines   
                            anderen Mitglieds            
  ------------------------------------------------------------------------

**Priorität** Alle zwölf Stories sind MVP-kritisch. Kleine Varianten der
Darstellung dürfen geändert werden, sofern die Akzeptanzkriterien und
Barrierefreiheitsanforderungen erhalten bleiben. Bei Usability-Tests
dürfen Testpersonen keine echten Gesundheitsdaten eingeben müssen;
vorbereitete fiktive Datensätze genügen.

## Austausch Wissen und Selbstbestimmung

  ------------------------------------------------------------------------
  **ID und User Story**     **Konkretes                  **Umsetzung**
                            Akzeptanzkriterium**         
  ------------------------- ---------------------------- -----------------
  US13 Als Mitglied möchte  Beitrag ist nur für          COM01--04 ·
  ich in einem geschützten  berechtigte Mitglieder       S29--32
  Umfeld fragen             sichtbar und enthält einen   
                            Meldeweg                     

  US14 Als Mitglied möchte  Inhalte bleiben vor Annahme  COM06--08 ·
  ich einer geschlossenen   verborgen; Rücknahme und     S33--36
  Gruppe beitreten          Austritt wirken sofort       

  US15 Als Mitglied möchte  Vor aktiver Kontaktfreigabe  MSG01--04 ·
  ich nur mit Zustimmung    ist kein Nachrichtentext     S37--40
  Nachrichten erhalten      zustellbar, auch nicht       
                            direkt über Schnittstellen   

  US16 Als Mitglied möchte  Nach Entzug sind neue        MSG04, SAF01 ·
  ich einen Kontakt beenden Nachrichten gesperrt;        S40--41
                            erneuter Kontakt benötigt    
                            neue beidseitige Freigabe    

  US17 Als belästigte       Blockierung beendet Kontakt  SAF01--02 ·
  Person möchte ich sofort  und verhindert neue          S41--42
  Abstand herstellen        Anfragen; Meldung ist        
                            unabhängig möglich           

  US18 Als meldende Person  Ich erhalte eine Belegnummer SAF02--05 · S43
  möchte ich den            und Status; die Gegenseite   
  Bearbeitungsstand sehen   erfährt meine Identität      
                            nicht                        

  US19 Als Moderation       Nur zugewiesene Belege       SAF03--04, PRI07
  möchte ich einen Vorfall  sichtbar; Aktion braucht     · S52--54
  verhältnismässig          Grund und protokollierten    
  bearbeiten                Entscheid                    

  US20 Als sanktionierte    Einspruch ist trotz          SAF05, ACC08 ·
  Person möchte ich eine    Community-Sperre möglich und S43
  Überprüfung               wird unabhängig zugeteilt    

  US21 Als wissensuchende   Artikel nennt Autor,         CON01--03 ·
  Person möchte ich         fachlich verantwortliche     S44--46
  geprüfte Informationen    Prüfung, Datum und Quellen   
  erkennen                                               

  US22 Als hilfesuchende    Thema und Kanton filtern     CON04--05 ·
  Person möchte ich         ohne Standortzugriff; Detail S47--48
  Schweizer Angebote finden nennt Zuständigkeit und      
                            Prüftermin                   

  US23 Als Mitglied möchte  Gewählte Mitteilungen werden MSG07--08 · S14,
  ich Ruhezeiten einrichten pausiert; notwendige         S28
                            Kontosicherheitsmeldungen    
                            bleiben getrennt             

  US24 Als Mitglied möchte  Nach erneuter Anmeldung      PRI04--06 ·
  ich mein Konto            sofortige Deaktivierung;     S15--16
  vollständig verlassen     planmässige Löschung mit     
                            nachvollziehbarem Beleg      

  US25 Als Redaktion möchte Medizinische Änderung ist    CON02--03 · S56
  ich fehlerhafte Inhalte   vor Neuveröffentlichung      
  korrigieren               fachlich geprüft; alte       
                            Freigabe gilt nicht          
                            automatisch                  

  US26 Als Betrieb möchte   Ein defekter Chat kann       HOM08, NFR16--20
  ich Störungen erkennen    abgeschaltet werden, während · S60--61
  und begrenzen             öffentliche Hilfe erreichbar 
                            bleibt                       
  ------------------------------------------------------------------------

Damit decken die Stories sowohl Mitgliederfunktionen als auch die für
den sicheren Betrieb erforderlichen Arbeitsabläufe ab. Sie sind keine
Erlaubnis, persönliche Gesundheitsdaten zu Moderations-, Analyse- oder
Supportzwecken zusammenzuführen.

# 07 User Flows

## F01 Registrierung und erster Nutzen

**Start** S01 oder geschützter Deep Link. S02 erfasst E-Mail, Passwort
und die Bestätigung «Ich bin mindestens 18 Jahre alt und lebe mit MS»;
Bedingungen werden aktiv akzeptiert, Datenschutzinformation ist
erreichbar. S03 bestätigt die E-Mail. S07 legt das Pseudonym an;
Interessen und Ziel sind überspringbar. S08 wird nur beim ersten Öffnen
des Gesundheitsbereichs gezeigt. Das Ende ist S18 oder das berechtigte
ursprüngliche Ziel.

**Abzweigungen** Unter 18 oder keine bestätigte
Zielgruppenzugehörigkeit: kein Mitgliederkonto, Wissen und Hilfe bleiben
erreichbar. Doppelte E-Mail: neutrale Rückmeldung und Login-/Resetweg,
ohne Kontoexistenz offenzulegen. Abgelaufener Token: erneuter Versand,
Drosselung und erneute Bestätigung. Abbruch vor Verifikation: Datensatz
nach Frist entfernen. Einwilligung abgelehnt: kein Gesundheitsbereich,
sonst unveränderter Mitgliedernutzen.

**Ergebnis** Ein verifiziertes, aktives Konto und ein sparsames Profil.
Es wurde kein Gesundheitseintrag ohne gesonderte Aktion erstellt.
Verantwortliche FR: ACC01--06, PRI01.

## F02 Check-in und Tagebuch

**Start** S18 → S20. Nach ggf. S08 wählt die Person mindestens einen
Wert für Energie, Stimmung oder Fatigue. Datum und Zeitzone sind
sichtbar. Optional wird eine Notiz ergänzt. Speichern → Validierung →
Serverbestätigung → S18 mit knapper Bestätigung. «Überspringen» kehrt
ohne Datensatz zurück.

S21 → S22 oder S24 eröffnet einen separaten Tagebucheintrag.
Symptomkatalog oder eigene Bezeichnung, Zeitpunkt, Stärke und optionale
Dauer werden erfasst. S23 ermöglicht Korrektur und S26 die Löschung. S25
zeigt den Verlauf; Lücken bleiben Lücken. Export erfolgt unabhängig über
S15 → S17.

**Abzweigungen** Bereits vorhandener Tages-Check-in: Bearbeitung
anbieten. Ungültiger Wert oder Zukunftszeitpunkt: Feldfehler, Eingaben
bleiben erhalten. Netzabbruch: «Noch nicht gespeichert», Wiederholung
mit derselben Vorgangskennung. Versionskonflikt: aktuelle Version zeigen
und bewusste Neuspeicherung verlangen. Sitzung abgelaufen: erneute
Anmeldung, keine Hintergrundspeicherung.

**Ergebnis** Ein explizit gespeicherter eigener Eintrag. Keine
Interpretation als Schub, Verschlechterung oder Therapieeffekt.
Verantwortliche FR: HOM01--03, DIA01--08.

## F03 Wissen und Unterstützung

**Start** Öffentlich oder aus Mein Moment → S44/S47 → Thema oder
Suchbegriff → S45 → S46/S48. Ein Artikel nennt Prüfung und Quellen; ein
Angebot nennt Zuständigkeit, Zugang und Link. «Speichern» fordert bei
Gästen den Login an, Lesen bleibt ohne Konto möglich.

**Abzweigungen** Keine Treffer: Filter zurücksetzen und breiteres Thema
anbieten. Angebot abgelaufen: Kontaktdaten ausblenden, Alternativen
zeigen. Fehler melden → S51 mit Referenz zum Inhalt, ohne sensible
vorausgefüllte Daten. Externer Link: als solcher erkennbar; kein
automatisches Senden von Tagebuch- oder Profildaten. Verantwortliche FR:
CON01--08.

## F04 Community und geschlossene Gruppen

S29 → Thema → S30 → Zielgruppe prüfen → publizieren → S31. Antworten
sind eine Ebene tief. Zum Beitritt S33 → S34 → Regeln akzeptieren.
Offene Gruppe: sofortige Mitgliedschaft. Geschlossene Gruppe: Anfrage
ohne Freitext → autorisierte Entscheidung in S55 → In-App-Hinweis → S35.
Ein Austritt beendet den Zugriff sofort. Eigene verbleibende
Gruppenbeiträge können über eine Verwaltungsansicht ohne fremde
Gruppeninhalte gelöscht werden; das Verlassen löscht Beiträge nicht
automatisch.

**Ausnahmen** Abgewiesene oder zurückgezogene Anfragen schaffen keinen
Zugriff. Wird ein Inhalt während des Lesens entfernt oder eine
Mitgliedschaft entzogen, zeigen Folgeabrufe keine Inhalte mehr.
Bearbeitung eines Beitrags ändert nicht seine Zielgruppe. Blockierte
Mitglieder werden im Feed ausgeblendet; in gemeinsamen Diskussionen
steht höchstens ein neutraler Platzhalter. Verantwortliche FR:
COM01--08, SAF01.

## F05 Gegenseitige Freigabe und Chat

S10 → S38 → Anfrage senden. Der sendende Teil stimmt damit einem Kontakt
zu. Empfangende Person prüft S37 und nimmt an oder lehnt ab. Erst die
Annahme setzt den Kontakt atomar auf aktiv und öffnet S40. Jede
Nachricht prüft Kontakt, Blockierung und Kontostatus erneut. S40 bietet
Kontakt beenden, blockieren und melden direkt an.

**Ausnahmen** Gleichzeitige Anfragen erzeugen einen gemeinsamen
ausstehenden Vorgang, keine automatische Freigabe; die zweite Person
bestätigt bewusst. Ablehnung, Ablauf nach 14 Tagen oder Rücknahme: kein
Chat. Nach Ablehnung oder Rücknahme neue Anfrage frühestens nach 30
Tagen; blockierte Kontakte bleiben dauerhaft gesperrt, bis die
Blockierung aufgehoben wird. Alte Chatverläufe bleiben bei einfachem
Kontaktentzug lesbar, neue Nachrichten sind gesperrt. Blockieren blendet
den Chat aus; er bleibt für eigene Meldung und Datenexport zugänglich.
Verantwortliche FR: MSG01--06, SAF01.

## F06 Melden und Überprüfen

S31 oder S40 → S42 → Grund und Belege → Bestätigung mit Fallnummer →
S43. Bei Chatmeldungen wählt die Person bis zu zehn bereits für sie
sichtbare Nachrichten; ein automatischer Zugriff auf den Rest des Chats
erfolgt nicht. Moderation prüft S53, begründet Massnahmen, informiert
Betroffene soweit sicher und ermöglicht Einspruch. Ein anderer
zuständiger Mitarbeitender prüft den Einspruch. Dringende Gefahren
werden nach Kapitel 10 eskaliert. Verantwortliche FR: SAF02--08.

## F07 Widerruf Export und Löschen

S12 → Folgen erklären → Widerruf bestätigen → Gesundheitsbereich
schreibgeschützt, Export und Löschung bleiben möglich. S15 → erneute
Authentifizierung → S17 → zeitlich begrenzter Download. S15 → S16 →
erneute Authentifizierung → Konto sofort deaktivieren, Sitzungen und
Kontakte entziehen, Inhalte ausblenden → Löschauftrag → Abschlussbeleg.
Fehler und zulässige Ausnahmen werden durch Datenschutzstelle
nachvollziehbar behandelt. Verantwortliche FR: PRI01--08.

# 08 Funktionale Anforderungen

## Konto und Zugang

**ACC01 Registrierung und Berechtigung** S02 MUSS E-Mail, Passwort,
Erwachsenen- und Zielgruppenbestätigung sowie eine aktive Zustimmung zu
versionierten Bedingungen erheben. Keine Geburtsdaten oder
Diagnosedokumente. Abnahme: Ohne erforderliche Bestätigungen entsteht
kein aktives Konto; öffentliche Hilfe bleibt zugänglich. Abhängigkeit:
Datenschutz- und Bedingungstexte fachlich freigegeben.

**ACC02 Verifikation** E-Mail MUSS vor Community-, Chat- oder
Gesundheitsschreibzugriff bestätigt sein. Verifiziert wird nur die
E-Mail, weder Diagnose noch Identität. Einmalige Token gelten 24
Stunden; erneuter Versand höchstens dreimal pro Stunde je Adresse.
Abnahme: Abgelaufene und wiederverwendete Token scheitern; unbestätigte
Konten werden nach sieben Tagen gelöscht. Rückmeldungen vermeiden
Kontoaufzählung.

**ACC03 Login und Sitzung** Sichere Anmeldung MUSS nach Verifikation den
ursprünglichen berechtigten Zielpfad öffnen. Mitglieder-Sitzungen enden
spätestens nach 12 Stunden, nach 60 Minuten Inaktivität erfolgt
Abmeldung mit Vorwarnung. Abnahme: Abgelaufene Sitzungen greifen auf
keine geschützte Schnittstelle zu; Abmelden widerruft die Sitzung
serverseitig.

**ACC04 Passwort und Wiederherstellung** Passwörter MÜSSEN mindestens 15
Zeichen verlangen und mindestens 64 Zeichen unterstützen; Einfügen und
Passwortmanager sind möglich. Kompromittierte häufige Passwörter werden
abgewiesen. Reset-Token gelten 30 Minuten, sind einmalig und widerrufen
beim Erfolg alle Sitzungen. Abnahme: Identische neutrale Antwort
unabhängig von Kontoexistenz; Drosselung nach Fehlversuchen.

**ACC05 MFA für Mitarbeitende** Alle privilegierten Rollen MÜSSEN einen
zweiten Faktor und kontrollierte Wiederherstellung nutzen. Mitglieder
erhalten optional TOTP. Abnahme: Ohne bestätigte MFA ist kein
Verwaltungszugriff möglich; Recovery-Codes sind einmalig. Verlust des
Faktors führt über geprüften Supportprozess, nie allein über eine
Profilangabe.

**ACC06 Sparsames Profil und Onboarding** Pseudonym ist 2--40 Zeichen
lang und änderbar. Interessen aus kontrollierter Liste und Kanton sind
optional. Sichtbarkeit wird vor Speicherung erklärt; keine Biografie
oder Bilddatei im MVP. Abnahme: Onboarding lässt sich ohne optionale
Angaben abschliessen; S09-Vorschau entspricht S10. Namen dürfen keine
verifizierte Fachrolle vortäuschen.

**ACC07 Kontoverwaltung** E-Mail- und Passwortänderung MÜSSEN erneute
Authentifizierung erfordern. Neue E-Mail muss vor Austausch bestätigt
werden; alte Adresse erhält einen neutralen Sicherheitshinweis.
Sitzungen werden mit Gerätetyp und letzter Nutzung angezeigt und einzeln
widerrufen. Abnahme: Widerruf greift beim nächsten Zugriff, spätestens
nach 60 Sekunden.

**ACC08 Status und getrennte Rechte** Konto MUSS die Zustände
unbestätigt, aktiv, eingeschränkt, gesperrt, Löschung ausstehend und
gelöscht abbilden. Community-Sanktionen entziehen keine
Datenschutzrechte. Abnahme: Rechteprüfung gilt für Direktlinks,
Schnittstellen und Hintergrundaufträge; Rollenwechsel wird protokolliert
und bestehende Berechtigungscaches werden invalidiert.

## Dashboard und persönliche Bedienung

**HOM01 Dashboard ohne Pflichtdaten** S18 MUSS bei jeder Anmeldung
sofort nutzbare Zugänge zu allen fünf Hauptbereichen zeigen. Letzte
eigene Einträge erscheinen nur bei aktiviertem Gesundheitsbereich.
Abnahme: Ein Konto ohne Eintrag sieht keine unvollständigen
Gesundheitsaufgaben, Warnpunkte oder Trackingaufforderung als
Zugangssperre.

**HOM02 Mein Moment** Die drei Absichten aus Kapitel 4 MÜSSEN über eine
versionierte redaktionelle Regelkonfiguration höchstens drei gültige
Ziele liefern. Die Auswahl wird nicht als Gesundheitsprofil gespeichert.
Abnahme: Regeln funktionieren ohne Tagebuch, Profilanalyse oder
Matching; deaktivierte Ziele werden nicht angezeigt. Die Auswahl ist
jederzeit zurücksetzbar.

**HOM03 Schnellzugriff und Rückkehr** Check-in, Neueintrag, Gruppen
sowie Wissen und Hilfe MÜSSEN vom Dashboard mit höchstens zwei
Aktivierungen erreichbar sein, sofern die initiale Aktivierung bereits
erfolgt ist. Abnahme: Geschützter Deep Link führt nach Login zum
berechtigten Ziel; ungültige Ziele erhalten einen neutralen Rückweg.

**HOM04 Private Merkliste** Mitglieder MÜSSEN zugängliche Artikel,
Beiträge und Hilfsangebote speichern und entfernen können. Abnahme:
Andere Mitglieder sehen keine Merkliste. Ein entfernter oder inzwischen
unberechtigter Inhalt liefert weder Titel noch Vorschautext; der private
Verweis lässt sich weiterhin entfernen. Es gibt keine öffentlich
sichtbaren Speicherzahlen.

**HOM05 Druckfreie Nutzung** Die Oberfläche MUSS auf Streaks,
Gesundheitsrankings, verpflichtende Tagesziele und automatische
Teilnahmeerinnerungen verzichten. Abnahme: Nach 30 Tagen Inaktivität
erfolgt kein reaktivierendes Tracking-Mailing; die Rückkehr zeigt
neutrale Zugänge. Nur ausdrücklich abonnierte Hinweise werden versendet.

**HOM06 Anzeigepräferenzen** Einfache Ansicht, reduzierte Bewegung und
Schriftvergrösserung MÜSSEN erreichbar sein. Betriebssystempräferenzen
werden als Ausgangspunkt respektiert. Abnahme: Einstellungen bleiben für
Mitglieder geräteübergreifend erhalten; Gäste benötigen kein Konto.
Vergrösserung versteckt keine Hauptaktion und kein Meldewerkzeug.

**HOM07 Verlässliche Rückmeldungen** Jede schreibende Aktion MUSS Lade-,
Fehler- und bestätigten Erfolgszustand unterscheiden. Abnahme: Bei
Netzabbruch erscheint keine Erfolgsmeldung, erneutes Senden erzeugt kein
Duplikat, Pflichtfeldfehler werden mit Feld und verständlicher Erklärung
verbunden. Sensible Formulardaten landen nicht in URL, Telemetrie oder
Browser-Dauerspeicher.

**HOM08 Kontrollierter Teilbetrieb** Betrieb MUSS Community-Schreiben,
Chat und Gesundheits-Schreiben einzeln abschalten können. Abnahme:
Geschaltete Sperren gelten serverseitig, bestehende Daten werden nicht
gelöscht, S61 erklärt Einschränkungen. Öffentliche Sicherheitsseiten und
Hilfe bleiben nach Möglichkeit unabhängig erreichbar; keine Aktion wird
nur scheinbar angenommen.

## Check-in und Tagebuch

**DIA01 Freiwilliger Check-in** Ein Check-in MUSS mindestens eine
bewusst gewählte Angabe enthalten: Energie 0--10, Stimmung 1--5 oder
Fatigue 0--10. Alle Skalen sind textlich erklärt, ohne voreingestellten
Wert. Abnahme: Überspringen speichert nichts; null bleibt von «nicht
erfasst» unterscheidbar. Skalentexte benötigen Fachprüfung Medizin und
Nutzertest.

**DIA02 Tag und Wiederholung** Es MUSS genau einen Check-in pro Mitglied
und lokalem Datum geben. Datum und Zeitzone werden gemeinsam
gespeichert. Nachträgliche Erfassung ist bis 365 Tage rückwirkend
möglich; Zukunftsdaten sind ausgeschlossen. Abnahme: Zwei gleichzeitige
Neuanlagen erzeugen einen Datensatz; die zweite Aktion bietet
Bearbeitung an. Zeitzonenwechsel verschiebt frühere Tageszuordnungen
nicht.

**DIA03 Tagebucheintrag** Pro Tag sind mehrere Einträge möglich.
Erforderlich sind Zeitpunkt und mindestens ein Symptom mit Stärke oder
ein Fatigue-Wert. Ein kuratierter Symptomkatalog und eigene
Bezeichnungen bis 80 Zeichen sind verfügbar; Notiz bis 2 000 Zeichen,
Dauer optional in Minuten bis 10 080. Abnahme: Grenzen serverseitig
geprüft, keine automatische medizinische Klassifikation.

**DIA04 Bearbeitung und Konflikte** Nur der Inhaber MUSS lesen und
ändern können. Aktualisierung benötigt die gelesene Versionsnummer.
Abnahme: Veraltete Version führt zu einem verständlichen Konflikt und
erhält die neuere Änderung; unbekannte fremde IDs liefern keinen
Dateninhalt. Änderungen korrigieren den bestehenden Eintrag und erzeugen
keine neue Verlaufsmessung.

**DIA05 Löschen und Katalogpflege** Einzelne Einträge und eigene
Symptombezeichnungen MÜSSEN entfernbar sein. Das Löschen eines Symptoms
aus der Auswahlliste verändert frühere Einträge nicht. Abnahme:
Gelöschte Einträge sind sofort nicht mehr abrufbar und werden binnen 30
Tagen aus aktiven Systemen entfernt; Sicherungen folgen Kapitel 11.
Keine versteckte Papierkorbanzeige.

**DIA06 Verlauf** Für 7, 30 und benutzerdefiniert bis 365 Tage MÜSSEN
chronologische Einzelwerte und eine gleichwertige Datentabelle
erscheinen. Keine Nullwerte für fehlende Tage, keine geglätteten oder
prognostizierten Werte. Abnahme: Jeder sichtbare Punkt stimmt mit einem
eigenen Eintrag überein; Check-in und Einzeltagebuch bleiben
unterscheidbar.

**DIA07 Grenzen der Auswertung** Verlauf MUSS «Selbst dokumentierte
Beobachtungen» nennen. Energie, Stimmung und Fatigue werden nicht zu
einem Gesundheits- oder Risikoscore zusammengefasst. Abnahme: Kein
Wortlaut diagnostiziert Schub, Therapieerfolg oder Verschlechterung; es
gibt keine Schwellenwertalarme. Neue Auswertungen benötigen
Zweckbestimmungsprüfung.

**DIA08 Exportfähigkeit und Datensparsamkeit** Jeder gespeicherte Wert
MUSS mit Einheit, Skalenfassung, Zeitbezug und Quelle exportierbar sein.
Abnahme: JSON und CSV unterscheiden fehlende Werte und null; Freitexte
werden sicher maskiert und nicht als Tabellenformeln ausgeführt. Kein
automatisches Teilen, kein Mitarbeitendenzugriff über
Community-Schnittstellen.

## Community und Gruppen

**COM01 Feed** Der Feed MUSS chronologisch absteigend nach
Veröffentlichung mit stabilem Tie-Breaker und jeweils 20 Einträgen
laden. Themenfilter sind möglich. Abnahme: Keine öffentlichen
Suchmaschinen oder Gäste erhalten Inhalte; blockierte Autoren und
unberechtigte Gruppeninhalte fehlen auch in Suche, Zählern und
Vorschauen. Keine engagementbasierte Sortierung.

**COM02 Beiträge und Antworten** Mitglieder MÜSSEN Textbeiträge bis 5
000 Zeichen mit Thema und Zielbereich erstellen können; Antworten bis 2
000 Zeichen sind eine Ebene tief. Abnahme: Sichtbarkeit vor
Veröffentlichung ausdrücklich benannt; Text ist bereinigt, Anhänge und
eingebettetes HTML sind unmöglich. Externe Links sind erkennbar und
haben keine extern geladenen Vorschauen.

**COM03 Eigene Inhalte verwalten** Autoren MÜSSEN eigene Beiträge und
Antworten ändern oder löschen können; jede Änderung wird als bearbeitet
markiert. Zielgruppe bleibt unveränderlich. Abnahme: Löschung entfernt
Text sofort; bei einem Beitrag mit Antworten bleibt nur ein neutraler
Platzhalter ohne Text oder Autor. Antworten anderer werden dadurch nicht
zur Eigentümerschaft des Autors.

**COM04 Erfahrung und Fachinformation** Community-Inhalte MÜSSEN als
persönliche Erfahrungen erkennbar sein; medizinisch kuratierte Artikel
sind visuell und semantisch getrennt. Abnahme: In jeder Diskussion sind
Regeln, Melden und Hinweis auf Grenzen erreichbar. Es gibt keine
Kennzeichnung «medizinisch geprüft» für gewöhnliche Mitgliederbeiträge.

**COM05 Mitgliederprofile und Auffinden** Profile MÜSSEN nur Pseudonym,
bewusst freigegebene Interessen und optional Kanton zeigen. Mitglieder
können eine globale Profilauffindbarkeit deaktivieren; Beiträge führen
weiterhin zum minimalen Autorenprofil. Abnahme: Mitgliedersuche nur nach
Pseudonym, höchstens 20 Treffer pro Abruf; ausgeblendete Profile fehlen.
Kein Verzeichnis nach Diagnose oder Krankheitsschwere und keine E-Mail,
letzter Login oder genaue Position.

**COM06 Gruppen anlegen und entdecken** Nur berechtigte Mitarbeitende
MÜSSEN Gruppen mit Titel, Thema, Regeln, Zugangstyp und verantwortlicher
Moderation erstellen können. Geschlossene Gruppen können auffindbar oder
verborgen sein. Abnahme: Aussenstehende sehen bei auffindbaren Gruppen
nur freigegebene Beschreibung und Zugangsregeln, keine Inhalte,
Mitglieder oder Aktivitätszahlen. Verborgene Gruppen fehlen in Suche.

**COM07 Aufnahme und Gruppenrechte** Offene Gruppen MÜSSEN Beitritt nach
Regelannahme erlauben; geschlossene Gruppen benötigen eine freigegebene
Anfrage. Abnahme: Mitgliedschaft wird bei jedem Abruf geprüft; Annahme,
Ablehnung und Entzug sind protokolliert. Gruppen werden im MVP
ausschliesslich durch Mitarbeitende geführt; Gruppenmoderation gewährt
keine globalen Rechte.

**COM08 Austritt und Archivierung** Austritt MUSS sofort Lesen und
Schreiben in geschlossenen Gruppen entziehen; eigene Inhalte bleiben
über eine isolierte Eigenverwaltung löschbar. Archivierte Gruppen sind
schreibgeschützt. Abnahme: Entfernte Mitglieder erhalten keine neuen
Gruppennachrichten oder Zähler; Rücknahme einer Anfrage wirkt sofort.
Ein Zugangstypwechsel ist nur durch Migration mit expliziter Prüfung
möglich.

## Nachrichten und Benachrichtigungen

**MSG01 Kontaktanfrage** Ein Mitglied MUSS einem anderen eine
standardisierte Anfrage ohne Freitext oder Link senden können. Die
sendende Person stimmt damit bewusst dem Kontakt zu. Annahme durch die
andere Person ist erforderlich. Abnahme: Ohne Annahme ist kein
Nachrichtenkanal nutzbar; eine gleichzeitige Gegenanfrage erzeugt keine
stillschweigende Annahme. Anfrage kann zurückgezogen werden.

**MSG02 Anfragestatus und Begrenzung** Kontaktbeziehung MUSS genau
einmal pro ungeordnetem Personenpaar bestehen. Ausstehende Anfragen
verfallen nach 14 Tagen. Maximal fünf neue Anfragen pro Tag und 20
ausstehende je Mitglied. Abnahme: Ablehnung wird als «nicht aktiv»
angezeigt; neue Anfrage frühestens nach 30 Tagen. Blockierung verhindert
sämtliche neuen Anfragen unabhängig von Fristen.

**MSG03 Textchat** Aktive Kontakte MÜSSEN Text bis 2 000 Zeichen senden
können. Serverbestätigung bedeutet gespeichert, nicht gelesen. Abnahme:
Jede Nachricht erhält eine stabile ID und geordnete Anzeige;
Wiederholung erzeugt keine Duplikate. Keine Anhänge, Vorschauabrufe,
Lesebestätigungen, Tippindikatoren oder Anwesenheitsanzeigen. Links
bleiben klar erkennbar und werden nicht automatisch geöffnet.

**MSG04 Fortlaufende Freigabeprüfung** Der Server MUSS vor jedem Senden
aktive beidseitige Freigabe, Blockierungen und Kontostatus prüfen.
Kontaktentzug und Senden werden konsistent serialisiert. Abnahme: Nach
bestätigtem Entzug wird keine Nachricht mehr angenommen. Frühere
Nachrichten bleiben bei einfachem Kontaktende lesbar; eine neue Freigabe
öffnet denselben Verlauf, sofern nicht gelöscht.

**MSG05 Vertraulichkeit und Moderation** Nachrichten MÜSSEN transport-
und speicherverschlüsselt sein. Das MVP verwendet keine
Ende-zu-Ende-Verschlüsselung und kommuniziert dies verständlich.
Abnahme: Gewöhnliche Mitarbeitende können Chats nicht durchsuchen; eine
Meldung legt nur bis zu zehn ausgewählte Nachrichten offen. Ein
Sonderzugriff benötigt den dokumentierten Ausnahmeprozess.

**MSG06 Nachrichten entfernen** Absender MÜSSEN eigene Nachrichten für
beide Ansichten entfernen können. Ein neutraler Platzhalter erhält die
Reihenfolge. Abnahme: Inhalt sofort unzugänglich, physische Entfernung
nach Löschplan; bereits zulässig gesicherte Meldungsbelege werden
getrennt behandelt. Ein Hinweis erklärt, dass Screenshots oder extern
gespeicherte Kopien technisch nicht rückholbar sind.

**MSG07 Einstellbare Mitteilungen** In-App-Mitteilungen MÜSSEN
Kontaktanfragen, Antworten, Gruppenentscheidungen, neue Nachrichten und
eigene Moderationsentscheidungen abdecken. E-Mail ist für soziale
Hinweise standardmässig aus. Ruhezeiten sind standardmässig 20--08 Uhr
Europe/Zurich. Abnahme: E-Mail nennt keine Diagnose, Gruppen-, Artikel-
oder Nachrichtentexte; Sicherheits- und Rechtsmitteilungen sind getrennt
erklärt.

**MSG08 Zustellung und Abgleich** Zustellaufträge MÜSSEN wiederholbar,
dedupliziert und vor Versand erneut berechtigt sein. Nach Ruhezeiten
höchstens eine neutrale Sammelmail pro Tag; veraltete, gelöschte oder
inzwischen unberechtigte Hinweise entfallen. Abnahme: Blockierung und
Gruppenentzug invalidieren Warteschlangen; fehlgeschlagene Zustellungen
erzeugen einen betrieblichen Fehler, keine doppelte Mitteilung.

## Wissen Unterstützungsverzeichnis und Suche

**CON01 Bibliothek** Wissen MUSS öffentlich nach Thema und Suchbegriff
erreichbar sein. Jeder Artikel zeigt verständliche Kurzfassung,
Volltext, Autorenschaft, fachliche Prüfung, Quellen, Publikations- und
Prüfdatum. Abnahme: Medizinischer Artikel ohne gültige Freigabe ist
nicht veröffentlichbar; Community-Erfahrung erscheint nicht als
geprüfter Artikel.

**CON02 Redaktionelle Freigabe** Artikel MÜSSEN die Zustände Entwurf, in
Prüfung, Änderungen nötig, freigegeben, publiziert, zurückgezogen und
archiviert durchlaufen. Medizinische Prüfung darf nicht durch den Autor
derselben Version erfolgen. Abnahme: Jede inhaltliche Änderung nach
Freigabe erzeugt eine neue prüfpflichtige Version. Redaktion kann nur
eine bereits freigegebene Version publizieren.

**CON03 Aktualität und Korrektur** Jeder Artikel MUSS einen nächsten
Prüftermin haben, standardmässig spätestens nach zwölf Monaten, bei
dynamischen Themen früher gemäss Prüfperson. Abnahme: Nach Fristablauf
wird der Artikel öffentlich zurückgezogen, nicht weiter empfohlen und im
Arbeitsvorrat angezeigt; historische Metadaten bleiben intern. Dringende
Korrektur kann sofortiges Zurückziehen auslösen. Quellenrechte sind
dokumentiert.

**CON04 Unterstützungsfinder** Angebote MÜSSEN nach Thema und Kanton
ohne Standortberechtigung filterbar sein. Detail enthält Organisation,
Zuständigkeit, Zielgruppe, Sprache, Zugang, Kostenhinweis «gemäss
Anbieter», Kontaktweg, URL und Prüfdatum. Abnahme: Keine Bewertung als
«beste Behandlung», keine Terminvermittlung oder Verfügbarkeitsgarantie.
Externe Links übertragen keine Profil- oder Gesundheitsparameter.

**CON05 Verzeichnisqualität** Redaktion MUSS jedes Angebot vor
Publikation anhand des Anbieters prüfen und spätestens nach sechs
Monaten erneut prüfen. Automatische Linkprüfung ist ergänzend. Abnahme:
Abgelaufene oder bedenkliche Angebote werden ausgeblendet; Hinweis über
S51 erzeugt einen Prüfauftrag. Medizinische und sozialrechtliche
Leistungsangaben benötigen die jeweils passende Fachprüfung.

**CON06 Kontakt und Inhaltsfehler** Öffentliches Kontaktformular MUSS
Kategorie, Anliegen bis 2 000 Zeichen und optionale Antwortadresse
anbieten. Keine Anhänge. Hinweis, keine medizinischen Unterlagen zu
senden und dass kein Notfallkanal besteht. Abnahme: Spambegrenzung ohne
unlösbare visuelle Aufgaben; Referenz auf Artikel/Angebot ist möglich,
Tagebuchinhalt wird nie automatisch beigefügt.

**CON07 Suche nach Bereichen** Suche MUSS Wissen, Hilfe, Community und
Pseudonymprofile getrennt ausgeben. Community-Suche ist nur für
Mitglieder und nur in jeweils zugänglichen Inhalten erlaubt.
Gesundheitsdaten und Nachrichten sind nicht global durchsuchbar.
Abnahme: Rechtefilter gelten vor Trefferanzahl, Ausschnitt und
Autovervollständigung; Suchbegriffe werden nicht in Analytics
übernommen.

**CON08 Publikationsumfang und Startbestand** Vor Pilotstart MÜSSEN
mindestens 20 geprüfte Artikel, 30 geprüfte Schweizer Hilfsangebote und
sechs verantwortete Gruppen vorhanden sein. Jede im Finder angebotene
Themenkategorie braucht mindestens ein Angebot. Abnahme: Leere Regionen
verweisen transparent auf schweizweit verfügbare Angebote; keine
erfundenen Partner, Fachpersonen oder Angebotszusagen. Redaktionelle
Verantwortliche sind benannt.

## Sicherheit und Moderationsfunktionen

**SAF01 Blockieren** Mitglieder MÜSSEN einander unmittelbar blockieren
können. Blockierung beendet die Kontaktfreigabe, verhindert neue
Anfragen und neue Nachrichten in beide Richtungen und blendet Inhalte im
Mitgliederbereich aus. Abnahme: Wirkung greift auch in Suche und offenen
Sitzungen; Aufheben stellt keinen Kontakt wieder her.
Pflichtmitteilungen und begründete Moderation bleiben möglich.

**SAF02 Melden** Beitrag, Antwort, Profil, Nachricht und Gruppe MÜSSEN
meldbar sein. Gründe: Belästigung, Datenschutz, gefährliche medizinische
Behauptung, Spam/Betrug, akute Gefahr und Sonstiges. Abnahme:
Belegnummer und sichere Statusansicht entstehen; Meldende können
unabhängig blockieren. Belege werden nur in erforderlichem Umfang und
mit unveränderbarem Erfassungszeitpunkt gesichert.

**SAF03 Fallbearbeitung** Fälle MÜSSEN Priorität, zugewiesene Person,
Status, Frist, Belege, Aktion und Begründung enthalten. Zustände: neu,
triagiert, in Bearbeitung, eskaliert, entschieden, Einspruch,
abgeschlossen. Abnahme: Nur zugewiesene Moderation und Leitung erhalten
erforderlichen Zugriff; jede Einsicht und Änderung ist protokolliert.
Keine breit zugänglichen Screenshotsammlungen.

**SAF04 Massnahmen** Moderation MUSS verwarnen, Inhalte ausblenden,
Schreiben zeitweise sperren und zur Kontosperre eskalieren können. Akute
Gefahr erlaubt sofortiges Verbergen, dauerhafte Sperre benötigt zweite
Freigabe innerhalb von 24 Betriebsstunden. Abnahme: Massnahme, Dauer,
Regelbezug und sichere Begründung dokumentiert; keine ausschliesslich
automatisierte dauerhafte Sanktion.

**SAF05 Information und Einspruch** Betroffene MÜSSEN einen
verständlichen Entscheid mit Regelgrund und Einspruchsweg erhalten,
soweit dies Schutz oder Verfahren nicht gefährdet. Einspruch bis 30 Tage
über die Oberfläche, spätere Anliegen über Kontakt. Abnahme: Andere
prüfende Person; vorgeschlagenes Antwortziel fünf Betriebstage;
Melderidentität und unnötige Belege werden nicht offengelegt.

**SAF06 Krisenhilfe und Grenzen** Eine öffentliche Hilfeseite MUSS von
jeder Hauptansicht direkt erreichbar sein. Sie nennt aktuelle, fachlich
geprüfte lokale Hilfewege und die tatsächlichen Moderationszeiten.
Abnahme: Keine 24/7-Zusage, kein automatischer Notruf, keine
Abhängigkeit vom Login. Kontaktdaten werden vor Publikation und danach
monatlich fachlich verifiziert.

**SAF07 Regeln und Einführung** Vor erstem Community-Schreiben MÜSSEN
versionierte Regeln aktiv bestätigt werden. Verboten sind Belästigung,
Doxxing, Betrug, Werbung ohne Freigabe und gefährliche individuelle
Therapieanweisungen. Abnahme: Regeländerung wird nachvollziehbar
angezeigt; Erfahrungsberichte dürfen weder als Behandlungsplan
präsentiert noch pauschal verboten werden. Moderation berücksichtigt
Kontext.

**SAF08 Missbrauchsschutz** Neue Konten MÜSSEN serverseitige Limits
haben: höchstens fünf Beiträge und 20 Antworten pro Stunde, höchstens 30
Chatnachrichten pro Minute je Sender. Abnahme: Überschreiten führt zu
kurzer Sperre der Aktion und klarer Rückmeldung; falsche Treffer sind
überprüfbar. Automatische Filter markieren oder halten zurück, treffen
aber keine endgültige medizinische oder disziplinarische Entscheidung.

## Datenschutz und Verwaltung

**PRI01 Information und Zwecktrennung** Datenschutzinformation MUSS
Verantwortlichen, Kontakt, Zwecke, Empfänger, Länder, Dauer, Rechte und
Kontaktwege nennen. Gesundheitsaktivierung und optionale Analytics sind
getrennte, unvorausgewählte Entscheidungen. Abnahme: Version, Zweck,
Zeit und Kanal werden dokumentiert; Nutzungsbedingungen ersetzen keine
Einwilligung. Symptom- und Verlaufsangaben sind für Community-Nutzung
nicht erforderlich. Zielgruppenbestätigung und Mitgliedschaft erlauben
bereits Gesundheitsrückschlüsse; dies wird vor Registrierung
ausdrücklich erklärt. Ihre Bearbeitungsgrundlage wird gesondert in D01
freigegeben.

**PRI02 Widerruf** Einwilligungen MÜSSEN über S12 ohne Support
widerrufbar sein. Widerruf für Gesundheit sperrt neue Verarbeitung
ausser erforderlicher Bereitstellung, Export, Löschung und zulässiger
Aufbewahrung. Abnahme: Wirkung sofort, keine Nachteile für öffentliche
oder soziale Kernfunktionen. Falls keine andere zulässige Grundlage
besteht, werden Gesundheitsdaten binnen 30 Tagen gelöscht; Folgen werden
vor Bestätigung erklärt. Fachprüfung Recht erforderlich.

**PRI03 Auskunft und Export** Inhaber MÜSSEN nach erneuter
Authentifizierung eigene Daten exportieren und Auskunft anfordern
können. Export enthält Konto, Profil, Präferenzen,
Einwilligungsnachweise, eigene Gesundheitsdaten, eigene Beiträge und
zugängliche eigene Gesprächsdaten; Rechte Dritter werden berücksichtigt.
Abnahme: Auftrag binnen 24 Stunden im Normalfall bereit, Download
höchstens 24 Stunden gültig, jede Abrufberechtigung erneut geprüft.

**PRI04 Gesundheitsdaten löschen** Eine eigene Löschaktion MUSS
sämtliche Check-ins, Symptome, Notizen, Ableitungen und dazugehörige
Exportdateien erfassen. Abnahme: Sofort nicht mehr nutzbar, aktive
Systeme binnen 30 Tagen bereinigt, separate bestätigte Inhaltsauswahl;
Community-Konto bleibt bestehen. Backups und begründete Ausnahmen nach
Kapitel 11. Kein automatisches Löschen fremder Gesprächsdaten durch
diese Aktion.

**PRI05 Konto löschen** Konto MUSS nach erneuter Authentifizierung
sofort deaktiviert werden. Sitzungen, Freigaben, Auffindbarkeit,
Vorschauen und Zustellaufträge werden entzogen; eigene Beiträge und
Nachrichtentexte aus beiden Ansichten ausgeblendet. Abnahme: Löschung
aus aktiven Systemen binnen 30 Tagen, Sicherungen gemäss Kapitel 11;
neutrale Platzhalter erhalten Antwortstrukturen, keine automatische
Wiederaktivierung durch Login. Abschlussbeleg ohne sensible Inhalte an
bestätigten Kontaktweg.

**PRI06 Löschsteuerung und Ausnahmen** Löschaufträge MÜSSEN
Identitätsstatus, Objektklassen, Fristen, Teilschritte, Belege und
begründete Ausnahmen erfassen. Abnahme: Suchindex, Cache, Exporte und
Auftragsbearbeiter sind einbezogen; Fehler werden wiederholt und
eskaliert. Eine rechtlich notwendige Beweissicherung wird getrennt,
minimiert, befristet und regelmässig geprüft; kein pauschales «für
immer».

**PRI07 Zugriffsnachweis und Sonderzugriff** Privilegierte Zugriffe
MÜSSEN manipulationsgeschützt protokolliert sein. Sonderzugriffe
benötigen Zweck, zweite Freigabe und automatische Befristung. Abnahme:
Kein Lesen privater Gesundheits- oder Chatdaten durch allgemeine
Administrationsrechte; Audit enthält keine Freitexte oder
Gesundheitswerte. Zugriff auf Audit ist selbst eingeschränkt und
protokolliert.

**PRI08 Rechteverwaltung und Datenschutzbetrieb** Rollenvergabe, Entzug,
Datenschutzaufträge und Konfiguration MÜSSEN getrennte Berechtigungen
besitzen. Abnahme: Mitarbeitendenaustritt entzieht Zugriffe
unverzüglich; quartalsweise Rechteprüfung dokumentiert. Verzeichnis der
Bearbeitungstätigkeiten, Auftragsbearbeiterliste, Aufbewahrungsplan und
Incidentprozess sind vor Pilot vorhanden und den verantwortlichen Rollen
zugewiesen.

# 09 Datenlogisches Modell

## Identität und persönliche Daten

Alle Entitäten besitzen eine nicht erratbare ID und erforderliche
Zeitstempel; veränderliche Datensätze zusätzlich eine Versionsnummer.
Personenbezug wird nicht über E-Mail als Fremdschlüssel hergestellt.
Private, soziale und betriebliche Daten erhalten getrennte Zugriffspfade
und Datenbankrollen. «Privat» bedeutet Zugriff ausschliesslich durch den
Inhaber, ausser einem dokumentierten zulässigen Ausnahmeprozess.

  -----------------------------------------------------------------------------
  **Entität**          **Wesentliche Attribute**     **Beziehung und Zugriff**
  -------------------- ----------------------------- --------------------------
  Account              E-Mail, Passwort-Hash,        Wurzel des Mitglieds;
                       Verifikationsstatus,          Identitätsdaten nicht in
                       Zielgruppenbestätigung,       Community-Abfragen
                       Status                        

  Session und          Token-Hash, Ablauf,           Account 1 zu n; nur
  MFAFactor            Gerätetyp; verschlüsseltes    Authentifizierungsdienst
                       Faktor-Geheimnis,             
                       Recovery-Hashes               

  RoleAssignment       Rolle, Geltungsbereich,       Account 1 zu n;
                       Beginn, Ende, Freigabe        Mitarbeitendenrechte
                                                     zeitlich begrenzbar

  CommunityProfile     Pseudonym, Interessen,        Account 1 zu 1; nur
                       optional Kanton,              freigegebene Felder für
                       Auffindbarkeit                Mitglieder

  UserPreference       de-CH, Zeitzone, einfache     Account 1 zu 1; privat
                       Ansicht, Schrift, Bewegung,   
                       Mitteilungen, Ruhezeit        

  ConsentRecord        Zweck, Textfassung,           Account 1 zu n; Nachweise
                       Entscheidung, Zeitpunkt,      versioniert, kein
                       Widerruf, Kanal               überschriebenes Boolean

  CheckIn              Lokales Datum, Zeitzone,      Account 1 zu n; privat;
                       Energie, Stimmung, Fatigue,   eindeutig Account und
                       Notiz, Skalenfassung          Datum

  DiaryEntry           Beobachtungszeit UTC, lokale  Account 1 zu n; privat;
                       Zeit und Zeitzone, Fatigue,   mindestens ein Messinhalt
                       Schlafbeobachtung, Notiz      

  SymptomDefinition    Katalogcode oder eigene       Gemeinsamer Katalog ohne
                       Bezeichnung, Version,         Personenbezug; eigene
                       Aktivstatus, ggf. Eigentümer  Definition privat

  SymptomObservation   Stärke 0--10, optionale Dauer DiaryEntry 1 zu n;
                       in Minuten, Bezeichnung zum   verweist auf Definition,
                       Erfassungszeitpunkt           bleibt historisch
                                                     verständlich

  Bookmark             Zieltyp, Ziel-ID, Zeit        Account 1 zu n; privat;
                                                     eindeutiger Verweis je
                                                     Ziel
  -----------------------------------------------------------------------------

**Null und Wert** Nicht erfasste Messungen sind leer, nicht null als
Zahl. Energie 0 bedeutet niedrigste selbst berichtete Energie; Fatigue 0
bedeutet keine selbst berichtete Fatigue. Die Skalentexte werden
versioniert. Stimmung 1--5 ist kein diagnostischer Fragebogen.
Schlafbeobachtung ist optionaler Freitext bis 250 Zeichen und kein
berechneter Schlafscore.

**Zeitlogik** Beobachtungszeit und Erfassungszeit sind verschieden. Ein
Check-in gehört dauerhaft zum bewusst gewählten lokalen Datum.
Technische Auditzeiten sind UTC. Die Darstellung verwendet die
eingestellte Zeitzone; Export erhält ursprüngliche Zeitzone und Offset.
Tests umfassen Sommerzeitwechsel und rückwirkende Erfassung.

## Community und Kommunikation

  -------------------------------------------------------------------------------
  **Entität**           **Wesentliche Attribute**     **Beziehung und Schutz**
  --------------------- ----------------------------- ---------------------------
  Topic                 Name, Reihenfolge,            Gemeinsame Taxonomie, keine
                        Aktivstatus                   Gesundheitsklassifikation
                                                      einer Person

  Group                 Titel, Beschreibung, Typ,     1 zu n Beiträge und
                        Auffindbarkeit,               Mitgliedschaften; Metadaten
                        Regelnfassung, Status,        gemäss Freigabe
                        Moderationsverantwortung      

  GroupMembership       Account, Gruppe, Status,      Eindeutig je Account und
                        angenommene Regeln, Entscheid Gruppe; angefragt, aktiv,
                        und Zeit                      abgelehnt, ausgetreten,
                                                      entfernt

  Post                  Autor, Thema, Zielbereich,    Account 1 zu n; Zielbereich
                        Text, Bearbeitungszeit,       Plattform oder genau eine
                        Status                        Gruppe

  Comment               Beitrag, Autor, Text, Zeit,   Post 1 zu n; keine
                        Status                        rekursiven Antwortbäume

  ContactRelationship   Kanonisches Personenpaar,     Ein Datensatz je Paar; kein
                        Initiator, Zustimmung beider  Nachrichtenrecht allein
                        Seiten, Status, Sperrfrist    durch Profileintrag

  Conversation          Kontaktbeziehung, Status,     Beziehung 1 zu 1; genau
                        letzte Sequenz                zwei Beteiligte

  Message               Gespräch, Absender, Sequenz,  Conversation 1 zu n;
                        Text, Client-Vorgangs-ID,     Absender muss Beteiligter
                        Löschstatus                   sein

  Block                 Blockierende Person,          Gerichtete Beziehung;
                        Zielperson, Zeitpunkt,        aktive Blockierung sperrt
                        optional Aufhebung            Kontakt beidseitig

  Notification          Empfänger, Ereignistyp,       Account 1 zu n; keine
                        sichere Zielreferenz,         gespeicherten
                        gelesen, Ablauf               Nachrichtentexte

  DeliveryJob           Notification, Kanal, Status,  1 zu n Versuche;
                        Versuch, nächste Ausführung,  Berechtigung und Ruhezeiten
                        Deduplikationsschlüssel       vor Versand erneut prüfen
  -------------------------------------------------------------------------------

## Verbindliche Kardinalitäten und Regeln

Ein Post gehört entweder zum Plattformfeed oder zu genau einer Gruppe.
Geschlossene Gruppeninhalte erhalten ihre Rechte aus aktiver
Mitgliedschaft. Die Datenbank verhindert Beiträge ohne gültiges Ziel.
Themen allein erteilen keine Rechte. Offene Gruppen sind nur innerhalb
der Mitgliederplattform offen.

Eine Kontaktbeziehung hat zwei verschiedene aktive Konten. Die sortierte
Paar-ID verhindert Doppelbeziehungen. Anfrage, Annahme, Ablauf und
Entzug sind atomare Zustandsänderungen. Chatnachrichten erhalten eine
monoton steigende Sequenz je Gespräch und eine eindeutige
Client-Vorgangs-ID je Absender. Dadurch lassen sich Wiederholungen und
Reconnects ohne Duplikate behandeln.

Eine Blockierung wird bei Kontaktanfrage, Annahme, Nachricht, Feed,
Suche und Benachrichtigung berücksichtigt. Sie hebt keine gespeicherten
Beweise und keine administrativen Pflichten auf. Die Plattform teilt der
blockierten Person keinen Blockierungsgrund und keine Identität einer
meldenden Person mit.

Löschungen erhalten nur die technisch erforderlichen Strukturreste,
beispielsweise «Nachricht entfernt». Ein pseudonymisierter Restdatensatz
ist nicht automatisch anonym. Freitexte werden gelöscht oder nach
fachlich geprüfter Ausnahme getrennt aufbewahrt; blosses Entfernen des
Autorennamens genügt nicht.

## Redaktion Datenschutz und Betrieb

  -----------------------------------------------------------------------------
  **Entität**          **Wesentliche Attribute**     **Beziehung und Schutz**
  -------------------- ----------------------------- --------------------------
  Article und          Slug, Thema; Text,            Artikel 1 zu n Versionen;
  ArticleVersion       Kurzfassung, Autor, Status,   nur freigegebene aktuelle
                       Quellen, Freigabe, Prüftermin Version öffentlich

  EditorialReview      Version, Prüfperson,          Version 1 zu n Prüfungen;
                       Fachgebiet, Entscheid, Zeit,  Eigenfreigabe
                       Kommentar                     ausgeschlossen

  SourceReference      Titel, Herausgeber, URL,      Zugeordnete Version; keine
                       Datum, Rechtehinweis          erfundenen oder
                                                     automatisiert unbelegten
                                                     Quellen

  SupportOffer         Organisation, Thema, Kantone, Öffentlich nur nach
                       Sprache, Kontakt,             redaktioneller Prüfung
                       Kostenhinweis, URL, Status    

  VerificationRecord   Angebot oder Hilfeseite,      Objekt 1 zu n;
                       Prüfer, Verfahren, Zeit,      Fachverantwortung bei
                       nächster Termin               kritischen Kontaktwegen

  Report und           Meldender, Ziel, Grund, Zeit, Report 1 zu n minimierte
  EvidenceItem         Priorität; ausgewählter Beleg Belege; gesonderter
                       mit Hash                      Speicher mit Fallrechten

  ModerationCase und   Zuweisung, Status, Fristen;   Ein oder mehrere Reports
  Action               Massnahme, Begründung, Dauer, pro Fall; keine freie
                       Entscheider                   Chatnavigation

  Appeal               Fall, einreichende Person,    Fall 1 zu n; Identität
                       Begründung, unabhängige       Meldender bleibt geschützt
                       Prüfung, Ergebnis             

  PrivacyRequest und   Typ, Identitätsprüfung,       Auftrag 1 zu n
  ErasureTask          Frist, Ausnahme; System,      Teilschritte, technische
                       Objektklasse, Status          Löschbelege

  ExportJob            Inhaber, Umfang, Status,      Privat; Download nicht
                       verschlüsselter Objektpfad,   über öffentliches CDN
                       Ablauf                        

  AuditEvent           Akteur, Rolle, Aktion,        Manipulationsgeschützt;
                       Objekt-ID, Ticket, Zeit,      keine Inhaltskopien
                       Ergebnis                      

  FeatureConfig und    Version, Freigabe, aktive     Nur Betrieb; atomare
  OutboxEvent          Schalter; Ereignis-ID, Typ,   Ereignisablage mit
                       Ziel, Status                  fachlicher Änderung
  -----------------------------------------------------------------------------

## Zustandsautomaten und Integrität

**Kontakt** nicht aktiv → ausstehend → aktiv → beendet; ausstehend kann
abgelehnt, zurückgezogen oder abgelaufen sein. Block ist eine
zusätzliche Sperrbedingung. Beenden entfernt beide Zustimmungen.
**Artikel** Entwurf → Prüfung → freigegeben → publiziert; neue
Inhaltsänderung beginnt als neue Version. Rückzug entfernt die
Publikation sofort. **Löschung** angefordert → deaktiviert →
Teilschritte → geprüft → abgeschlossen; Fehler führen zu Wiederholung
und Eskalation, nicht zum stillen Abschluss.

Jede Statusänderung benötigt Akteur, gültigen Vorgängerzustand und
Berechtigungsprüfung. Fremdschlüssel sichern Beziehungen, eindeutige
Schlüssel sichern Tages-Check-ins, Mitgliedschaften und Kontaktpaare.
Suchindex und Cache sind abgeleitete Daten und dürfen keine zusätzliche
Zugriffsquelle werden. Eine Schemaänderung benennt Migrationsweg,
Wiederherstellung und Auswirkungen auf Export sowie Löschung.

# 10 Moderation und Krisen

## Moderationsmodell und Betriebszeiten

Die Community startet als betreuter Pilot. Vorgeschlagene Betriebszeit
ist täglich 09--18 Uhr Europe/Zurich einschliesslich Wochenenden;
Besetzung und Finanzierung sind D03. Vor Freigabe sind Vertretung und
Eskalationskontakt verbindlich benannt. Öffentliche Angaben müssen den
tatsächlichen Dienstplan wiedergeben. Ist die Mindestbesetzung nicht
gesichert, startet der Pilot nicht mit schreibender Community.

  -----------------------------------------------------------------------
  **Priorität**     **Beispiel und Erstaktion** **Vorgeschlagenes
                                                Reaktionsziel**
  ----------------- --------------------------- -------------------------
  P0 Akute Gefahr   Konkrete unmittelbare       Prüfung binnen 30 Minuten
                    Gefährdung, schweres        während Betriebszeit
                    Doxxing; Beleg sichern,     
                    ggf. vorläufig verbergen,   
                    Leitung alarmieren          

  P1 Hoher Schaden  Drohung, Betrug,            Triage binnen 2
                    gefährliche individuelle    Betriebsstunden,
                    Therapieanweisung           Entscheidung möglichst am
                                                selben Betriebstag

  P2 Regelverstoss  Wiederholte Belästigung,    Triage binnen 1
                    Spam, diskriminierender     Betriebstag
                    Inhalt                      

  P3 Qualität       Themenfehlplatzierung,      Bearbeitung binnen 3
                    unklare Formulierung,       Betriebstagen
                    normale Beschwerde          
  -----------------------------------------------------------------------

Diese Ziele sind Serviceziele des Betriebs, keine
Rund-um-die-Uhr-Zusage. Ausserhalb der Zeiten nennt eine automatische
Eingangsbestätigung den nächsten Dienstbeginn und verweist unabhängig
auf S49. Technische Sicherheitsvorfälle besitzen eine getrennte
Bereitschaft; diese ersetzt keine psychosoziale Beratung.

## Verhältnismässiger Ablauf

Eingang → Priorisierung → zuständige Person → Kontext prüfen →
erforderliche Schutzaktion → begründeter Entscheid → sichere Information
→ Einspruch → Abschluss und fristgebundene Beweislöschung. Bei
Unsicherheit über medizinische Aussagen wird fachliche Prüfung
beigezogen; Moderation gibt keine Therapieanweisung. Ein Mitglied darf
seine Erfahrung schildern, aber nicht andere zur eigenmächtigen
Therapieänderung anleiten.

Mögliche Massnahmen sind Hinweis, Textüberarbeitung anfordern,
Ausblenden, zeitweise Schreibsperre und Kontosperre. Wiederholung,
Schwere und Schutzbedarf bestimmen die Massnahme. Eine schwere
Sofortmassnahme wird innerhalb von 24 Betriebsstunden durch eine zweite
zuständige Person geprüft. Die Information nennt Regeln und Dauer, ohne
die meldende Person oder sensible Belege offenzulegen.

Neue Moderatorinnen und Moderatoren benötigen Schulung zu MS-bezogenem
Austausch, Diskriminierung, Datenschutz, Krisensignalen, Betrug und
eigener Belastung. Supervision und Vertretung sind einzuplanen. Ein
monatliches Qualitätsreview prüft Fristverletzungen, aufgehobene
Entscheidungen und wiederkehrende Probleme ohne Gesundheitsprofile
einzelner Mitglieder zu erstellen.

**Kalte Startphase** Sechs moderierte Gruppen erhalten Begrüssung,
Regeln und vorbereitete Gesprächsimpulse. Mitarbeitende sind als solche
erkennbar; es gibt keine erfundenen Mitglieder, Erfahrungsberichte oder
simulierte Peer-Verfügbarkeit.

## Krisen und medizinische Grenzen

Die Plattform ist kein Notfalldienst. Sie überwacht weder Tagebuchwerte
noch alle privaten Gespräche und verspricht keine Krisenerkennung. Es
gibt im MVP kein automatisches Scoring für Selbstgefährdung, keinen
automatisierten Notruf und keine Ortung.

**K01 Wahrgenommene akute Gefahr** Bei einer eingehenden Meldung oder
einem im Dienst bemerkten konkreten Hinweis hält die Moderation
Beobachtung und Zeitpunkt fest, sichert nur erforderliche Belege und
alarmiert die geschulte Leitung. Eine freigegebene Antwort nennt die
Grenzen der Plattform und verweist auf sofort erreichbare örtliche
professionelle Hilfe. Die Person wird nicht zu öffentlichen
Gesundheitsdetails aufgefordert. Die genaue Gesprächsführung und
Weitergabe an Stellen sind vor Start mit Krisenfachpersonen und
Rechtsberatung festzulegen.

**K02 Schutz und Eskalation** Eine Weitergabe von Personendaten an
externe Stellen erfolgt nur nach dokumentierter Prüfung von konkreter
Gefahr, verfügbarer Information, erforderlichem Umfang und zulässigem
Vorgehen. Im MVP sind weder verifizierter Realname noch Adresse
zuverlässig bekannt. Die Plattform darf keine erfolgreiche
Identifikation oder Rettung versprechen. Eine Sperre wird nicht
reflexartig als Krisenreaktion verwendet; Gefährdungs- und
Missbrauchslage werden getrennt betrachtet.

**K03 Medizinische Anfrage** Bei persönlichen Fragen zu neuen
Beschwerden, Medikamenten oder Therapieentscheidungen verweist die
Moderation auf die behandelnden Fachpersonen beziehungsweise fachlich
freigegebene akute Hilfewege. Die Plattform interpretiert
Tagebucheinträge nicht. Medizinische Redaktion verantwortet allgemeine
Inhalte, übernimmt dadurch aber keine Behandlung einzelner Mitglieder.

S49 enthält vor dem Launch fachlich verifizierte Schweizer Kontakte mit
Erreichbarkeit, regionalem Bezug, Datum und verantwortlicher Prüfung.
Dieses PRD legt bewusst keine ungeprüften Krisennummern fest. Eine
falsche oder nicht verfügbare Hilferoute blockiert die Freigabe. Der
Hilfeinhalt muss auch bei gesperrtem Konto, ohne
JavaScript-Grundinteraktion und während einer Community-Störung lesbar
bleiben.

## Sicherheitsvorfälle und Meldungen

**I01 Eindämmen** Technische Bereitschaft stoppt betroffene Zugriffe,
widerruft Schlüssel oder Sitzungen und erhält erforderliche technische
Belege. **I02 Bewerten** Leitung, Sicherheit und Datenschutzkontakt
bewerten betroffene Daten, Reichweite, Folgen und rechtliche Pflichten.
**I03 Informieren** Zuständige Personen entscheiden über Behörden- und
Betroffeneninformation; Zeitpunkt und Begründung werden protokolliert.
**I04 Wiederherstellen** Ursache beseitigen, Zugriff testen,
Wiederaufnahme freigeben und Nachbesprechung binnen fünf Betriebstagen
durchführen.

Nach Art. 24 DSG ist bei voraussichtlich hohem Risiko eine Meldung an
den EDÖB so rasch als möglich erforderlich; Betroffeneninformation wird
gesondert geprüft. Bei anwendbarer DSGVO sind deren eigene
Voraussetzungen und Fristen, insbesondere Art. 33 und 34, zu prüfen.
Eine pauschale Schweizer 72-Stunden-Regel wird nicht behauptet. \[Q3,
Q5\]

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

# 13 Nichtfunktionale Anforderungen

Die Ziele gelten bei einem Planungsprofil von 2 000 registrierten
Personen, 300 täglich aktiven Personen und 100 gleichzeitig aktiven
Sitzungen. Das ist eine Kapazitätsannahme für Tests, keine
Marktprognose. Lasttest: 15 Minuten Anstieg, 60 Minuten Dauerlast und 15
Minuten Spitze mit 200 Sitzungen; realistische Lese- und
Schreibmischung, keine echten Personendaten.

  --------------------------------------------------------------------------
  **ID**          **Verbindliches Ziel**        **Messung und Nachweis**
  --------------- ----------------------------- ----------------------------
  NFR01           320 bis 1 920 CSS-Pixel,      Screenmatrix und Kernflows
  Responsivität   Hoch- und Querformat          ohne abgeschnittene Aktion

  NFR02 Browser   Je aktuelle und vorherige     Versionen vor Release
                  Hauptversion von Safari,      festhalten und testen
                  Chrome, Firefox und Edge; iOS 
                  Safari und Android Chrome     

  NFR03           LCP ≤ 2,5 s, INP ≤ 200 ms,    Definierter Mobil-Labortest;
  Webleistung     CLS ≤ 0,1 als Ziel am 75.     Felddaten nur zulässig und
                  Perzentil                     freiwillig

  NFR04           p95 API Lesen ≤ 500 ms,       Ohne Netzweg, Mail und
  Antwortzeit     Schreiben ≤ 800 ms unter      Export; serverseitig messen
                  Planlast                      

  NFR05 Chat      Gespeicherte Nachricht bei    Unter Planlast inkl.
                  aktivem Empfänger p95 binnen  Zustellung; kein Lesebeweis
                  3 s sichtbar                  

  NFR06           99,5 Prozent je Kalendermonat Externer neutraler Prüfer;
  Verfügbarkeit   für Kern-API                  geplante Ausfälle mitzählen

  NFR07           Wiederherstellungspunkt       Stündliche Sicherung oder
  Datenverlust    höchstens 1 Stunde zurück     gleichwertige
                                                kontinuierliche Sicherung

  NFR08           Wiederherstellung des         Quartalsweiser Restore-Test
  Wiederanlauf    Kernbetriebs binnen 4 Stunden inkl. Löschjournal

  NFR09 Transport Verschlüsselung, verwaltete   Konfigurationsreview und
  und Speicher    Schlüssel, getrennte          Nachweis für Backups und
                  Berechtigungen                Exporte

  NFR10           Keine Schlüssel im Browser,   Secret-Scan, Rotation und
  Geheimnisse     Repository, Log oder          Dienstrollen
                  Dokumentexport                
  --------------------------------------------------------------------------

**Messprofil** Der Mobil-Labortest verwendet ein dokumentiertes
Mittelklassegerät mit 4G-Profil und mindestens fünf Läufe je Kernscreen.
Die API-Lastmischung besteht aus 50 Prozent Feed-/Inhaltsabrufen, 20
Prozent persönlichen Lesezugriffen, 20 Prozent Chat und 10 Prozent
übrigen Schreibvorgängen. Ein Lastreport nennt p50, p95, Fehler und
Datenkonsistenz. Verfügbarkeitsausfälle werden nicht durch pauschale
Wartungsausnahmen herausgerechnet.

## Sicherheit und Betriebsqualität

Diese Anforderungen ergänzen die Leistungs- und Wiederanlaufziele.
Sicherheits- und Datenschutzkontrollen bleiben auch im Last- und
Fehlerfall aktiv.

  -----------------------------------------------------------------------------
  **ID**             **Verbindliches Ziel**        **Messung und Nachweis**
  ------------------ ----------------------------- ----------------------------
  NFR11 Passwörter   Adaptive Passwort-Hashes,     Parameter fachlich prüfen
                     bevorzugt Argon2id; keine     und dokumentieren \[Q11\]
                     reversible Ablage             

  NFR12              CSRF-, XSS-, Injection-,      Bedrohungsmodell,
  Anwendungsschutz   SSRF- und                     Sicherheitstests und
                     Berechtigungsangriffe         externer Pentest
                     abgewehrt                     

  NFR13              Unterstützte, festgelegte     Inventar, Lizenzprüfung,
  Abhängigkeiten     Versionen; kritische Updates  Schwachstellenprüfung pro
                     priorisiert                   Build

  NFR14              Keine Duplikate bei           Parallelitäts- und
  Datenintegrität    Wiederholung; atomare         Ausfalltests, Constraints
                     Rechtewechsel                 

  NFR15 Datenschutz  Keine sensiblen Inhalte in    Stichproben und
                     Logs oder Telemetrie          automatisierte
                                                   verbotene-Felder-Prüfung

  NFR16              Fehlerquote, Latenz,          Alarm bei \> 2 Prozent 5xx
  Beobachtbarkeit    Queuealter, Backup- und       über 5 min oder veraltetem
                     Zustellstatus                 Backup

  NFR17 Wartbarkeit  Versionierte Verträge,        Review und nachvollziehbare
                     Migrationen, Rollen- und      Release-Artefakte
                     Betriebsdokumentation         

  NFR18 Isolation    Entwicklung, Test und         Keine produktiven
                     Produktion getrennt           Gesundheitsdaten in
                                                   Testumgebungen

  NFR19              Asynchrone Aufgaben           Kill-/Restart-Test; Alarm
  Wiederholbarkeit   dedupliziert, Retry begrenzt, nach ausgeschöpften
                     Fehlerwarteschlange           Versuchen

  NFR20 Begrenzter   Öffentliche Hilfe unabhängig  Teilabschaltung und
  Ausfall            bereitstellbar                Wiederanlauf geprobt
  -----------------------------------------------------------------------------

RTO und RPO sind Ziele, keine Zusage ohne Betriebsmittel. Wird das
Planungsprofil überschritten, löst dies Kapazitätsreview aus. Leistung
darf nicht durch Abschalten von Rechteprüfungen verbessert werden.

# 14 Technische Architektur

## Empfohlene Basis und Komponenten

Das MVP wird als modularer Monolith umgesetzt: eine gemeinsame Anwendung
mit klar getrennten Fachbereichen, eine relationale Datenbasis und
getrennte Hintergrundarbeiter. Diese Struktur reduziert Betriebsaufwand
und wahrt Grenzen zwischen privaten Gesundheitsdaten und Community. Ein
späterer Ausbau in getrennte Dienste ist möglich, aber nicht
Voraussetzung.

  ---------------------------------------------------------------------------
  **Baustein**          **Aufgabe**                 **Umsetzungsvorgabe**
  --------------------- --------------------------- -------------------------
  Responsive Web App    Öffentliche Seiten,         Next.js und TypeScript;
                        geschützter Bereich,        semantische Komponenten;
                        Administration              keine Geheimnisse im
                                                    Client

  Anwendungs-API        Authentifizierung, Rechte   Versionierte
                        und fachliche Transaktionen Schnittstellen;
                                                    gemeinsame Fachlogik für
                                                    Web und spätere Apps

  Fachmodule            Identität, Gesundheit,      Explizite Modulgrenzen;
                        Community, Messaging,       kein direkter
                        Inhalte, Moderation,        Fremdzugriff auf private
                        Datenschutz                 Tabellen

  PostgreSQL            Persistenz, Integrität,     Getrennte Schemas und
                        erste Volltextsuche         Dienstrollen,
                                                    Eigentümerfilter,
                                                    Migrationen

  Hintergrundarbeiter   Benachrichtigung, Export,   Transaktionale Outbox und
                        Löschung, Prüfaufträge      deduplizierte Jobs;
                                                    geringstmögliche Rechte

  Objektablage          Zeitlich begrenzte Exporte  Nicht öffentlich,
                        und erforderliche           verschlüsselt, separate
                        Fallbelege                  Zugriffspfade und
                                                    Ablaufregeln

  Zustellung            Transaktionsmails und       Vertraglich geprüfter
                        erlaubte soziale Hinweise   Dienst, neutrale
                                                    Vorlagen, keine sensiblen
                                                    Inhalte

  Betrieb               Deployment, Telemetrie,     Schweizer Datenregion als
                        Schlüssel, Backups, Audit   Vorgabe; Zugriffsländer
                                                    vollständig prüfen
  ---------------------------------------------------------------------------

## Datenfluss und Sicherheitsgrenzen

Browser → geschützte Anwendung/API → Authentifizierung → objektbezogene
Rechteprüfung → Fachmodul → Datenbank. Erfolgreiche Änderung und
Outbox-Ereignis werden gemeinsam gespeichert. Hintergrundarbeiter
verarbeitet Ereignisse, prüft Rechte und aktuellen Status erneut und
führt Versand, Export oder Löschung aus. Fehler erzeugen
nachvollziehbare Wiederholungen.

Serverkomponenten und Serveraktionen können sensible Daten ungewollt an
den Client weitergeben. Deshalb liefern sie nur explizit erlaubte
Felder; jede Aktion prüft Authentifizierung und Berechtigung nahe am
Datenzugriff. Layout- und Navigationsschutz genügen nicht. Geschützte
Inhalte dürfen nicht über gemeinsam genutzte Seitencaches oder
Vorabrufdaten offengelegt werden. \[Q9\]

PostgreSQL Row-Level Security ist als zusätzliche Schutzschicht
insbesondere für Inhaberdaten und Gruppenzugriffe vorgesehen. Die
Anwendungsrolle darf weder Superuser noch eine RLS umgehende
Eigentümerrolle sein. Ihre tatsächliche Wirkung wird mit der produktiven
Dienstrolle getestet; RLS ersetzt keine fachliche Prüfung. \[Q10\]

Gesundheitsdaten werden nicht in den Community-Suchindex geschrieben.
Nachrichten werden ausschliesslich über Gesprächsberechtigungen geladen.
Fallbelege erhalten einen separaten, minimierten Zugriff. Es gibt keine
frei verwendbare Verwaltungsabfrage über alle privaten Inhaltsbereiche.

## Schnittstellen und Betriebskonzept

**API-Vertrag** Jede Operation beschreibt Rolle, Objektberechtigung,
Felder, Validierungen, Fehler, Seitennavigation und
Wiederholungsverhalten. Schreibaktionen für Check-in, Nachricht und
Export verwenden eindeutige Vorgangskennungen. Gleichzeitige Bearbeitung
verwendet Versionen. Listen verwenden stabile Cursor; 20 Einträge sind
Standard, höchstens 100 je Abruf. Fehlermeldungen enthalten
Korrelations-ID und verständlichen Text ohne private Details.

**Authentifizierung** Web nutzt sichere, HttpOnly- und angemessen
SameSite-geschützte Sitzungscookies. Schreibzugriffe besitzen
CSRF-Schutz. Zugangstoken stehen nicht in URLs oder
Browser-Dauerspeicher. Für spätere native Apps wird ein separat
freizugebender standardisierter Tokenflow mit kurzer Gültigkeit,
sicherer Geräteablage und Widerruf vorgesehen. Das MVP enthält noch
keinen nativen Client.

**Echtzeit** Chatzustellung kann serverseitige Ereignisse oder
WebSockets verwenden; die Entscheidung fällt anhand Hostingfähigkeit und
Sicherheitsreview D07. Ein erneuter Verbindungsaufbau lädt ab letzter
Sequenz nach. Ein langsamer oder abgebrochener Kanal verändert keine
gespeicherten Nachrichten. Optionaler Polling-Fallback muss Rechte,
Planlast und das Latenzziel einhalten.

**Suche** PostgreSQL-Volltextsuche genügt zunächst für Wissen, Hilfe und
berechtigte Community. Es wird kein externer Suchdienst benötigt. Rechte
werden vor Rangfolge, Anzahl und Ausschnitt angewandt. Cache-Schlüssel
enthalten den erforderlichen Zugriffskontext; private Seiten erhalten
keine öffentliche Zwischenspeicherung. Bei Mitgliedschafts- und
Blockänderung werden abgeleitete Ergebnisse invalidiert.

**Deployment** Infrastrukturkonfiguration, Migration und Artefakte
werden versioniert. Eine Pipeline prüft Format, Typen, Sicherheit,
fachliche Tests und Build. Testsystem erhält nur fiktive Daten.
Migrationen sind vorwärtskompatibel; risikoreiche Datenänderungen
benötigen Sicherung und erprobten Wiederherstellungsplan. Freigabe
erfolgt über Feature-Schalter und stufenweisen Rollout.

**Betriebsbereitschaft** Runbooks decken Login-Ausfall, verzögerte
Nachrichten, fehlgeschlagene Exporte/Löschungen, Backupfehler,
Datenabfluss und vollständigen Wiederanlauf ab. Alarmempfänger,
Vertretung und Kontaktdaten sind konkret benannt. Kritische
Sicherheitswarnungen werden binnen vier Stunden bewertet; bei aktivem
Missbrauch erfolgt sofortige Eindämmung. Fristen für Behebung hängen vom
Risiko ab und werden dokumentiert, statt pauschal garantiert.

**Mobile Weiterentwicklung** Fachlogik und API bleiben unabhängig von
Webansichten. Spätere Apps teilen Benutzerkonto, Kontaktfreigaben,
Datenschutzprozesse und Datensemantik. UI-Technologie und
Offline-Speicherung werden erst nach validiertem Bedarf festgelegt.
Push, biometrische Entsperrung und Gerätesynchronisation benötigen neue
Einwilligungs-, Sicherheits- und Testkonzepte. Es gibt im MVP keinen
Offline-Schreibmodus und kein sensitives Service-Worker-Caching.

# 15 Analytics und Erfolgsmessung

## Messprinzip

Gemessen wird, ob Menschen einen gewünschten Nutzen sicher erreichen.
Tägliche Trackingmenge, lange Sitzungen und viele Gesundheitsangaben
sind keine Erfolgsziele. Produktanalytics sind optional, standardmässig
aus und getrennt vom erforderlichen Betriebsmonitoring. Keine
Session-Replays, Werbe-IDs, Suchtexte, Pseudonyme, Nachrichtentexte oder
Symptomwerte. Bereits die Mitgliedschaft kann sensible Rückschlüsse
ermöglichen.

  ------------------------------------------------------------------------------
  **Kennzahl**             **Definition**              **Pilotziel und
                                                       Interpretation**
  ------------------------ --------------------------- -------------------------
  Erste nützliche Aktion   Innerhalb 7 Tagen           ≥ 60 Prozent der
                           mindestens ein              einwilligenden neuen
                           Artikel/Angebot geöffnet,   Mitglieder; nach
                           Gruppe beigetreten oder     Aktionstyp getrennt
                           eigener Eintrag gespeichert 

  Bedienerfolg             Kernaufgabe ohne Hilfe      ≥ 80 Prozent im
                           abgeschlossen               moderierten Nutzertest

  Check-in Aufwand         Median und 80. Perzentil    80 Prozent ≤ 60 Sekunden;
                           der Aufgabenzeit im         keine Zeitmessung von
                           Nutzertest                  Gesundheitsinhalten im
                                                       Produkt

  Wiederkehrender Nutzen   Mindestens eine nützliche   Hypothese ≥ 30 Prozent;
                           Aktion in Woche 4 nach      keine Streaks oder
                           Einstieg                    Reaktivierungsdruck

  Wahrgenommener Nutzen    Freiwillige Befragung mit   ≥ 70 Prozent der
                           «mindestens ein Modul       Pilotantwortenden;
                           alltagstauglich»            Rücklauf mitberichten

  Datenschutzverständnis   Sichtbarkeit von Tagebuch,  ≥ 90 Prozent im Test;
                           Profil und Chat richtig     Fehlverständnis ist
                           erklärt                     Designproblem

  Moderationsqualität      Anteil innerhalb            ≥ 95 Prozent im Ziel;
                           Serviceziel triagierter     niedrige Meldezahl allein
                           Fälle,                      ist kein Erfolg
                           Einspruchskorrekturen       

  Inhaltsqualität          Anteil publizierter Artikel 100 Prozent; überfällige
                           und Angebote mit gültiger   Inhalte automatisch
                           Prüfung                     zurückziehen
  ------------------------------------------------------------------------------

## Ereignisplan mit erlaubten Feldern

  -------------------------------------------------------------------------------
  **Ereignis**              **Erlaubte Parameter**      **Zweck und Ausschluss**
  ------------------------- --------------------------- -------------------------
  onboarding_completed      Variante, UI-Version        Hürden erkennen; keine
                                                        Rolle oder Diagnoseangabe

  moment_path_selected      Einer der drei groben Wege  Einstieg verbessern;
                                                        keine Symptomableitung

  useful_action_completed   Generischer Aktionstyp,     Aktivierung aggregieren;
                            Erfolg                      keine Objekt-, Themen-
                                                        oder Gruppen-ID

  core_flow_failed          Flow-ID, technischer        Fehlerstelle finden; kein
                            Fehlercode                  Inhalt oder Freitext

  preference_changed        Nur Typ Anzeige oder        Bedienbarkeit; keine
                            Analytics                   Gesundheitspräferenz
  -------------------------------------------------------------------------------

Optionale Events verwenden einen zufälligen, separat geschützten
Analysebezug mit höchstens 30 Tagen Lebensdauer. Vier-Wochen-Kohorten
werden innerhalb dieser Frist berechnet. Es gibt keine Verknüpfung mit
Tagebuch oder Moderationsakten. Widerruf stoppt neue Events und entfernt
rückführbare Rohdaten nach freigegebenem Prozess. Aggregierte Ausgaben
erscheinen erst ab zehn Personen; kleine Gruppen und Kombinationen
werden unterdrückt.

Betriebsmonitoring misst ausschliesslich technische Fehler, Latenz und
Auftragsstatus. Moderationsstatistik nutzt getrennte erforderliche
Fallmetadaten. Der Pilotbericht nennt Basis, Einwilligungsquote,
fehlende Daten und Selbstselektion; die Zahlen belegen keine
medizinische Wirksamkeit. Freiwillige Interviews ergänzen die Messung,
besonders bei Menschen, die selten oder ohne Analytics teilnehmen.

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

# 17 Roadmap und Einführung

Die Planung ist eine Aufwandshypothese ab Projektstart mit benanntem
Team und geklärter Trägerschaft. Empfohlen werden 1 Product Owner,
0,8--1 UX-/Accessibility-Rolle, 2--3 Entwicklungsrollen, 0,5--1 QA-Rolle
sowie feste Anteile für Betrieb/Sicherheit, medizinische Redaktion,
Datenschutz und Moderation. Fachrollen sind keine optionalen
Restaufgaben. Zahlen sind keine Termin- oder Budgetgarantie.

  -----------------------------------------------------------------------
  **Phase**         **Ungefähre Dauer**         **Ergebnis und
                                                Freigabebedingung**
  ----------------- --------------------------- -------------------------
  0 Grundlagen      3--4 Wochen                 D01--D05,
                                                Zweckbestimmung, DSFA,
                                                Zielgruppeninterviews,
                                                Dienstplan und
                                                Hostingprüfung

  1 Prototyp und    4 Wochen                    Klickbarer Kernflow, zwei
  Fundament                                     Nutzertestrunden,
                                                Designsystem, Auth,
                                                Rollen und Betriebsbasis

  2 Persönlicher    4--5 Wochen                 Dashboard, Tagebuch,
  Nutzen                                        Wissen, Verzeichnis,
                                                Export und Löschpfade
                                                funktionieren integriert

  3 Sicherer        5--6 Wochen                 Community, Gruppen,
  Austausch                                     Kontaktfreigabe, Chat,
                                                Moderation und sichere
                                                Mitteilungen

  4 Gesamtabnahme   3--4 Wochen                 Vollständige Testpakete,
                                                Sicherheitsreview,
                                                Restore, Redaktion,
                                                Krisen- und Supportübung

  5 Geschlossener   4--6 Wochen                 40--60 freiwillige
  Pilot                                         Erwachsene, betreute
                                                Einführung, Nutzen- und
                                                Schutzreview

  6 Öffentliche     Nach Gate                   Stufenweise Einladung;
  Einführung                                    Pentest und festgelegte
                                                Releasekriterien
                                                bestanden
  -----------------------------------------------------------------------

Als grober Rahmen ergeben sich etwa 23--29 Wochen bis Pilotabschluss.
Contentaufbau, Datenschutzprüfung und Dienstleisterbeschaffung laufen
parallel zu geeigneten Entwicklungsarbeiten. Abhängigkeiten können den
Kalender verlängern. Kapazität und Kosten werden nach Prototyp und
Lieferantenangeboten neu geschätzt; laufende Moderation und Betrieb
erhalten ein eigenes Budget.

## Rollout und Stoppkriterien

Zuerst Mitarbeitendentest mit fiktiven Daten, dann begrenzte Einladung,
danach Pilot und schrittweises Öffnen. Feature-Schalter erlauben
getrennte Aktivierung. Eine Pilotgruppe wird nicht ohne verfügbare
Moderation aufgenommen. Jeder Schritt besitzt eine verantwortliche
Freigabe und dokumentierte Rückfalloption.

Neue Einladungen werden pausiert bei unberechtigtem Datenzugriff,
unzuverlässiger Kontaktfreigabe, nicht funktionierender Löschung,
überlasteter Moderation oder falschem kritischem Hilfeweg. Die
betroffene Funktion wird eingeschränkt; Informationen an Betroffene
folgen dem Incidentprozess. Wiederaufnahme erst nach Behebung und
Retest.

## Ausbau nach Nutzenbeleg

Phase 2 startet nach stabilem Betrieb und Pilotreview mit Matching über
Interessen, Peer-Angeboten und Events. Erfolgskriterium ist ein
nachgewiesener Bedarf und tragfähiger Schutzprozess, nicht nur
Nutzungswachstum. Phase 3 entwickelt native Apps und zusätzliche
Gesundheits- oder Fachpersonenfunktionen als eigene Spezifikationen. Vor
jeder Gesundheitsinterpretation wird die regulatorische Einordnung
erneut entschieden; Angehörige erhalten keine impliziten Rechte auf
bestehende Tagebücher.

# 18 Risiken und offene Entscheidungen

## Risikoregister

Bewertung jeweils für Eintrittswahrscheinlichkeit und Schadensausmass: H
= hoch, M = mittel. Die Einstufung ist eine anfängliche
Projektbewertung; Restrisiken werden vor jedem Gate neu bewertet.
Risikoakzeptanz hat eine verantwortliche Person und einen Termin.

  -------------------------------------------------------------------------------------
  **Risiko und          **Gegenmassnahme und Frühindikator**  **Verantwortung**
  Bewertung**                                                 
  --------------------- ------------------------------------- -------------------------
  R01 Gesundheitsdaten  Getrennte Rechte, minimale Felder,    Technik und Datenschutz
  offengelegt · H/H     direkte Fremdzugriffstests; jeder     
                        Fehlzugriff stoppt Rollout            

  R02 Belästigung oder  Zustimmung, Block, Limits, betreute   Moderationsleitung
  Ausnutzung · H/H      Moderation; steigende Falllast und    
                        Wiederholungen prüfen                 

  R03 Medizinische      Keine Diagnosefunktion, klare Skalen, Medizinische Leitung
  Fehlinterpretation ·  fachlich geprüfte Texte;              
  M/H                   Missverständnisse im Test             

  R04 Krisenerwartung   Sichtbare Grenzen, aktuelle           Moderation und
  wird nicht erfüllt ·  Hilfewege, Schulung; falsche          Krisenfachperson
  M/H                   24/7-Erwartung ist Launchblocker      

  R05 Moderation        Kapazität vor Einladungen,            Trägerschaft
  überlastet · H/H      Vertretung, Fristmonitoring;          
                        Rückstand \> 1 Betriebstag eskalieren 

  R06 Nutzung zu        Kurze Wege, freiwillige Eingaben,     Design und Produkt
  anstrengend · H/M     Betroffenenprüfung; Abbruch und       
                        Hilfeabhängigkeit im Test             

  R07 Community bleibt  Kleine betreute Gruppen, ehrliche     Community-Verantwortung
  leer · M/M            Impulse, kein künstliches Engagement; 
                        unbeantwortete Fragen prüfen          

  R08 Wissen oder       Termine, automatische Rücknahme,      Redaktion
  Verzeichnis veraltet  Fachzuständigkeit; überfälliger       
  · M/H                 Arbeitsvorrat                         

  R09 Umfang oder       Feste MVP-Grenze und Change Review;   Produkt und
  Regulierung wächst ·  neue medizinische Aussage erfordert   Rechtsberatung
  H/H                   D02-Neubewertung                      

  R10 Betrieb nicht     Jahresbudget für Betrieb, Redaktion   Trägerschaft
  finanziert · M/H      und Moderation vor Pilot; keine       
                        Einladung ohne Mindestdeckung         

  R11 Lieferanten und   Vertrags- und Länderprüfung,          Datenschutz und Betrieb
  Auslandzugriffe · M/H Zugriffskontrolle, Exitplan; neue     
                        Unterauftragsbearbeiter prüfen        

  R12 Ausschluss durch  Öffentliche Inhalte, kein             Produkt und
  Zugangshürden · M/M   Diagnosenachweis, alternative Tests;  Betroffenenbeirat
                        Verständlichkeit der                  
                        Zielgruppengrenze prüfen              
  -------------------------------------------------------------------------------------

## Kritische Abhängigkeiten

Startbestand erfordert verfügbare medizinische Prüfpersonen,
Quellenrechte und zuständige Verzeichnisredaktion. Messaging hängt von
Kontaktzuständen, Blockierung, Meldung und Zustellkontrolle ab.
Gesundheitsfunktionen hängen von Einwilligungs-, Export- und Löschpfaden
ab. Der Launch hängt zusätzlich von vertraglich geklärtem Hosting,
Krisenfachprüfung, Support und Wiederherstellung ab.

Es wird keine bestehende Kooperation mit MS-Organisationen oder
Fachpersonen vorausgesetzt. Geeignete Partner können angefragt werden;
Namen und Logos dürfen erst mit geklärter Berechtigung verwendet werden.
Eine spätere Forschungskomponente benötigt eigene Ziele,
Zuständigkeiten, rechtliche Prüfung und gegebenenfalls weitere fachliche
Verfahren.

## Entscheidungsregister und Übergabe

Die folgenden Punkte sind konkrete Freigabearbeiten. Bis zur
Entscheidung gelten die beschriebenen Schutzvorgaben; ungeklärte
rechtliche oder klinische Fragen werden nicht durch Annahmen als gelöst
markiert.

  --------------------------------------------------------------------------
  **ID und             **Zuständig und spätester   **Benötigtes Ergebnis**
  Entscheidung**       Zeitpunkt**                 
  -------------------- --------------------------- -------------------------
  D01 Trägerschaft und Trägerschaft und            Verantwortlicher, CH DSG,
  Rechtsrahmen         Rechtsberatung · vor        DSGVO-Prüfung,
                       produktiven Daten           Rechtsgrundlagen je
                                                   Zweck, Rechtefristen,
                                                   Vertragstexte

  D02 Zweckbestimmung  Medizinische und            Schriftliche Einordnung
  und Skalen           regulatorische Fachprüfung  von MVP, Skalen, Export,
                       · vor Inhalts- und          Texten und Vermarktung;
                       Designfreeze                Änderungsprozess

  D03 Moderation und   Trägerschaft, Moderation,   Dienstplan, Vertretung,
  Krise                Krisenfachperson · vor      Eskalation, aktuelle
                       Pilot                       Hilfewege, trainiertes
                                                   Krisenprotokoll

  D04 Hosting und      Technik und Datenschutz ·   CH-Regionen,
  Lieferanten          vor Beschaffung             Zugriffsländer, Verträge,
                                                   Unteraufträge, Schlüssel,
                                                   Exit- und
                                                   Löschmöglichkeiten

  D05 Aufbewahrung und Datenschutz und             Freigegebene Fristen,
  DSFA                 Trägerschaft · vor          Ausnahmegründe, DSFA,
                       produktiven Daten           Restrisiken und
                                                   erforderliche
                                                   Konsultation

  D06 Pilotziele und   Produkt und                 Einladungsweg,
  Beteiligung          Betroffenenvertretung · vor Stichprobe, verständliche
                       Pilot                       Teilnahmeinformation,
                                                   Ziele und Auswertung

  D07                  Technische Leitung · vor    Versionen, Echtzeitkanal,
  Architekturdetails   Implementierungsfreeze      Auth-Dienst, RLS-Konzept,
  und Kapazität                                    Lastprofil und
                                                   Betriebskosten

  D08 Redaktion und    Medizinische Leitung und    Prüfer, Quellenrechte,
  Nutzungsrechte       Redaktion · vor Publikation Startbestand,
                                                   Aktualisierung und
                                                   Rückzug

  D09 Name             Trägerschaft und Produkt ·  Geprüfter Produktname,
  Finanzierung und     vor öffentlichem Launch     laufendes Budget,
  Ausbau                                           Partnerrechte und
                                                   priorisierte
                                                   Folgevorhaben
  --------------------------------------------------------------------------

## Übergabepaket für die Umsetzung

Aus dem PRD entstehen ein Backlog mit den 64 FR-IDs, ein Designboard mit
S01--S61, ein Testregister QA01--QA10, ein Datenwörterbuch und
versionierte Schnittstellenverträge. Zu jeder Story gehören Zielscreen,
fachliche Regeln, benötigte Rolle, Datenzugriff und Abnahmenachweis.
Architekturentscheidungen werden mit Alternativen und Schutzfolgen
dokumentiert. Das PRD enthält absichtlich keinen Implementierungscode.

Die Produktverantwortung führt ein Änderungsprotokoll mit Version,
Datum, betroffenen IDs, Freigabe und Auswirkung. Neue Funktionen dürfen
IDs ergänzen, aber veröffentlichte Bedeutungen nicht still ändern.
Umfangs- und Schutzänderungen werden vor Entwicklung geprüft, kritische
Fehlerbehebungen folgen dem Incidentprozess mit nachträglicher
Dokumentation.

**Freigabeprotokoll** Für Produkt, Technik, Moderation, medizinische
Redaktion und Datenschutz werden Name, Entscheidung, Datum, offene
Auflagen und Frist dokumentiert. Dieses Dokument behauptet keine bereits
erteilte fachliche Freigabe. Erst nach Schliessen der erforderlichen
Entscheidungen und Bestehen des Releasegates wird Version 1.0 als
freigegebene Umsetzungsbaseline geführt.

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
