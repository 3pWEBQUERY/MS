/** Wissensartikel (redaktionelle Entwürfe mit Demo-Prüfung). Teil des Startbestands (CON08), siehe scripts/seed/content/run.ts. */
import { NEURO, SOZIAL, type SeedArticle } from "./shared";
import { SRC } from "./sources";

export const ARTICLES_1: SeedArticle[] = [
  {
    slug: "was-ist-multiple-sklerose",
    topic: "grundlagen",
    title: "Was ist Multiple Sklerose?",
    summary:
      "Multiple Sklerose (MS) ist eine chronische Erkrankung des zentralen Nervensystems. Das Immunsystem greift dabei die Schutzschicht der Nervenfasern an. MS verläuft bei jedem Menschen anders und ist heute gut behandelbar, aber nicht heilbar.",
    minutes: 5,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.who, SRC.atlas],
    body: `## Eine Erkrankung des zentralen Nervensystems
Multiple Sklerose ist eine chronisch-entzündliche Erkrankung von Gehirn, Rückenmark und Sehnerven – also des zentralen Nervensystems. Nach heutigem Wissen richtet sich dabei das eigene Immunsystem fälschlicherweise gegen Strukturen des Nervensystems. Man spricht deshalb von einer Autoimmunerkrankung.

## Was im Körper passiert
Nervenfasern sind von einer Schutzschicht umgeben, dem Myelin. Es sorgt dafür, dass Signale schnell und zuverlässig weitergeleitet werden. Bei MS entstehen an verschiedenen Stellen Entzündungsherde, die das Myelin und mit der Zeit auch die Nervenfasern selbst schädigen können. Signale werden dann langsamer oder unvollständig übertragen. Der Name «Multiple Sklerose» beschreibt die vielen («multiplen») vernarbten («sklerotischen») Stellen, die dabei entstehen können.

## Warum MS so unterschiedlich ist
Welche Beschwerden auftreten, hängt davon ab, wo im Nervensystem Entzündungsherde liegen. Deshalb sieht MS bei jedem Menschen anders aus. Manche erleben vor allem Sehstörungen oder Kribbeln, andere Fatigue, Gleichgewichtsprobleme oder Schwierigkeiten mit der Blase. Viele Beschwerden sind von aussen nicht sichtbar.

## Wer an MS erkrankt
MS wird meist im jungen Erwachsenenalter festgestellt, häufig zwischen 20 und 40 Jahren. Frauen sind deutlich häufiger betroffen als Männer. Weltweit leben laut dem Atlas of MS der internationalen MS-Föderation schätzungsweise rund 2,8 Millionen Menschen mit MS (Stand 2020).

## Was MS nicht ist
- MS ist nicht ansteckend.
- MS wird nicht direkt vererbt. Es gibt eine gewisse familiäre Veranlagung, die meisten Kinder von Menschen mit MS erkranken aber nicht.
- MS bedeutet nicht automatisch einen Rollstuhl. Die Verläufe sind sehr unterschiedlich, und die Behandlungsmöglichkeiten haben sich in den letzten Jahrzehnten stark verbessert.

## Ursachen
Die genauen Ursachen sind noch nicht vollständig geklärt. Die Forschung geht von einem Zusammenspiel aus erblicher Veranlagung und Umweltfaktoren aus. Diskutiert werden unter anderem bestimmte Virusinfektionen, Vitamin-D-Mangel und Rauchen. Niemand ist «schuld» an seiner MS.

## Wie es weitergeht
Wenn du mehr wissen möchtest, findest du unter «Grundlagen» Artikel zu Verlaufsformen und häufigen Beschwerden. Für Fragen zu deiner persönlichen Situation ist dein Behandlungsteam die richtige Anlaufstelle.`,
  },
  {
    slug: "verlaufsformen-der-ms",
    topic: "grundlagen",
    title: "Verlaufsformen der MS verstehen",
    summary:
      "Fachleute unterscheiden bei MS mehrere Verlaufsformen: schubförmig, sekundär progredient und primär progredient. Die Einteilung hilft bei der Behandlungsplanung, sagt aber wenig über den persönlichen Weg aus.",
    minutes: 5,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.msif, SRC.kknms],
    body: `## Warum es Verlaufsformen gibt
MS entwickelt sich bei jedem Menschen anders. Damit Fachpersonen sich verständigen und Behandlungen planen können, werden typische Muster zu Verlaufsformen zusammengefasst. Diese Einteilung beschreibt, was bisher geschehen ist – sie ist keine Vorhersage für die Zukunft.

## Klinisch isoliertes Syndrom (KIS)
Manchmal tritt zum ersten Mal eine Episode mit neurologischen Beschwerden auf, die auf eine Entzündung im zentralen Nervensystem hindeutet, etwa eine Sehnerventzündung. Erfüllt diese erste Episode noch nicht alle Kriterien für eine MS, spricht man von einem klinisch isolierten Syndrom. Nicht jede Person mit KIS entwickelt später eine MS.

## Schubförmig remittierende MS
Die häufigste Form zu Beginn ist die schubförmige MS. Dabei treten Schübe auf: neue oder deutlich verstärkte Beschwerden, die über mindestens 24 Stunden anhalten. Danach bilden sich die Beschwerden ganz oder teilweise zurück. Zwischen den Schüben kann es lange ruhige Phasen geben.

## Sekundär progrediente MS
Bei einem Teil der Menschen mit schubförmiger MS nehmen die Beschwerden nach Jahren allmählich zu, auch unabhängig von Schüben. Diese Form heisst sekundär progrediente MS. Der Übergang ist fliessend und wird oft erst im Rückblick erkannt.

## Primär progrediente MS
Bei einer kleineren Gruppe nehmen die Beschwerden von Beginn an langsam zu, ohne deutliche Schübe. Man spricht von primär progredienter MS. Sie wird häufig etwas später im Leben festgestellt.

## Aktivität und Fortschreiten
Zusätzlich beschreiben Fachpersonen, ob eine MS gerade «aktiv» ist – also ob Schübe oder neue Herde im MRI auftreten – und ob Beschwerden unabhängig davon zunehmen. Diese Zusätze helfen, die aktuelle Situation genauer zu erfassen und Behandlungen anzupassen.

## Was das für dich bedeutet
Die Bezeichnung deiner Verlaufsform ist ein Werkzeug für die Behandlung, kein Urteil. Frag dein Behandlungsteam, was die Einteilung in deinem Fall bedeutet und ob sie sich im Lauf der Zeit verändert hat.`,
  },
  {
    slug: "haeufige-symptome",
    topic: "grundlagen",
    title: "Häufige Beschwerden im Überblick",
    summary:
      "MS kann viele verschiedene Beschwerden verursachen – von Sehstörungen und Kribbeln über Fatigue bis zu Blasenproblemen. Nicht alle treten bei jeder Person auf, und viele sind von aussen nicht sichtbar.",
    minutes: 6,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.nice, SRC.msif],
    body: `## Jede MS ist anders
Welche Beschwerden auftreten, hängt davon ab, welche Bereiche des Nervensystems betroffen sind. Die folgende Übersicht nennt häufige Beschwerden. Sie ist keine Checkliste: Die meisten Menschen mit MS haben nur einige davon, manche vorübergehend, andere dauerhaft.

## Sehen
Eine Entzündung des Sehnervs ist bei vielen das erste Zeichen. Typisch sind verschwommenes Sehen auf einem Auge, Farben wirken blasser, manchmal schmerzt das Auge bei Bewegung. Auch Doppelbilder können vorkommen.

## Gefühl und Empfindung
Kribbeln, Taubheit, ein «pelziges» Gefühl oder veränderte Temperaturwahrnehmung gehören zu den häufigsten Beschwerden. Manche Menschen spüren beim Vorbeugen des Kopfes ein elektrisierendes Gefühl entlang des Rückens.

## Bewegung und Gleichgewicht
- Schwäche in Armen oder Beinen
- Muskelsteifigkeit oder Krämpfe (Spastik)
- Unsicherheit beim Gehen oder Schwindel
- Zittern bei gezielten Bewegungen

## Unsichtbare Beschwerden
Fatigue – eine ausgeprägte, oft plötzliche Erschöpfung – gehört zu den häufigsten und belastendsten Beschwerden. Dazu kommen bei manchen Konzentrations- oder Gedächtnisschwierigkeiten, Schmerzen, Schlafprobleme sowie Veränderungen der Stimmung. Weil diese Beschwerden nicht sichtbar sind, werden sie im Umfeld leicht unterschätzt.

## Blase, Darm und Sexualität
Häufiger Harndrang, Schwierigkeiten beim Entleeren der Blase, Verstopfung oder Veränderungen im sexuellen Erleben sind häufig und gut behandelbar. Es lohnt sich, diese Themen im ärztlichen Gespräch anzusprechen, auch wenn es Überwindung kostet.

## Wann du dich melden solltest
Neue oder deutlich stärkere Beschwerden, die länger als einen Tag anhalten, solltest du mit deinem Behandlungsteam besprechen. Bei plötzlichen, schweren Beschwerden wie Lähmungen, starken Kopfschmerzen oder Sprachstörungen ruf den Sanitätsnotruf 144 an.`,
  },
  {
    slug: "wie-wird-ms-festgestellt",
    topic: "grundlagen",
    title: "Wie wird MS festgestellt?",
    summary:
      "Es gibt keinen einzelnen Test für MS. Die Diagnose entsteht aus Krankengeschichte, neurologischer Untersuchung, MRI-Bildern und oft weiteren Untersuchungen. Dabei werden auch andere mögliche Ursachen ausgeschlossen.",
    minutes: 5,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.kknms, SRC.nice],
    body: `## Ein Puzzle aus mehreren Teilen
Für MS gibt es keinen einzelnen Bluttest. Fachpersonen der Neurologie setzen die Diagnose aus mehreren Bausteinen zusammen. Entscheidend ist, dass Entzündungsherde an verschiedenen Orten im Nervensystem und zu verschiedenen Zeitpunkten nachweisbar sind und dass sich die Beschwerden nicht besser durch eine andere Erkrankung erklären lassen.

## Gespräch und Untersuchung
Am Anfang stehen ein ausführliches Gespräch über bisherige Beschwerden und eine neurologische Untersuchung. Dabei werden zum Beispiel Reflexe, Kraft, Gefühl, Koordination, Gleichgewicht und die Augen geprüft.

## Magnetresonanztomografie (MRI)
Das MRI zeigt Entzündungsherde im Gehirn und im Rückenmark. Oft wird ein Kontrastmittel gegeben, das frische Entzündungen sichtbar machen kann. MRI-Bilder werden auch später zur Verlaufskontrolle eingesetzt.

## Weitere Untersuchungen
- Untersuchung des Nervenwassers (Liquor) über eine Lumbalpunktion, um Entzündungszeichen nachzuweisen
- Messung der Nervenleitung, zum Beispiel der Sehbahn (evozierte Potenziale)
- Blutuntersuchungen, vor allem um andere Ursachen auszuschliessen

## Die McDonald-Kriterien
Für die Diagnose verwenden Fachpersonen international abgestimmte Kriterien, die sogenannten McDonald-Kriterien. Sie werden regelmässig an neue Forschungsergebnisse angepasst und ermöglichen heute oft eine frühere Diagnose als noch vor einigen Jahren.

## Wenn es Zeit braucht
Manchmal lässt sich nicht sofort eine klare Aussage machen. Das Warten auf eine Diagnose kann sehr belastend sein. Es ist in Ordnung, nachzufragen, wie es weitergeht und was die einzelnen Befunde bedeuten. Eine Zweitmeinung einzuholen ist ebenfalls möglich.`,
  },
  {
    slug: "die-ersten-wochen-nach-der-diagnose",
    topic: "neu-mit-ms",
    title: "Die ersten Wochen nach der Diagnose",
    summary:
      "Nach der Diagnose ist vieles neu und manchmal überwältigend. Du musst nicht alles sofort verstehen oder entscheiden. Dieser Text zeigt, was in der ersten Zeit helfen kann.",
    minutes: 4,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.nice],
    body: `## Alle Gefühle haben Platz
Eine MS-Diagnose löst sehr unterschiedliche Reaktionen aus: Schock, Angst, Trauer, Wut – manchmal auch Erleichterung, weil Beschwerden endlich einen Namen haben. Alle diese Gefühle sind normal. Sie können sich abwechseln und brauchen Zeit.

## Du musst nicht alles auf einmal wissen
Es gibt sehr viele Informationen über MS, und nicht alle sind zuverlässig. Es kann helfen, sich bewusst auf wenige, geprüfte Quellen zu beschränken und Schritt für Schritt vorzugehen. Erfahrungsberichte anderer Menschen können Mut machen, beschreiben aber immer einen persönlichen Weg und keinen allgemeinen Verlauf.

## Dein Behandlungsteam
In der ersten Zeit stehen oft mehrere Termine an: bei der Neurologin oder dem Neurologen, eventuell bei einer MS-Pflegefachperson. Gemeinsam besprecht ihr, ob und welche Behandlung infrage kommt. Viele Entscheidungen müssen nicht am ersten Tag fallen; frag nach, wie viel Zeit du dir lassen kannst.

## Kleine Schritte, die helfen können
- Notiere Fragen, sobald sie dir einfallen, und nimm sie zum nächsten Termin mit.
- Nimm, wenn du möchtest, eine vertraute Person zu wichtigen Gesprächen mit.
- Gönn dir Pausen von der Informationssuche.
- Überlege in Ruhe, wem du von der Diagnose erzählen möchtest.

## Unterstützung annehmen
Die Schweizerische MS-Gesellschaft bietet Beratung und Informationen an, auch für Angehörige. Unter «Hilfe finden» findest du weitere Angebote in deiner Nähe. Wenn dich die Situation stark belastet, darfst du dir auch psychologische Unterstützung holen.

## Und jetzt?
Wenn du magst, lies als Nächstes, wie du dich auf ärztliche Gespräche vorbereiten kannst. Oder leg einfach eine Pause ein – das Wissen läuft dir nicht davon.`,
  },
  {
    slug: "gut-vorbereitet-ins-aerztliche-gespraech",
    topic: "neu-mit-ms",
    title: "Gut vorbereitet ins ärztliche Gespräch",
    summary:
      "Arzttermine sind oft kurz. Mit etwas Vorbereitung kannst du die Zeit besser nutzen: Fragen notieren, Beobachtungen festhalten und wichtige Antworten aufschreiben.",
    minutes: 4,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.nice],
    body: `## Warum Vorbereitung hilft
In einem Termin kommen viele Informationen zusammen. Aufregung oder Fatigue können es schwer machen, sich alles zu merken. Eine kurze Vorbereitung entlastet und sorgt dafür, dass deine wichtigsten Anliegen Platz finden.

## Vor dem Termin
- Schreib deine drei wichtigsten Fragen auf – die wichtigste zuerst.
- Notiere Beschwerden, die neu sind oder sich verändert haben: seit wann, wie stark, in welchen Situationen.
- Halte eine aktuelle Liste deiner Medikamente und Nahrungsergänzungsmittel bereit.
- Überlege, ob du eine vertraute Person mitnehmen möchtest.

## Beobachtungen festhalten
Manche Menschen notieren zwischen den Terminen, wie es ihnen geht, zum Beispiel ihre Energie oder Fatigue. Solche Notizen können helfen, Veränderungen zu beschreiben. Sie ersetzen aber keine Untersuchung, und niemand muss Tagebuch führen. Auf dieser Plattform bleiben deine Einträge privat und werden nicht ausgewertet.

## Während des Gesprächs
Es ist in Ordnung, nachzufragen, wenn du etwas nicht verstehst, oder um eine einfachere Erklärung zu bitten. Du kannst auch fragen, ob du dir Notizen machen darfst oder ob es schriftliche Unterlagen gibt.

## Fragen, die oft hilfreich sind
- Was bedeutet dieser Befund für mich?
- Welche Möglichkeiten gibt es, und was spricht jeweils dafür oder dagegen?
- Wie viel Zeit habe ich für eine Entscheidung?
- Woran merke ich, dass ich mich früher melden sollte?
- Wen kann ich bei Fragen zwischen den Terminen erreichen?

## Nach dem Termin
Schreib die wichtigsten Antworten möglichst bald auf. Wenn später Fragen auftauchen, darfst du dich beim Behandlungsteam melden – das gehört zu einer guten Begleitung dazu.`,
  },
  {
    slug: "wem-erzaehle-ich-von-meiner-diagnose",
    topic: "neu-mit-ms",
    title: "Wem erzähle ich von meiner Diagnose?",
    summary:
      "Ob, wann und wem du von deiner MS erzählst, entscheidest du selbst. Es gibt keine allgemeine Pflicht, die Diagnose offenzulegen. Dieser Text hilft beim Abwägen.",
    minutes: 4,
    medical: false,
    specialty: "Sozialberatung (Demo-Prüfung)",
    sources: [SRC.msch, SRC.compasso],
    body: `## Deine Entscheidung
Eine Diagnose ist eine persönliche Information. Du entscheidest, wer davon erfahren soll, und du darfst dir dafür Zeit nehmen. Manche erzählen es sofort, andere erst nach Monaten oder nur wenigen Menschen.

## Familie und Freundeskreis
Offenheit kann entlasten und Verständnis schaffen, gerade bei unsichtbaren Beschwerden wie Fatigue. Gleichzeitig reagieren Menschen unterschiedlich: mit Sorge, Ratschlägen oder Unsicherheit. Es kann helfen, vorher zu überlegen, was du dir von deinem Gegenüber wünschst – zuhören, praktische Hilfe oder einfach Normalität.

## Am Arbeitsplatz
In der Schweiz musst du deine Diagnose grundsätzlich nicht offenlegen. Ein Arztzeugnis nennt in der Regel nur die Arbeitsunfähigkeit, nicht die Krankheit. Anders kann es sein, wenn deine Gesundheit die Arbeit oder die Sicherheit anderer konkret betrifft. Ein offenes Gespräch kann aber auch Anpassungen ermöglichen. Mehr dazu im Artikel «Arbeiten mit MS».

## Im Internet
Was online steht, lässt sich schwer zurückholen. Überlege, ob du in sozialen Netzwerken unter deinem Namen über deine MS schreiben möchtest. In der Community dieser Plattform bist du mit einem Pseudonym unterwegs, und deine E-Mail-Adresse ist nie sichtbar.

## Hilfreiche Sätze
- «Ich habe MS. Das heisst bei mir vor allem, dass ich schneller erschöpft bin.»
- «Ich möchte dir etwas erzählen, aber im Moment keine Ratschläge.»
- «Wenn ich absage, liegt das nicht an dir.»

## Unterstützung
Beratungsstellen der Schweizerischen MS-Gesellschaft oder von Pro Infirmis können dich beim Abwägen begleiten, etwa vor einem Gespräch mit dem Arbeitgeber. Angebote findest du unter «Hilfe finden».`,
  },
  {
    slug: "fatigue-verstehen",
    topic: "alltag-energie",
    title: "Fatigue verstehen",
    summary:
      "Fatigue ist eine ausgeprägte Erschöpfung, die sich deutlich von normaler Müdigkeit unterscheidet und durch Schlaf oft nicht verschwindet. Sie gehört zu den häufigsten Beschwerden bei MS. Es gibt Wege, besser mit ihr zu leben.",
    minutes: 6,
    medical: true,
    specialty: NEURO,
    sources: [SRC.nice, SRC.msch, SRC.msif],
    body: `## Mehr als Müdigkeit
Fatigue beschreibt eine körperliche und geistige Erschöpfung, die oft unvermittelt auftritt und in keinem Verhältnis zur vorherigen Anstrengung steht. Viele Menschen mit MS nennen sie eines der belastendsten Symptome. Typisch ist, dass Ausruhen oder Schlaf nur teilweise helfen.

## Wie sich Fatigue zeigen kann
- schwere Arme und Beine, schon nach kurzer Belastung
- Mühe, sich zu konzentrieren oder Gesprächen zu folgen
- das Gefühl, «der Akku ist plötzlich leer»
- Zunahme im Lauf des Tages oder bei Wärme

## Mögliche Ursachen
Fatigue kann direkt mit der MS zusammenhängen. Andere Faktoren können sie verstärken: schlechter Schlaf, Schmerzen, gedrückte Stimmung, Infekte, Blutarmut, Schilddrüsenstörungen oder Nebenwirkungen von Medikamenten. Es lohnt sich, Fatigue im ärztlichen Gespräch anzusprechen, damit behandelbare Ursachen erkannt werden.

## Was helfen kann
Internationale Leitlinien, etwa die britische NICE-Leitlinie zu MS, nennen mehrere Ansätze. Was für dich passt, findest du am besten gemeinsam mit deinem Behandlungsteam heraus.
- Energie einteilen: Aufgaben über den Tag verteilen und Pausen einplanen, bevor die Erschöpfung kommt.
- Regelmässige, angepasste Bewegung: Sie kann Fatigue langfristig verringern, auch wenn das zuerst widersprüchlich klingt.
- Kühlung: Bei Wärmeempfindlichkeit helfen kühle Räume, Getränke oder Kühlwesten.
- Unterstützung durch Ergotherapie, die Strategien für Alltag und Beruf erarbeitet.

## Fatigue ist echt
Weil Fatigue unsichtbar ist, wird sie im Umfeld manchmal als Faulheit missverstanden. Sie ist ein anerkanntes Symptom der MS. Es ist in Ordnung, Grenzen zu setzen und Pläne zu ändern.

## Fatigue festhalten
Manche Menschen notieren ihre Fatigue, um Muster zu erkennen, etwa nach bestimmten Tätigkeiten. Auf dieser Plattform kannst du Fatigue freiwillig und getrennt von deiner Energie festhalten. Die Einträge werden nicht bewertet und nicht ausgewertet.`,
  },
  {
    slug: "energie-einteilen-im-alltag",
    topic: "alltag-energie",
    title: "Energie einteilen im Alltag",
    summary:
      "Wer mit wenig Energie haushalten muss, profitiert von Planung: Prioritäten setzen, Aufgaben verteilen und Pausen einbauen. Diese Strategien werden auch Energiemanagement oder «Pacing» genannt.",
    minutes: 5,
    medical: true,
    specialty: "Ergotherapie (Demo-Prüfung)",
    sources: [SRC.nice, SRC.ergo, SRC.msch],
    body: `## Das Bild vom Energiekonto
Viele Menschen stellen sich ihre Kraft wie ein Konto vor: Jede Tätigkeit kostet etwas, Erholung zahlt wieder ein. Mit MS ist das Konto oft kleiner oder schwankt stärker. Ziel des Energiemanagements ist es, nicht ins Minus zu geraten.

## Prioritäten setzen
Überlege, was dir heute wirklich wichtig ist – und was warten, delegiert oder ganz weggelassen werden kann. Eine kurze Liste mit höchstens drei wichtigen Dingen pro Tag kann entlasten.

## Planen und verteilen
- Anstrengende Aufgaben auf Tageszeiten legen, zu denen du meist mehr Energie hast.
- Grosse Aufgaben in kleine Schritte teilen und über mehrere Tage verteilen.
- Pausen fest einplanen, bevor die Erschöpfung kommt – nicht erst danach.
- Nach einem anstrengenden Tag bewusst einen ruhigeren Tag einplanen.

## Kraft sparen bei Alltagsaufgaben
Sitzen statt Stehen, Wege bündeln, Hilfsmittel nutzen oder Einkäufe liefern lassen: Kleine Anpassungen sparen viel Energie. Ergotherapeutinnen und Ergotherapeuten können mit dir konkrete Lösungen für Haushalt, Arbeit und Freizeit erarbeiten.

## Gute Tage nutzen – ohne Raubbau
An guten Tagen ist die Versuchung gross, alles nachzuholen. Das kann zu einem Einbruch an den Folgetagen führen. Ein gleichmässigeres Tempo ist oft nachhaltiger.

## Ohne schlechtes Gewissen
Pausen sind kein Versagen, sondern Teil einer Strategie. Du musst niemandem beweisen, wie viel du schaffst. Auf dieser Plattform gibt es deshalb keine Streaks und keine Tagesziele.`,
  },
  {
    slug: "waerme-und-ms",
    topic: "alltag-energie",
    title: "Wärme und MS",
    summary:
      "Viele Menschen mit MS reagieren empfindlich auf Wärme. Beschwerden können sich dann vorübergehend verstärken und bessern sich nach dem Abkühlen wieder. Das ist meist kein Schub.",
    minutes: 4,
    medical: true,
    specialty: NEURO,
    sources: [SRC.msch, SRC.nice],
    body: `## Das Uhthoff-Phänomen
Steigt die Körpertemperatur, leiten geschädigte Nervenfasern Signale schlechter weiter. Bekannte Beschwerden können dann vorübergehend stärker werden, etwa verschwommenes Sehen, Schwäche oder Fatigue. Fachleute nennen das nach seinem Beschreiber Uhthoff-Phänomen.

## Typische Auslöser
- heisses Wetter, warme Räume oder volle öffentliche Verkehrsmittel
- heisse Duschen, Bäder oder Sauna
- körperliche Anstrengung
- Fieber bei einem Infekt

## Kein neuer Schub
Die Verschlechterung durch Wärme ist meist vorübergehend und bildet sich nach dem Abkühlen zurück. Sie bedeutet in der Regel keinen neuen Entzündungsschub. Halten Beschwerden aber auch nach dem Abkühlen länger als einen Tag an, sprich mit deinem Behandlungsteam.

## Was helfen kann
- kühle Getränke, feuchte Tücher oder Kühlwesten
- Aktivitäten in die kühleren Morgen- oder Abendstunden legen
- Ventilator oder klimatisierte Räume nutzen
- lauwarm statt heiss duschen

## Fieber ernst nehmen
Weil Fieber Beschwerden verstärken kann, lohnt es sich, Infekte frühzeitig ärztlich abklären zu lassen, besonders Harnwegsinfekte. Bei plötzlichen, schweren Beschwerden ruf den Sanitätsnotruf 144 an.`,
  },
  {
    slug: "schlaf-und-erholung",
    topic: "alltag-energie",
    title: "Schlaf und Erholung",
    summary:
      "Schlafprobleme sind bei MS häufig, etwa durch nächtlichen Harndrang, Schmerzen oder Muskelkrämpfe. Guter Schlaf kann Fatigue und Stimmung positiv beeinflussen. Viele Ursachen lassen sich behandeln.",
    minutes: 4,
    medical: true,
    specialty: NEURO,
    sources: [SRC.nice, SRC.msch],
    body: `## Warum Schlaf wichtig ist
Erholsamer Schlaf unterstützt Konzentration, Stimmung und Belastbarkeit. Schlechter Schlaf kann Fatigue verstärken. Bei MS gibt es einige typische Gründe, warum Nächte unruhig sein können.

## Häufige Störfaktoren
- nächtlicher Harndrang
- Muskelkrämpfe, Spastik oder Schmerzen
- unruhige Beine
- Sorgen, gedrückte Stimmung oder Ängste
- Nebenwirkungen von Medikamenten

## Was du selbst ausprobieren kannst
- möglichst regelmässige Schlafens- und Aufstehzeiten
- ein kühles, dunkles und ruhiges Schlafzimmer
- am Abend wenig Koffein und Alkohol
- Bildschirme vor dem Schlafengehen reduzieren
- kurze Ruhepausen am Tag statt langer Mittagsschläfe

## Wann eine Abklärung sinnvoll ist
Wenn du über Wochen schlecht schläfst oder tagsüber kaum wach bleiben kannst, sprich mit deinem Behandlungsteam. Viele Ursachen wie Blasenbeschwerden, Spastik oder Schmerzen lassen sich gezielt behandeln. Auch Schlafstörungen wie Schlafapnoe kommen als Ursache infrage und können untersucht werden.

## Erholung ist mehr als Schlaf
Auch bewusste Pausen, ruhige Musik, Atemübungen oder Zeit in der Natur können erholsam sein. Probier aus, was dir guttut – ohne Druck, alles richtig zu machen.`,
  },
  {
    slug: "arbeiten-mit-ms",
    topic: "arbeit-recht",
    title: "Arbeiten mit MS",
    summary:
      "Viele Menschen mit MS arbeiten weiter – manchmal mit Anpassungen. Dieser Text erklärt, was du bei Offenlegung, Arbeitsunfähigkeit und Unterstützung durch die IV in der Schweiz wissen solltest.",
    minutes: 6,
    medical: false,
    specialty: SOZIAL,
    sources: [SRC.compasso, SRC.ahviv, SRC.procap],
    body: `## Arbeit kann weitergehen
Eine MS-Diagnose bedeutet nicht, dass du deinen Beruf aufgeben musst. Viele Menschen arbeiten über viele Jahre weiter, teilweise mit angepassten Arbeitszeiten, Aufgaben oder Hilfsmitteln. Wichtig ist, frühzeitig zu überlegen, was dir die Arbeit erleichtern würde.

## Muss ich es sagen?
Du musst deine Diagnose grundsätzlich nicht offenlegen. Ein Arztzeugnis bestätigt in der Regel die Arbeitsunfähigkeit und deren Dauer, nennt aber keine Diagnose. Fragen zur Gesundheit darf der Arbeitgeber nur stellen, soweit sie für die konkrete Stelle relevant sind. Ein offenes Gespräch kann trotzdem sinnvoll sein, wenn du Anpassungen brauchst. Lass dich vorher beraten, wenn du unsicher bist.

## Mögliche Anpassungen
- flexible Arbeitszeiten oder ein reduziertes Pensum
- Pausen und ein ruhiger Rückzugsort
- Homeoffice an anstrengenden Tagen
- ergonomische Hilfsmittel oder ein Arbeitsplatz mit kurzen Wegen
- Aufgaben, die besser zu deiner Energie passen

## Bei Krankheit
Wenn du krankheitsbedingt nicht arbeiten kannst, gilt je nach Arbeitsvertrag eine Lohnfortzahlung durch den Arbeitgeber oder eine Krankentaggeldversicherung. Die Details unterscheiden sich stark. Schau in deinen Vertrag oder frag bei der Personalabteilung nach.

## Unterstützung durch die IV
Die Invalidenversicherung (IV) setzt auf «Eingliederung vor Rente». Bereits bei drohender Arbeitsunfähigkeit kann eine Früherfassung bei der kantonalen IV-Stelle sinnvoll sein. Mögliche Leistungen sind zum Beispiel Beratung, Massnahmen am Arbeitsplatz oder Umschulungen. Mehr dazu im Artikel zur Invalidenversicherung.

## Wo du Rat findest
Beratungsstellen wie Procap, Pro Infirmis oder die Sozialberatung der Schweizerischen MS-Gesellschaft kennen die Abläufe. Für Arbeitgebende bietet das Portal Compasso Informationen zur beruflichen Eingliederung. Angebote findest du unter «Hilfe finden», Thema «Arbeit und Ausbildung».`,
  },
  {
    slug: "invalidenversicherung-im-ueberblick",
    topic: "arbeit-recht",
    title: "Die Invalidenversicherung (IV) im Überblick",
    summary:
      "Die IV unterstützt Menschen, deren Gesundheit die Erwerbsfähigkeit oder den Alltag einschränkt – zuerst mit Eingliederungsmassnahmen, erst danach mit Renten. Eine frühe Anmeldung kann wichtig sein.",
    minutes: 6,
    medical: false,
    specialty: SOZIAL,
    sources: [SRC.ahviv, SRC.ivg, SRC.procap],
    body: `## Wozu die IV da ist
Die Invalidenversicherung ist eine obligatorische Sozialversicherung in der Schweiz. Sie soll Menschen mit gesundheitlichen Einschränkungen helfen, möglichst im Erwerbsleben zu bleiben oder wieder einzusteigen. Der Grundsatz lautet «Eingliederung vor Rente».

## Früherfassung und Frühintervention
Wenn du länger oder wiederholt arbeitsunfähig bist, kann eine Meldung zur Früherfassung bei der IV-Stelle deines Wohnkantons sinnvoll sein. Melden können dich auch andere, etwa der Arbeitgeber – in der Regel nach Rücksprache mit dir. Ziel ist, rasch Massnahmen zu prüfen, damit du deine Stelle behalten kannst.

## Mögliche Leistungen
- Beratung und Begleitung bei der Arbeit
- Anpassungen am Arbeitsplatz und berufliche Massnahmen, zum Beispiel Umschulungen
- Hilfsmittel, etwa für Mobilität
- Hilflosenentschädigung und Assistenzbeitrag bei Unterstützungsbedarf im Alltag
- Renten, wenn eine Eingliederung nicht oder nur teilweise möglich ist

## Warum eine frühe Anmeldung zählt
Für die Prüfung von Leistungen braucht es eine Anmeldung bei der IV-Stelle. Ein Rentenanspruch entsteht frühestens sechs Monate nach der Anmeldung, weitere Voraussetzungen kommen hinzu. Wer zu lange wartet, kann deshalb Ansprüche verlieren. Eine Anmeldung bedeutet nicht, dass du sofort eine Rente beziehst.

## Der Ablauf
Die IV-Stelle klärt deine Situation ab, holt medizinische Unterlagen ein und prüft, welche Massnahmen infrage kommen. Das kann einige Zeit dauern. Du hast das Recht, Entscheide begründet zu erhalten und dagegen vorzugehen.

## Beratung lohnt sich
Die Regeln der IV sind komplex. Die Merkblätter der Informationsstelle AHV/IV erklären die Grundlagen. Organisationen wie Procap, Pro Infirmis oder Inclusion Handicap beraten zu Sozialversicherungen und begleiten bei Bedarf auch in Verfahren. Dieser Text ersetzt keine Rechtsberatung.`,
  },
];
