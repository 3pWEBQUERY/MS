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
