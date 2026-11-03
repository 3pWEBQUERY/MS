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
