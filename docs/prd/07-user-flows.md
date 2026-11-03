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
