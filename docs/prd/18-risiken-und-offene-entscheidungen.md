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
