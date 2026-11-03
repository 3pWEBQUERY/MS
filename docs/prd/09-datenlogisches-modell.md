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
