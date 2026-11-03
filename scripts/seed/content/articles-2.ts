/** Wissensartikel (redaktionelle Entwürfe mit Demo-Prüfung). Teil des Startbestands (CON08), siehe scripts/seed/content/run.ts. */
import { NEURO, PSY, SOZIAL, type SeedArticle } from "./shared";
import { SRC } from "./sources";

export const ARTICLES_2: SeedArticle[] = [
  {
    slug: "krankenversicherung-und-ms",
    topic: "arbeit-recht",
    title: "Krankenversicherung und MS",
    summary:
      "Die Grundversicherung ist in der Schweiz obligatorisch und muss alle Menschen unabhängig vom Gesundheitszustand aufnehmen. Bei Zusatzversicherungen gelten andere Regeln. Ein Überblick über das, was du wissen solltest.",
    minutes: 5,
    medical: false,
    specialty: SOZIAL,
    sources: [SRC.kvg, SRC.bag, SRC.omkv],
    body: `## Grundversicherung: für alle gleich
Die obligatorische Krankenpflegeversicherung, kurz Grundversicherung, ist im Krankenversicherungsgesetz (KVG) geregelt. Jede Krankenkasse muss dich in die Grundversicherung aufnehmen – unabhängig von deinem Gesundheitszustand. Die versicherten Leistungen sind bei allen Kassen gleich.

## Wechsel der Grundversicherung
Du kannst die Grundversicherung zu den gesetzlichen Terminen wechseln, auch mit MS. Die neue Kasse darf dich nicht ablehnen. Unterschiede gibt es bei Prämien, Versicherungsmodellen und Franchise.

## Franchise und Kostenbeteiligung
Die Franchise ist der Betrag, den du pro Jahr selbst bezahlst, bevor die Kasse Kosten übernimmt. Dazu kommt ein Selbstbehalt. Bei regelmässigen Behandlungen kann eine tiefere Franchise sinnvoll sein. Rechne nach, was in deiner Situation günstiger ist.

## Zusatzversicherungen: andere Regeln
Zusatzversicherungen, etwa für Spitalkomfort oder Komplementärmedizin, unterliegen nicht dem KVG. Versicherer dürfen hier Gesundheitsfragen stellen, Vorbehalte anbringen oder einen Antrag ablehnen. Kündige eine bestehende Zusatzversicherung deshalb erst, wenn du eine schriftliche Zusage für eine neue hast.

## Prämienverbilligung
Wer in bescheidenen wirtschaftlichen Verhältnissen lebt, hat Anspruch auf eine Verbilligung der Prämien. Zuständig ist der Wohnkanton; die Regeln unterscheiden sich.

## Bei Problemen
Lehnt die Kasse eine Leistung ab, kannst du eine schriftliche Begründung verlangen. Die Ombudsstelle Krankenversicherung vermittelt gemäss eigenen Angaben kostenlos bei Konflikten mit deiner Krankenversicherung. Dieser Text ersetzt keine Rechtsberatung.`,
  },
  {
    slug: "partnerschaft-und-ms",
    topic: "familie-beziehungen",
    title: "Partnerschaft und MS",
    summary:
      "MS betrifft auch die Beziehung. Offene Gespräche, faire Rollenverteilung und Unterstützung von aussen können helfen. Auch Veränderungen in der Sexualität sind häufig und ansprechbar.",
    minutes: 5,
    medical: true,
    specialty: PSY,
    sources: [SRC.msch, SRC.nice],
    body: `## Gemeinsam mit einer neuen Situation umgehen
Eine MS-Diagnose verändert nicht nur das Leben der betroffenen Person, sondern auch das der Partnerin oder des Partners. Beide haben eigene Sorgen, Fragen und Gefühle. Es hilft, diese Unterschiede anzuerkennen.

## Reden – auch über Schwieriges
Unsichtbare Beschwerden wie Fatigue oder Konzentrationsprobleme sind für andere schwer nachvollziehbar. Erkläre, wie sich ein schlechter Tag anfühlt und was dir dann hilft. Umgekehrt darf auch dein Gegenüber sagen, was belastet.

## Rollen und Aufgaben
Wenn sich die Belastbarkeit verändert, verschieben sich oft Aufgaben im Haushalt oder in der Familie. Sprecht offen darüber, was fair ist, und plant Entlastung ein, damit niemand dauerhaft überfordert ist. Angehörige dürfen sich ebenfalls Unterstützung holen.

## Sexualität
MS kann das sexuelle Erleben beeinflussen, etwa durch Fatigue, veränderte Empfindungen, Blasenbeschwerden oder Medikamente. Das ist häufig und kein Grund zur Scham. Viele Ursachen sind behandelbar. Sprich das Thema bei deinem Behandlungsteam an; auch Fachpersonen der Urologie, Gynäkologie oder Sexualberatung können helfen.

## Unterstützung von aussen
Paarberatung kann helfen, festgefahrene Situationen zu lösen. Die Schweizerische MS-Gesellschaft bietet Beratung auch für Angehörige an. Unter «Hilfe finden» findest du weitere Angebote.

## Nähe hat viele Formen
Eine gute Beziehung misst sich nicht daran, wie viel ihr gemeinsam unternehmt. Auch ruhige Momente, Humor und kleine Gesten schaffen Nähe.`,
  },
  {
    slug: "kinderwunsch-und-schwangerschaft",
    topic: "familie-beziehungen",
    title: "Kinderwunsch und Schwangerschaft",
    summary:
      "MS spricht grundsätzlich nicht gegen eine Schwangerschaft. Wichtig ist eine frühe Planung mit dem Behandlungsteam, weil manche Therapien vor einer Schwangerschaft angepasst werden müssen.",
    minutes: 5,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.kknms, SRC.nice],
    body: `## Kinder und MS – das geht
Viele Menschen mit MS werden Eltern. MS beeinträchtigt die Fruchtbarkeit nach heutigem Wissen nicht wesentlich, und eine Schwangerschaft verschlechtert den langfristigen Verlauf in der Regel nicht.

## Früh planen
Wenn du dir Kinder wünschst, sprich möglichst früh mit deinem Behandlungsteam darüber – idealerweise bevor du schwanger wirst. Manche verlaufsmodifizierenden Therapien müssen vor einer Schwangerschaft pausiert, umgestellt oder mit Abstand beendet werden. Setze eine Therapie aber nie eigenständig ab.

## Während der Schwangerschaft
Studien zeigen, dass Schübe während der Schwangerschaft, besonders in den letzten Monaten, oft seltener auftreten. In den ersten Monaten nach der Geburt kann das Risiko für einen Schub vorübergehend steigen. Gemeinsam mit dem Team lässt sich planen, wie diese Zeit begleitet wird.

## Geburt und Stillen
Eine MS ist meist kein Grund für einen bestimmten Geburtsmodus; auch eine Periduralanästhesie ist in der Regel möglich. Ob und wie lange Stillen mit deiner Behandlung vereinbar ist, besprichst du am besten vor der Geburt.

## Wird MS vererbt?
Kinder von Menschen mit MS haben ein etwas höheres Risiko, selbst an MS zu erkranken, als Kinder ohne Familienvorgeschichte. Die allermeisten Kinder erkranken aber nicht.

## Unterstützung im Alltag
Ein Baby kostet viel Energie. Plane Entlastung durch Familie, Freundeskreis oder Angebote wie Spitex und Entlastungsdienste ein. Auch das gilt für alle Eltern – nicht nur mit MS.`,
  },
  {
    slug: "mit-kindern-ueber-ms-sprechen",
    topic: "familie-beziehungen",
    title: "Mit Kindern über MS sprechen",
    summary:
      "Kinder merken, wenn sich etwas verändert. Ehrliche, altersgerechte Erklärungen geben ihnen Sicherheit. Wichtig ist die Botschaft: MS ist nicht ansteckend, und niemand ist schuld.",
    minutes: 4,
    medical: false,
    specialty: PSY,
    sources: [SRC.msch, SRC.msif],
    body: `## Warum Offenheit hilft
Kinder spüren Veränderungen, auch wenn niemand darüber spricht. Ohne Erklärung füllen sie Lücken oft mit eigenen, manchmal beängstigenden Vorstellungen. Eine ehrliche, ruhige Erklärung kann entlasten.

## Altersgerecht erklären
- Kleine Kinder brauchen einfache Bilder: «Manchmal sind die Nerven in meinem Körper müde, dann brauche ich mehr Pausen.»
- Schulkinder verstehen schon mehr über den Körper und dürfen Fragen stellen.
- Jugendliche möchten oft genauer wissen, was MS ist, und sich auch selbst informieren.

## Wichtige Botschaften
- MS ist nicht ansteckend.
- Niemand ist schuld – auch das Kind nicht.
- Es gibt Ärztinnen und Ärzte, die helfen.
- Gefühle wie Angst oder Wut sind erlaubt.

## Fragen zulassen
Kinder kommen oft später mit Fragen, manchmal in ungewöhnlichen Momenten. Es ist in Ordnung zu sagen: «Das weiss ich nicht, aber ich frage nach.» Wichtig ist, dass das Gespräch nicht einmalig bleibt.

## Kinder nicht überfordern
Kinder dürfen helfen, sollen aber nicht dauerhaft Verantwortung übernehmen, die ihrem Alter nicht entspricht. Achte darauf, dass Spiel, Freundschaften und Schule ihren Platz behalten.

## Material und Unterstützung
Patientenorganisationen bieten teilweise kindgerechte Bücher und Broschüren an. Bei Unsicherheit können Beratungsstellen oder Fachpersonen der Kinder- und Jugendpsychologie begleiten.`,
  },
  {
    slug: "bewegung-und-koerperliche-aktivitaet",
    topic: "bewegung",
    title: "Bewegung und körperliche Aktivität",
    summary:
      "Regelmässige, angepasste Bewegung kann Kraft, Ausdauer, Gleichgewicht und Wohlbefinden fördern – auch mit MS. Entscheidend ist, eine Form zu finden, die zu deinem Körper und deiner Energie passt.",
    minutes: 5,
    medical: true,
    specialty: "Physiotherapie (Demo-Prüfung)",
    sources: [SRC.nice, SRC.physio, SRC.msch],
    body: `## Bewegung ist erlaubt – und oft hilfreich
Früher wurde Menschen mit MS manchmal geraten, sich zu schonen. Heute weiss man, dass regelmässige, angepasste Bewegung für viele Menschen mit MS sicher ist und Kraft, Ausdauer, Gleichgewicht und Stimmung verbessern kann. Auch auf Fatigue kann sie sich langfristig positiv auswirken.

## Verschiedene Arten von Bewegung
- Ausdauer: zum Beispiel Gehen, Velofahren, Schwimmen
- Kraft: Übungen mit dem eigenen Körpergewicht oder leichten Gewichten
- Gleichgewicht und Koordination: etwa gezielte Übungen, Tai-Chi oder Yoga
- Beweglichkeit: Dehnen kann bei Muskelsteifigkeit angenehm sein

## Das richtige Mass finden
Starte langsam und steigere dich schrittweise. Leichte, vorübergehende Erschöpfung nach dem Training ist normal. Wenn du dich lange nicht davon erholst, war es vermutlich zu viel. Plane Pausen ein und trainiere zu Tageszeiten, an denen du mehr Energie hast.

## Bei Wärmeempfindlichkeit
Wärme kann Beschwerden vorübergehend verstärken. Kühle Räume, Schwimmen in nicht zu warmem Wasser, Kühlwesten oder Training am Morgen können helfen.

## Begleitung durch Fachpersonen
Physiotherapeutinnen und Physiotherapeuten können ein Programm zusammenstellen, das zu deinen Möglichkeiten passt, und dich bei Gleichgewichtsproblemen oder Spastik gezielt unterstützen. Bei ärztlicher Verordnung übernimmt die Grundversicherung in der Regel die Kosten.

## Sicherheit
Sprich vor einem neuen, intensiven Training mit deinem Behandlungsteam, besonders wenn du unsicher auf den Beinen bist oder weitere Erkrankungen hast. Bewegung ergänzt die Behandlung, ersetzt sie aber nicht.`,
  },
  {
    slug: "physiotherapie-und-ergotherapie",
    topic: "bewegung",
    title: "Physiotherapie, Ergotherapie und Logopädie",
    summary:
      "Therapien unterstützen dich dabei, Fähigkeiten zu erhalten und den Alltag zu erleichtern. Physiotherapie arbeitet an Bewegung, Ergotherapie an Alltagsaufgaben, Logopädie an Sprechen und Schlucken.",
    minutes: 5,
    medical: true,
    specialty: "Rehabilitation (Demo-Prüfung)",
    sources: [SRC.physio, SRC.ergo, SRC.nice],
    body: `## Wofür Therapien da sind
Therapien setzen dort an, wo MS im Alltag einschränkt. Ziel ist, Fähigkeiten zu erhalten oder zu verbessern, Belastungen zu verringern und Selbstständigkeit zu fördern. Welche Therapie sinnvoll ist, hängt von deinen Beschwerden und Zielen ab.

## Physiotherapie
Die Physiotherapie arbeitet an Kraft, Ausdauer, Gleichgewicht, Gehen und Beweglichkeit. Sie kann bei Spastik, Schmerzen oder Gangunsicherheit helfen und Übungen für zu Hause mitgeben. Auch Beckenbodentraining bei Blasenbeschwerden gehört dazu.

## Ergotherapie
Die Ergotherapie fragt: Was möchtest du im Alltag tun – und was hindert dich daran? Sie erarbeitet Strategien zum Energiemanagement, passt Arbeitsplatz und Wohnung an und berät zu Hilfsmitteln. Auch bei Konzentrations- oder Gedächtnisschwierigkeiten kann sie unterstützen.

## Logopädie
Wenn das Sprechen undeutlicher wird oder das Schlucken Mühe macht, kann Logopädie helfen. Sie übt gezielt und gibt Tipps, damit Essen und Trinken sicherer werden.

## Kosten
Physiotherapie, Ergotherapie und Logopädie werden von der Grundversicherung übernommen, wenn sie ärztlich verordnet sind; Franchise und Selbstbehalt gelten. Die Zahl der Sitzungen pro Verordnung ist begrenzt, kann aber verlängert werden.

## Die passende Fachperson finden
Die Berufsverbände physioswiss, der ErgotherapeutInnen-Verband Schweiz und der Deutschschweizer Logopädinnen- und Logopädenverband bieten Verzeichnisse an. Frag nach, ob jemand Erfahrung mit neurologischen Erkrankungen hat.`,
  },
  {
    slug: "stimmung-angst-und-depression",
    topic: "psyche",
    title: "Stimmung, Ängste und Depression",
    summary:
      "Gedrückte Stimmung, Ängste und Depressionen kommen bei Menschen mit MS häufiger vor. Sie sind kein Zeichen von Schwäche und gut behandelbar. Hilfe zu holen lohnt sich.",
    minutes: 5,
    medical: true,
    specialty: PSY,
    sources: [SRC.nice, SRC.promentesana, SRC.dargebotene],
    body: `## Gefühle gehören dazu
Mit einer chronischen Erkrankung zu leben, ist anstrengend. Traurigkeit, Sorgen und Unsicherheit sind verständliche Reaktionen. Manchmal entwickeln sich daraus aber anhaltende Beschwerden, die den Alltag stark belasten.

## Häufiger bei MS
Depressionen und Angststörungen treten bei Menschen mit MS häufiger auf als in der Allgemeinbevölkerung. Gründe sind die Belastung durch die Erkrankung, aber auch direkte Veränderungen im Nervensystem. Auch manche Medikamente können die Stimmung beeinflussen.

## Mögliche Anzeichen einer Depression
- über Wochen gedrückte Stimmung oder innere Leere
- Verlust von Interesse und Freude
- anhaltende Hoffnungslosigkeit oder Schuldgefühle
- Schlafprobleme, Antriebslosigkeit, verändertes Essverhalten
- Gedanken, nicht mehr leben zu wollen

Einige dieser Anzeichen ähneln Fatigue. Eine Fachperson kann helfen, das zu unterscheiden.

## Hilfe ist möglich
Depressionen und Ängste lassen sich gut behandeln, zum Beispiel mit Psychotherapie, Medikamenten oder einer Kombination. Psychologische Psychotherapie wird in der Schweiz auf ärztliche Anordnung von der Grundversicherung übernommen. Sprich deine Stimmung bei deinem Behandlungsteam oder deiner Hausärztin, deinem Hausarzt an.

## Wenn es akut wird
Wenn du an Suizid denkst oder dich in einer akuten Krise befindest, wende dich sofort an Hilfe: Die Dargebotene Hand ist unter Telefon 143 rund um die Uhr erreichbar, bei unmittelbarer Gefahr der Sanitätsnotruf 144. Weitere Hilfewege findest du auf der Seite «Sicherheit und akute Hilfe».

## Kleine Dinge, die guttun können
Kontakt zu Menschen, die dir guttun, Bewegung an der frischen Luft, feste Tagesstrukturen und Austausch mit anderen Betroffenen können unterstützen. Sie ersetzen bei einer Depression aber keine Behandlung.`,
  },
  {
    slug: "konzentration-und-gedaechtnis",
    topic: "psyche",
    title: "Konzentration und Gedächtnis",
    summary:
      "MS kann Denken, Konzentration und Gedächtnis beeinflussen. Diese kognitiven Veränderungen sind oft unauffällig, aber im Alltag spürbar. Es gibt Untersuchungen und Strategien, die helfen.",
    minutes: 5,
    medical: true,
    specialty: NEURO,
    sources: [SRC.nice, SRC.msch, SRC.msif],
    body: `## Was sich verändern kann
Manche Menschen mit MS bemerken, dass sie langsamer denken, sich schlechter konzentrieren oder Dinge leichter vergessen. Auch Multitasking oder das Finden von Wörtern kann schwerer fallen. Fachleute sprechen von kognitiven Veränderungen. Sie sind nicht bei allen vorhanden und oft nur leicht ausgeprägt.

## Was die Leistung zusätzlich beeinflusst
Fatigue, schlechter Schlaf, Stress, gedrückte Stimmung, Wärme oder Medikamente können Konzentration und Gedächtnis zusätzlich beeinträchtigen. Manchmal verbessert sich das Denken deutlich, wenn diese Faktoren behandelt werden.

## Abklärung
Wenn du Veränderungen bemerkst, sprich mit deinem Behandlungsteam. Eine neuropsychologische Untersuchung kann zeigen, welche Bereiche betroffen sind und welche gut funktionieren. Das hilft, gezielte Strategien zu finden – etwa für den Arbeitsplatz.

## Strategien für den Alltag
- Notizen, Listen und Erinnerungen im Kalender nutzen
- eine Sache nach der anderen erledigen
- anspruchsvolle Aufgaben auf energiereiche Tageszeiten legen
- Ablenkungen reduzieren, etwa Benachrichtigungen ausschalten
- feste Plätze für wichtige Gegenstände

## Training und Therapie
Neuropsychologische Therapie und Ergotherapie können mit dir an Strategien arbeiten. Geistig aktiv zu bleiben, Bewegung und ausreichend Erholung können ebenfalls unterstützen.

## Kein Grund zur Scham
Kognitive Veränderungen sagen nichts über deine Intelligenz oder deinen Wert aus. Es kann helfen, nahestehenden Menschen zu erklären, was dir schwerfällt und was dir hilft.`,
  },
  {
    slug: "was-ist-ein-schub",
    topic: "behandlung",
    title: "Was ist ein Schub – und was tun?",
    summary:
      "Ein Schub sind neue oder deutlich verstärkte Beschwerden, die mindestens 24 Stunden anhalten und nicht durch Fieber oder Wärme erklärt sind. Melde dich bei Verdacht auf einen Schub bei deinem Behandlungsteam.",
    minutes: 5,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.kknms, SRC.nice],
    body: `## Was Fachleute unter einem Schub verstehen
Bei einem Schub treten neue neurologische Beschwerden auf oder bekannte Beschwerden verstärken sich deutlich. Damit von einem Schub gesprochen wird, halten sie mindestens 24 Stunden an und liegen zeitlich klar getrennt von einem früheren Schub. Sie entwickeln sich meist über Stunden bis Tage.

## Was kein Schub ist
Nicht jede Verschlechterung ist ein Schub. Wärme, Fieber, Infekte – besonders Harnwegsinfekte –, Stress oder Erschöpfung können bekannte Beschwerden vorübergehend verstärken. Man spricht dann von einem Pseudoschub. Die Beschwerden bessern sich meist, wenn die Ursache wegfällt.

## Was du tun kannst
- Notiere, welche Beschwerden seit wann bestehen und wie stark sie sind.
- Achte auf Fieber oder Anzeichen eines Infekts.
- Melde dich bei deinem Behandlungsteam oder deiner Hausarztpraxis, wenn die Beschwerden länger als einen Tag anhalten.
- Bei plötzlichen, schweren Beschwerden wie Lähmungen, Sprachstörungen oder starken Kopfschmerzen ruf sofort den Sanitätsnotruf 144 an.

## Behandlung eines Schubs
Ob ein Schub behandelt wird, entscheidet das Behandlungsteam gemeinsam mit dir. Häufig wird bei stärkeren Schüben eine kurze, hochdosierte entzündungshemmende Behandlung erwogen, meist mit Kortisonpräparaten. Sie kann die Rückbildung beschleunigen. Leichte Schübe heilen oft auch ohne Behandlung ab.

## Nach dem Schub
Beschwerden bilden sich nach einem Schub häufig ganz oder teilweise zurück, manchmal über Wochen. Physio- oder Ergotherapie können die Erholung unterstützen. Ein Schub kann auch Anlass sein, die Langzeitbehandlung gemeinsam zu überprüfen.

## Keine Diagnose über das Internet
Ob es sich um einen Schub handelt, kann nur eine Fachperson beurteilen. Auch diese Plattform erkennt keine Schübe und wertet deine Einträge nicht aus.`,
  },
  {
    slug: "verlaufsmodifizierende-therapien",
    topic: "behandlung",
    title: "Verlaufsmodifizierende Therapien: das Grundsätzliche",
    summary:
      "Verlaufsmodifizierende Therapien sollen Entzündungsaktivität und Schübe verringern und das Fortschreiten verlangsamen. Welche Therapie passt, ist eine individuelle Entscheidung mit dem Behandlungsteam.",
    minutes: 6,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.kknms, SRC.nice],
    body: `## Was diese Therapien leisten sollen
Verlaufsmodifizierende Therapien – oft auch Basis- oder Immuntherapien genannt – greifen in das Immunsystem ein. Sie sollen die Zahl der Schübe und neuer Entzündungsherde verringern und das Fortschreiten von Beeinträchtigungen verlangsamen. Eine Heilung der MS ist damit nach heutigem Stand nicht möglich.

## Unterschiedliche Wirkweisen und Formen
Es gibt heute zahlreiche zugelassene Wirkstoffe mit unterschiedlichen Wirkmechanismen. Sie werden als Tabletten, Spritzen unter die Haut oder als Infusionen gegeben – in Abständen von täglich bis zu mehreren Monaten. Die Therapien unterscheiden sich auch in Wirksamkeit, möglichen Nebenwirkungen und notwendigen Kontrollen.

## Wie eine Entscheidung entsteht
Welche Therapie infrage kommt, hängt unter anderem ab von:
- Verlaufsform und aktueller Krankheitsaktivität
- bisherigen Behandlungen und Begleiterkrankungen
- Kinderwunsch oder Schwangerschaft
- deinen Wünschen zu Einnahmeform, Kontrollen und Lebensstil
- dem individuellen Nutzen-Risiko-Profil

Eine gute Entscheidung entsteht gemeinsam. Frag nach Vor- und Nachteilen, Alternativen und danach, was passiert, wenn du dich gegen eine Therapie entscheidest.

## Kontrollen gehören dazu
Viele Therapien erfordern regelmässige Blutuntersuchungen und MRI-Kontrollen. Sie dienen deiner Sicherheit und zeigen, ob die Therapie wirkt. Wenn Nebenwirkungen auftreten oder sich die Situation ändert, kann eine Therapie angepasst werden.

## Wichtig
- Setze eine Therapie nie eigenständig ab, sondern sprich vorher mit deinem Team.
- Informationen über einzelne Medikamente aus dem Internet oder aus der Community ersetzen keine individuelle Beratung.
- Diese Plattform empfiehlt keine bestimmten Medikamente.

## Neben der Immuntherapie
Zur Behandlung gehören oft auch Therapien gegen einzelne Beschwerden wie Spastik, Blasenprobleme oder Schmerzen sowie Physio-, Ergotherapie und Rehabilitation.`,
  },
  {
    slug: "rehabilitation-bei-ms",
    topic: "behandlung",
    title: "Rehabilitation bei MS",
    summary:
      "Rehabilitation unterstützt dich dabei, Fähigkeiten zu erhalten oder zurückzugewinnen – ambulant oder in einer Klinik. Sie ist auf deine persönlichen Ziele ausgerichtet.",
    minutes: 4,
    medical: true,
    specialty: "Rehabilitation (Demo-Prüfung)",
    sources: [SRC.msch, SRC.nice],
    body: `## Was Rehabilitation bedeutet
Rehabilitation umfasst Massnahmen, die dir helfen, im Alltag möglichst selbstständig zu bleiben. Sie kann nach einem Schub sinnvoll sein, bei zunehmenden Beschwerden oder um neue Strategien zu lernen. Im Mittelpunkt stehen deine Ziele – etwa sicherer gehen, länger arbeiten oder Energie besser einteilen.

## Ambulant oder stationär
Viele Therapien finden ambulant statt, zum Beispiel regelmässige Physio- oder Ergotherapie in der Nähe. Eine stationäre Rehabilitation in einer spezialisierten Klinik bietet für einige Wochen ein intensives Programm aus mehreren Therapien. Was sinnvoll ist, besprichst du mit deinem Behandlungsteam.

## Ein Team aus Fachpersonen
In der Rehabilitation arbeiten oft verschiedene Berufe zusammen: Medizin, Pflege, Physiotherapie, Ergotherapie, Logopädie, Neuropsychologie und Sozialberatung. Gemeinsam wird ein Plan erstellt und regelmässig überprüft.

## Kosten und Anmeldung
Für eine stationäre Rehabilitation braucht es in der Regel eine ärztliche Anmeldung und eine Kostengutsprache der Krankenversicherung. Das kann einige Zeit dauern. Frag in der Klinik oder bei deinem Team nach, wie der Ablauf ist.

## Nach der Reha
Damit Fortschritte im Alltag bleiben, ist es hilfreich, Übungen und Strategien zu Hause weiterzuführen. Ambulante Therapien können daran anschliessen.`,
  },
  {
    slug: "gesundheitsdaten-und-datenschutz",
    topic: "digital-datenschutz",
    title: "Gesundheitsdaten und Datenschutz in der Schweiz",
    summary:
      "Gesundheitsdaten gelten im Schweizer Datenschutzgesetz als besonders schützenswert. Du hast Rechte, etwa auf Auskunft. Dieser Text erklärt die Grundlagen und gibt Tipps für den Umgang mit Apps und Plattformen.",
    minutes: 5,
    medical: false,
    specialty: "Datenschutz (Demo-Prüfung)",
    sources: [SRC.dsg, SRC.edoebFaq, SRC.edoeb],
    body: `## Besonders schützenswerte Daten
Das Bundesgesetz über den Datenschutz (DSG) regelt, wie Personendaten in der Schweiz bearbeitet werden dürfen. Die revidierte Fassung gilt seit dem 1. September 2023. Daten über die Gesundheit gehören zu den besonders schützenswerten Personendaten. Für sie gelten strengere Regeln, etwa wenn sie an Dritte bekanntgegeben werden.

## Grundsätze
- Daten dürfen nur für erkennbare Zwecke bearbeitet werden.
- Es sollen nur so viele Daten wie nötig bearbeitet werden.
- Die Daten müssen angemessen geschützt sein.
- Datenschutz soll schon bei der Gestaltung eines Angebots berücksichtigt werden.

## Deine Rechte
Du kannst von einem Anbieter Auskunft darüber verlangen, welche Daten über dich bearbeitet werden. Unter bestimmten Voraussetzungen kannst du verlangen, dass Daten berichtigt, gelöscht oder in einem gängigen Format herausgegeben werden. Bei Fragen hilft der Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte (EDÖB) mit Informationen weiter.

## Tipps für Apps und Plattformen
- Lies, wer deine Daten sieht und wofür sie verwendet werden.
- Prüfe, ob Gesundheitsdaten freiwillig sind und ob du sie wieder löschen kannst.
- Sei zurückhaltend mit Angaben, die dich identifizierbar machen, etwa Name, Wohnort oder Arbeitgeber.
- Verwende ein sicheres, einzigartiges Passwort und, wenn möglich, eine Zwei-Faktor-Anmeldung.

## Auf dieser Plattform
Dein Tagebuch ist nur für dich sichtbar und getrennt von der Community. Du kannst deine Daten jederzeit exportieren und löschen. Details findest du in der Datenschutzinformation.

## Kein Rechtsrat
Dieser Text erklärt allgemeine Grundsätze und ersetzt keine rechtliche Beratung im Einzelfall.`,
  },
  {
    slug: "barrierefreiheit-im-netz",
    topic: "digital-datenschutz",
    title: "Barrierearm im Netz unterwegs",
    summary:
      "Websites können so gestaltet werden, dass sie mit Sehbeeinträchtigung, zittrigen Händen oder Fatigue gut nutzbar sind. Dieser Text erklärt, worauf es ankommt und welche Einstellungen dir helfen können.",
    minutes: 4,
    medical: false,
    specialty: "Barrierefreiheit (Demo-Prüfung)",
    sources: [SRC.wcag, SRC.reflow, SRC.behig],
    body: `## Was barrierearm bedeutet
Eine barrierearme Website lässt sich von möglichst vielen Menschen nutzen – unabhängig davon, ob sie schlecht sehen, die Maus kaum bedienen können oder schnell erschöpft sind. Internationale Grundlage sind die Web Content Accessibility Guidelines (WCAG) des W3C, aktuell in der Version 2.2.

## Worauf gute Websites achten
- ausreichender Kontrast zwischen Text und Hintergrund
- Bedienung vollständig mit der Tastatur
- grosse, gut treffbare Schaltflächen
- Texte, die sich auf 200 Prozent vergrössern lassen, ohne dass Inhalte verloren gehen
- Inhalte, die auch auf schmalen Bildschirmen ohne seitliches Scrollen lesbar bleiben
- verständliche Fehlermeldungen und keine Zeitlimits

## Einstellungen, die dir helfen können
- Zoom im Browser: meist mit Ctrl und Plus beziehungsweise Cmd und Plus
- Vorlesefunktionen und Screenreader des Betriebssystems
- reduzierte Bewegung in den Systemeinstellungen
- Diktierfunktion statt Tippen, wenn die Hände müde sind

## Auf dieser Plattform
Unter «Anzeige und Bedienung» kannst du eine einfache Ansicht wählen, die Schrift vergrössern und Bewegungen reduzieren – auch ohne Konto. Ziel ist die Konformität mit WCAG 2.2 auf Stufe AA. Wenn dir eine Barriere auffällt, melde sie bitte über das Kontaktformular.

## Rechtlicher Rahmen
In der Schweiz regelt das Behindertengleichstellungsgesetz unter anderem den Zugang zu Dienstleistungen des Bundes. Für private Angebote gelten teilweise andere Regeln. Dieser Text gibt einen allgemeinen Überblick und ist keine Rechtsberatung.`,
  },
];
