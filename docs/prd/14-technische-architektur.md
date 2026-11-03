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
