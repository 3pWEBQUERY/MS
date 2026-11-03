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
