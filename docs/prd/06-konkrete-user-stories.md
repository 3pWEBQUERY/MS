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
