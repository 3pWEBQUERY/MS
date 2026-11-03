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
