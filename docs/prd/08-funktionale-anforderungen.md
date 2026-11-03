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
