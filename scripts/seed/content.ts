import { and, eq, inArray } from "drizzle-orm";
import * as s from "../../src/server/db/schema";
import { HELP_TOPICS, COMMUNITY_RULES_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "../../src/lib/catalog";
import { DEFAULT_MOMENT_CONFIG } from "../../src/lib/moment";
import type { SeedContext } from "./types";

/**
 * Startbestand für Wissen, Hilfe, Sicherheit, Rechtstexte und Mein Moment (CON08, SAF06, HOM02).
 * Idempotent. Alle Inhalte sind redaktionelle Entwürfe: Die Prüfungen sind als «Demo-Prüfung»
 * gekennzeichnet und müssen vor dem Produktivbetrieb durch die benannte medizinische Redaktion,
 * die Fachprüfung Recht (D01) und für S49 durch Krisenfachpersonen ersetzt werden.
 */

const DAY = 86400_000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const addMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + m);
  return x;
};

const RETRIEVED = "abgerufen am 2. November 2026";
const LINK_ONLY = "Verweis auf die Quelle, kein übernommener Text";

/* ─────────────────────────── Wissensthemen ─────────────────────────── */

const KNOWLEDGE_TOPICS = [
  { slug: "neu-mit-ms", name: "Neu mit MS", description: "Ruhige Orientierung für die erste Zeit nach der Diagnose." },
  { slug: "grundlagen", name: "Grundlagen", description: "Was MS ist, wie sie verläuft und welche Beschwerden vorkommen können." },
  { slug: "behandlung", name: "Behandlung verstehen", description: "Schübe, Therapien und Rehabilitation – verständlich erklärt, ohne Empfehlung." },
  { slug: "alltag-energie", name: "Alltag und Energie", description: "Fatigue, Wärme, Schlaf und wie du deine Kräfte einteilen kannst." },
  { slug: "bewegung", name: "Bewegung", description: "Körperliche Aktivität, Physio- und Ergotherapie im Alltag." },
  { slug: "psyche", name: "Psyche", description: "Stimmung, Ängste, Konzentration und Gedächtnis." },
  { slug: "arbeit-recht", name: "Arbeit und Recht", description: "Arbeitsplatz, Invalidenversicherung und Krankenversicherung in der Schweiz." },
  { slug: "familie-beziehungen", name: "Familie und Beziehungen", description: "Partnerschaft, Kinderwunsch und Gespräche in der Familie." },
  { slug: "digital-datenschutz", name: "Digital und Datenschutz", description: "Gesundheitsdaten schützen und barrierearm im Netz unterwegs sein." },
];

/* ─────────────────────────── Quellen ─────────────────────────── */

type Src = { title: string; publisher: string; url: string; publishedOn?: string };
const SRC = {
  msch: { title: "Informationen rund um Multiple Sklerose", publisher: "Schweizerische Multiple Sklerose Gesellschaft", url: "https://www.multiplesklerose.ch" },
  who: { title: "Multiple sclerosis – Fact sheet", publisher: "Weltgesundheitsorganisation (WHO)", url: "https://www.who.int/news-room/fact-sheets/detail/multiple-sclerosis" },
  atlas: { title: "Atlas of MS", publisher: "Multiple Sclerosis International Federation (MSIF)", url: "https://www.atlasofms.org" },
  msif: { title: "About MS", publisher: "Multiple Sclerosis International Federation (MSIF)", url: "https://www.msif.org" },
  nice: { title: "Multiple sclerosis in adults: management (NG220)", publisher: "National Institute for Health and Care Excellence (NICE)", url: "https://www.nice.org.uk/guidance/ng220", publishedOn: "2022" },
  kknms: { title: "Informationen für Betroffene", publisher: "Krankheitsbezogenes Kompetenznetz Multiple Sklerose (KKNMS)", url: "https://www.kompetenznetz-multiplesklerose.de" },
  register: { title: "Schweizer MS Register", publisher: "Schweizer MS Register", url: "https://www.ms-register.ch" },
  ahviv: { title: "Merkblätter zur Invalidenversicherung", publisher: "Informationsstelle AHV/IV", url: "https://www.ahv-iv.ch" },
  ivg: { title: "Bundesgesetz über die Invalidenversicherung (IVG), SR 831.20", publisher: "Fedlex – Bundesrecht", url: "https://www.fedlex.admin.ch/eli/cc/1959/827_857_845/de" },
  kvg: { title: "Bundesgesetz über die Krankenversicherung (KVG), SR 832.10", publisher: "Fedlex – Bundesrecht", url: "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/de" },
  bag: { title: "Krankenversicherung", publisher: "Bundesamt für Gesundheit (BAG)", url: "https://www.bag.admin.ch" },
  omkv: { title: "Ombudsstelle Krankenversicherung", publisher: "Ombudsstelle Krankenversicherung", url: "https://www.om-kv.ch" },
  compasso: { title: "Informationsportal für Arbeitgebende zur beruflichen Eingliederung", publisher: "Compasso", url: "https://www.compasso.ch" },
  procap: { title: "Beratung zu Sozialversicherungen", publisher: "Procap Schweiz", url: "https://www.procap.ch" },
  promentesana: { title: "Informationen zu psychischer Gesundheit", publisher: "Pro Mente Sana", url: "https://www.promentesana.ch" },
  fsp: { title: "Psychotherapie finden", publisher: "Föderation der Schweizer Psychologinnen und Psychologen (FSP)", url: "https://www.psychologie.ch" },
  physio: { title: "Physiotherapie", publisher: "physioswiss – Schweizer Physiotherapie Verband", url: "https://www.physioswiss.ch" },
  ergo: { title: "Ergotherapie", publisher: "ErgotherapeutInnen-Verband Schweiz (EVS)", url: "https://www.ergotherapie.ch" },
  dsg: { title: "Bundesgesetz über den Datenschutz (DSG), SR 235.1", publisher: "Fedlex – Bundesrecht", url: "https://www.fedlex.admin.ch/eli/cc/2022/491/de" },
  edoeb: { title: "Datenschutz-Folgenabschätzung", publisher: "Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)", url: "https://www.edoeb.admin.ch/de/datenschutz-folgenabschaetzung" },
  edoebFaq: { title: "FAQ Datenschutz", publisher: "Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)", url: "https://www.edoeb.admin.ch/de/faq-datenschutz" },
  wcag: { title: "Web Content Accessibility Guidelines (WCAG) 2.2", publisher: "World Wide Web Consortium (W3C)", url: "https://www.w3.org/TR/WCAG22/" },
  reflow: { title: "Understanding Success Criterion 1.4.10: Reflow", publisher: "W3C Web Accessibility Initiative (WAI)", url: "https://www.w3.org/WAI/WCAG21/Understanding/reflow" },
  behig: { title: "Behindertengleichstellungsgesetz (BehiG), SR 151.3", publisher: "Fedlex – Bundesrecht", url: "https://www.fedlex.admin.ch/eli/cc/2003/667/de" },
  inclusion: { title: "Rechtsberatung und Gleichstellung", publisher: "Inclusion Handicap", url: "https://www.inclusion-handicap.ch" },
  dargebotene: { title: "Die Dargebotene Hand – Telefon 143", publisher: "Die Dargebotene Hand", url: "https://www.143.ch" },
} satisfies Record<string, Src>;

/* ─────────────────────────── Artikel ─────────────────────────── */

type SeedArticle = {
  slug: string;
  topic: string;
  title: string;
  summary: string;
  body: string;
  minutes: number;
  medical: boolean;
  specialty: string;
  sources: Src[];
};

const NEURO = "Neurologie (Demo-Prüfung)";
const SOZIAL = "Sozialversicherungsrecht (Demo-Prüfung)";
const PSY = "Psychiatrie und Psychotherapie (Demo-Prüfung)";

const ARTICLES: SeedArticle[] = [
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

/* ─────────────────────────── Hilfsangebote ─────────────────────────── */

type SeedOffer = {
  slug: string;
  organization: string;
  title: string;
  summary: string;
  description: string;
  topics: string[];
  cantons: string[];
  languages: string[];
  audience: string;
  responsibility: string;
  access: string;
  costNote?: string;
  contactWay: string;
  url: string;
};

const WEB = "Telefon, E-Mail oder Kontaktformular gemäss Website des Anbieters";

function proInfirmisCanton(code: string, name: string): SeedOffer {
  return {
    slug: `pro-infirmis-${code.toLowerCase()}`,
    organization: `Pro Infirmis ${name}`,
    title: `Sozialberatung von Pro Infirmis im Kanton ${name}`,
    summary: `Regionale Beratungsstelle von Pro Infirmis für Menschen mit Behinderung und ihre Angehörigen im Kanton ${name}.`,
    description: `Die kantonale Beratungsstelle von Pro Infirmis berät gemäss Anbieter zu Fragen rund um Alltag, Wohnen, Arbeit, Finanzen und Sozialversicherungen.\n\nDie Beratung richtet sich an Menschen mit körperlicher, psychischer oder kognitiver Beeinträchtigung – dazu kann auch eine chronische Erkrankung wie MS gehören – sowie an ihr Umfeld. Welche Leistungen im Kanton ${name} angeboten werden, ist auf der Website von Pro Infirmis beschrieben.`,
    topics: ["beratung", "finanzen", "recht"],
    cantons: [code],
    languages: ["de"],
    audience: "Menschen mit Behinderung oder chronischer Erkrankung und ihre Angehörigen",
    responsibility: `Kantonale Beratungsstelle von Pro Infirmis für den Kanton ${name}`,
    access: "Terminvereinbarung direkt bei der Beratungsstelle; keine ärztliche Zuweisung nötig",
    costNote: "Kosten gemäss Anbieter (Sozialberatung gemäss Angaben von Pro Infirmis in der Regel kostenlos)",
    contactWay: WEB,
    url: "https://www.proinfirmis.ch",
  };
}

const OFFERS: SeedOffer[] = [
  {
    slug: "ms-gesellschaft-beratung",
    organization: "Schweizerische Multiple Sklerose Gesellschaft",
    title: "Beratung und Information zu MS",
    summary: "Fachliche Beratung für Menschen mit MS und ihre Angehörigen – zu Erkrankung, Alltag und sozialen Fragen.",
    description:
      "Die Schweizerische MS-Gesellschaft bietet gemäss Anbieter Beratung durch Fachpersonen an, etwa aus Pflege und Sozialarbeit. Themen können die Erkrankung selbst, der Umgang mit Beschwerden, Arbeit, Finanzen oder Fragen von Angehörigen sein.\n\nZusätzlich stellt die Organisation Informationsmaterial in mehreren Landessprachen zur Verfügung.",
    topics: ["beratung", "finanzen"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit MS, Angehörige und Interessierte",
    responsibility: "Schweizweite Patientenorganisation für Menschen mit MS",
    access: "Kontaktaufnahme direkt über die Organisation, ohne Zuweisung",
    contactWay: WEB,
    url: "https://www.multiplesklerose.ch",
  },
  {
    slug: "ms-gesellschaft-regionalgruppen",
    organization: "Schweizerische Multiple Sklerose Gesellschaft",
    title: "Regionalgruppen und Austausch",
    summary: "Regionale Gruppen für Begegnung und Austausch unter Menschen mit MS in vielen Regionen der Schweiz.",
    description:
      "Gemäss Anbieter gibt es in vielen Regionen Gruppen, in denen sich Menschen mit MS treffen, austauschen und gemeinsam etwas unternehmen. Die Gruppen werden von der Schweizerischen MS-Gesellschaft begleitet.\n\nWelche Gruppen in deiner Nähe bestehen, findest du auf der Website der Organisation.",
    topics: ["selbsthilfe"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit MS und teilweise Angehörige",
    responsibility: "Schweizerische MS-Gesellschaft mit regionalen Gruppen",
    access: "Kontakt zur Gruppe über die Organisation",
    contactWay: WEB,
    url: "https://www.multiplesklerose.ch",
  },
  {
    slug: "pro-infirmis-schweiz",
    organization: "Pro Infirmis",
    title: "Beratung und Unterstützung für Menschen mit Behinderung",
    summary: "Schweizweite Fachorganisation mit kantonalen Beratungsstellen für Menschen mit Behinderung und ihre Angehörigen.",
    description:
      "Pro Infirmis bietet gemäss Anbieter Sozialberatung, Unterstützung bei Fragen zu Wohnen, Arbeit und Finanzen sowie weitere Dienstleistungen an. Die Beratung erfolgt in kantonalen Beratungsstellen.\n\nAuf der Website findest du die Stelle in deinem Kanton.",
    topics: ["beratung", "finanzen", "entlastung"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit Behinderung oder chronischer Erkrankung und ihre Angehörigen",
    responsibility: "Schweizweite Fachorganisation mit kantonalen Beratungsstellen",
    access: "Kontakt zur kantonalen Beratungsstelle, ohne Zuweisung",
    contactWay: WEB,
    url: "https://www.proinfirmis.ch",
  },
  proInfirmisCanton("ZH", "Zürich"),
  proInfirmisCanton("BE", "Bern"),
  proInfirmisCanton("LU", "Luzern"),
  proInfirmisCanton("AG", "Aargau"),
  proInfirmisCanton("SG", "St. Gallen"),
  {
    slug: "procap-sozialversicherungsberatung",
    organization: "Procap Schweiz",
    title: "Beratung zu Sozialversicherungen",
    summary: "Beratung und rechtliche Unterstützung für Menschen mit Behinderung, insbesondere zu IV und weiteren Sozialversicherungen.",
    description:
      "Procap berät gemäss Anbieter Mitglieder und Interessierte zu Fragen der Sozialversicherungen, zum Beispiel zur Invalidenversicherung. Je nach Situation ist auch eine Begleitung in Verfahren möglich.\n\nDie genauen Bedingungen, etwa für Mitglieder, sind auf der Website beschrieben.",
    topics: ["recht", "finanzen", "arbeit"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit Behinderung und ihre Angehörigen",
    responsibility: "Schweizweite Selbsthilfeorganisation von Menschen mit Behinderung",
    access: "Kontaktaufnahme über die regionalen Stellen oder die Rechtsberatung",
    contactWay: WEB,
    url: "https://www.procap.ch",
  },
  {
    slug: "inclusion-handicap-rechtsberatung",
    organization: "Inclusion Handicap",
    title: "Rechtsberatung zu Gleichstellung und Sozialversicherungen",
    summary: "Dachverband der Behindertenorganisationen mit Rechtsberatung, etwa zu Gleichstellung und Sozialversicherungsrecht.",
    description:
      "Inclusion Handicap setzt sich gemäss Anbieter für die Rechte von Menschen mit Behinderung ein und bietet eine Rechtsberatung an. Themen können Benachteiligungen im Alltag oder Fragen zu Sozialversicherungen sein.",
    topics: ["recht"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit Behinderung",
    responsibility: "Dachverband der Behindertenorganisationen in der Schweiz",
    access: "Anfrage über die Website",
    contactWay: WEB,
    url: "https://www.inclusion-handicap.ch",
  },
  {
    slug: "agile-ch",
    organization: "AGILE.CH",
    title: "Selbsthilfe-Dachverband von Menschen mit Behinderung",
    summary: "Dachorganisation der Selbsthilfe von Menschen mit Behinderung – mit Informationen zu Sozialpolitik und Teilhabe.",
    description:
      "AGILE.CH vertritt gemäss Anbieter die Interessen von Menschen mit Behinderung und ihren Selbsthilfeorganisationen. Auf der Website gibt es Informationen zu Sozialversicherungen, Arbeit und Teilhabe.",
    topics: ["selbsthilfe", "recht"],
    cantons: ["CH"],
    languages: ["de", "fr"],
    audience: "Menschen mit Behinderung und ihre Organisationen",
    responsibility: "Schweizweiter Dachverband der Behinderten-Selbsthilfe",
    access: "Informationen auf der Website; Kontakt über die Geschäftsstelle",
    contactWay: WEB,
    url: "https://www.agile.ch",
  },
  {
    slug: "informationsstelle-ahv-iv",
    organization: "Informationsstelle AHV/IV",
    title: "Merkblätter und Formulare zur Invalidenversicherung",
    summary: "Offizielle Merkblätter, Formulare und Adressen der kantonalen IV-Stellen.",
    description:
      "Die Informationsstelle AHV/IV stellt gemäss Anbieter verständliche Merkblätter zu den Leistungen der Invalidenversicherung bereit, etwa zu Früherfassung, beruflichen Massnahmen, Hilfsmitteln und Renten. Zudem findest du dort Anmeldeformulare und die Adressen der IV-Stellen.",
    topics: ["arbeit", "finanzen", "recht"],
    cantons: ["CH"],
    languages: ["de", "fr", "it", "en"],
    audience: "Alle Versicherten",
    responsibility: "Informationsstelle der AHV/IV",
    access: "Informationen frei zugänglich auf der Website",
    costNote: "Kosten gemäss Anbieter (Informationen frei zugänglich)",
    contactWay: "Informationen und Adressen der IV-Stellen auf der Website",
    url: "https://www.ahv-iv.ch",
  },
  {
    slug: "iv-stelle-zuerich",
    organization: "SVA Zürich",
    title: "IV-Stelle des Kantons Zürich",
    summary: "Zuständig für Anmeldung, Früherfassung, Eingliederung und weitere IV-Leistungen im Kanton Zürich.",
    description:
      "Die SVA Zürich führt gemäss Anbieter die IV-Stelle des Kantons Zürich. Sie ist zuständig für die Abklärung von IV-Leistungen, etwa Früherfassung, Frühintervention und berufliche Eingliederung.",
    topics: ["arbeit", "finanzen"],
    cantons: ["ZH"],
    languages: ["de"],
    audience: "Versicherte mit Wohnsitz im Kanton Zürich",
    responsibility: "IV-Stelle des Kantons Zürich",
    access: "Anmeldung über die offiziellen IV-Formulare",
    costNote: "Kosten gemäss Anbieter (Abklärung durch die IV-Stelle)",
    contactWay: WEB,
    url: "https://www.svazurich.ch",
  },
  {
    slug: "iv-stelle-bern",
    organization: "IV-Stelle Kanton Bern",
    title: "IV-Stelle des Kantons Bern",
    summary: "Zuständig für Anmeldung, Früherfassung, Eingliederung und weitere IV-Leistungen im Kanton Bern.",
    description:
      "Die IV-Stelle Kanton Bern klärt gemäss Anbieter Ansprüche auf Leistungen der Invalidenversicherung ab und begleitet Massnahmen zur beruflichen Eingliederung.",
    topics: ["arbeit", "finanzen"],
    cantons: ["BE"],
    languages: ["de", "fr"],
    audience: "Versicherte mit Wohnsitz im Kanton Bern",
    responsibility: "IV-Stelle des Kantons Bern",
    access: "Anmeldung über die offiziellen IV-Formulare",
    costNote: "Kosten gemäss Anbieter (Abklärung durch die IV-Stelle)",
    contactWay: WEB,
    url: "https://www.ivbe.ch",
  },
  {
    slug: "iv-stelle-aargau",
    organization: "SVA Aargau",
    title: "IV-Stelle des Kantons Aargau",
    summary: "Zuständig für Anmeldung, Früherfassung, Eingliederung und weitere IV-Leistungen im Kanton Aargau.",
    description: "Die SVA Aargau führt gemäss Anbieter die IV-Stelle des Kantons Aargau und klärt Leistungen der Invalidenversicherung ab.",
    topics: ["arbeit", "finanzen"],
    cantons: ["AG"],
    languages: ["de"],
    audience: "Versicherte mit Wohnsitz im Kanton Aargau",
    responsibility: "IV-Stelle des Kantons Aargau",
    access: "Anmeldung über die offiziellen IV-Formulare",
    costNote: "Kosten gemäss Anbieter (Abklärung durch die IV-Stelle)",
    contactWay: WEB,
    url: "https://www.sva-ag.ch",
  },
  {
    slug: "iv-stelle-luzern",
    organization: "WAS Wirtschaft Arbeit Soziales Luzern",
    title: "IV-Stelle des Kantons Luzern",
    summary: "Zuständig für Anmeldung, Früherfassung, Eingliederung und weitere IV-Leistungen im Kanton Luzern.",
    description: "Die IV-Stelle Luzern ist gemäss Anbieter Teil von WAS Wirtschaft Arbeit Soziales und klärt Leistungen der Invalidenversicherung ab.",
    topics: ["arbeit", "finanzen"],
    cantons: ["LU"],
    languages: ["de"],
    audience: "Versicherte mit Wohnsitz im Kanton Luzern",
    responsibility: "IV-Stelle des Kantons Luzern",
    access: "Anmeldung über die offiziellen IV-Formulare",
    costNote: "Kosten gemäss Anbieter (Abklärung durch die IV-Stelle)",
    contactWay: WEB,
    url: "https://www.was-luzern.ch",
  },
  {
    slug: "iv-stelle-st-gallen",
    organization: "SVA St.Gallen",
    title: "IV-Stelle des Kantons St. Gallen",
    summary: "Zuständig für Anmeldung, Früherfassung, Eingliederung und weitere IV-Leistungen im Kanton St. Gallen.",
    description: "Die SVA St.Gallen führt gemäss Anbieter die IV-Stelle des Kantons St. Gallen und klärt Leistungen der Invalidenversicherung ab.",
    topics: ["arbeit", "finanzen"],
    cantons: ["SG"],
    languages: ["de"],
    audience: "Versicherte mit Wohnsitz im Kanton St. Gallen",
    responsibility: "IV-Stelle des Kantons St. Gallen",
    access: "Anmeldung über die offiziellen IV-Formulare",
    costNote: "Kosten gemäss Anbieter (Abklärung durch die IV-Stelle)",
    contactWay: WEB,
    url: "https://www.svasg.ch",
  },
  {
    slug: "compasso",
    organization: "Compasso",
    title: "Informationen für Arbeitgebende zur beruflichen Eingliederung",
    summary: "Portal mit Informationen und Werkzeugen für Arbeitgebende, wenn Mitarbeitende gesundheitlich eingeschränkt sind.",
    description:
      "Compasso richtet sich gemäss Anbieter an Arbeitgebende und Führungspersonen. Das Portal erklärt, wie Arbeitsplätze erhalten und angepasst werden können und welche Stellen unterstützen. Auch für Arbeitnehmende kann es hilfreich sein, um ein Gespräch vorzubereiten.",
    topics: ["arbeit"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Arbeitgebende, Führungspersonen und interessierte Arbeitnehmende",
    responsibility: "Verein zur Förderung der beruflichen Eingliederung",
    access: "Informationen frei zugänglich auf der Website",
    contactWay: "Informationen auf der Website",
    url: "https://www.compasso.ch",
  },
  {
    slug: "spitex-schweiz",
    organization: "Spitex Schweiz",
    title: "Pflege und Unterstützung zu Hause",
    summary: "Dachverband der gemeinnützigen Spitex – mit Hinweisen zu Pflege, Hauswirtschaft und Unterstützung zu Hause.",
    description:
      "Die Spitex unterstützt gemäss Anbieter Menschen, die zu Hause Pflege oder Hilfe im Haushalt brauchen. Spitex Schweiz ist der Dachverband; die Leistungen werden von lokalen Organisationen erbracht. Pflegeleistungen setzen in der Regel eine ärztliche Verordnung voraus.",
    topics: ["entlastung"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen, die zu Hause Pflege oder Unterstützung benötigen, und ihre Angehörigen",
    responsibility: "Dachverband der gemeinnützigen Spitex-Organisationen",
    access: "Kontakt zur lokalen Spitex-Organisation; Pflege meist mit ärztlicher Verordnung",
    contactWay: "Suche nach der lokalen Organisation auf der Website",
    url: "https://www.spitex.ch",
  },
  {
    slug: "entlastungsdienst-schweiz",
    organization: "Entlastungsdienst Schweiz",
    title: "Entlastung für betreuende Angehörige",
    summary: "Betreuung zu Hause, damit pflegende und betreuende Angehörige Zeit für sich haben.",
    description:
      "Der Entlastungsdienst Schweiz bietet gemäss Anbieter stundenweise Betreuung zu Hause an, damit Angehörige entlastet werden. Die Angebote werden von regionalen Organisationen erbracht.",
    topics: ["entlastung"],
    cantons: ["CH"],
    languages: ["de"],
    audience: "Betreuende Angehörige von Menschen mit Unterstützungsbedarf",
    responsibility: "Verband regionaler Entlastungsdienste",
    access: "Anfrage bei der regionalen Organisation",
    contactWay: WEB,
    url: "https://www.entlastungsdienst.ch",
  },
  {
    slug: "srk-schweiz",
    organization: "Schweizerisches Rotes Kreuz",
    title: "Fahrdienst und Entlastung durch das Rote Kreuz",
    summary: "Angebote der kantonalen Rotkreuz-Verbände, etwa Fahrdienste zu Terminen oder Entlastung für Angehörige.",
    description:
      "Das Schweizerische Rote Kreuz und seine Kantonalverbände bieten gemäss Anbieter verschiedene Dienstleistungen im Alltag an, zum Beispiel Fahrdienste zu Arztterminen oder Entlastung für betreuende Angehörige. Das Angebot unterscheidet sich je nach Kanton.",
    topics: ["mobilitaet", "entlastung"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit eingeschränkter Mobilität und betreuende Angehörige",
    responsibility: "Kantonale Rotkreuz-Verbände",
    access: "Anfrage beim Rotkreuz-Kantonalverband",
    contactWay: WEB,
    url: "https://www.redcross.ch",
  },
  {
    slug: "srk-kanton-zuerich",
    organization: "Schweizerisches Rotes Kreuz Kanton Zürich",
    title: "Rotkreuz-Fahrdienst und Entlastung im Kanton Zürich",
    summary: "Regionale Angebote des Roten Kreuzes im Kanton Zürich, etwa Fahrdienst und Entlastung.",
    description: "Der Kantonalverband Zürich des Schweizerischen Roten Kreuzes bietet gemäss Anbieter Dienstleistungen wie Fahrdienste und Entlastung für Angehörige an.",
    topics: ["mobilitaet", "entlastung"],
    cantons: ["ZH"],
    languages: ["de"],
    audience: "Menschen im Kanton Zürich mit eingeschränkter Mobilität und betreuende Angehörige",
    responsibility: "Rotkreuz-Kantonalverband Zürich",
    access: "Anfrage direkt beim Kantonalverband",
    contactWay: WEB,
    url: "https://www.srk-zuerich.ch",
  },
  {
    slug: "srk-kanton-bern",
    organization: "Schweizerisches Rotes Kreuz Kanton Bern",
    title: "Rotkreuz-Fahrdienst und Entlastung im Kanton Bern",
    summary: "Regionale Angebote des Roten Kreuzes im Kanton Bern, etwa Fahrdienst und Entlastung.",
    description: "Der Kantonalverband Bern des Schweizerischen Roten Kreuzes bietet gemäss Anbieter Dienstleistungen wie Fahrdienste und Entlastung für Angehörige an.",
    topics: ["mobilitaet", "entlastung"],
    cantons: ["BE"],
    languages: ["de", "fr"],
    audience: "Menschen im Kanton Bern mit eingeschränkter Mobilität und betreuende Angehörige",
    responsibility: "Rotkreuz-Kantonalverband Bern",
    access: "Anfrage direkt beim Kantonalverband",
    contactWay: WEB,
    url: "https://www.srk-bern.ch",
  },
  {
    slug: "selbsthilfe-schweiz",
    organization: "Selbsthilfe Schweiz",
    title: "Selbsthilfegruppen finden",
    summary: "Nationale Koordination der Selbsthilfe mit Verzeichnis von Selbsthilfegruppen und regionalen Selbsthilfezentren.",
    description:
      "Selbsthilfe Schweiz unterstützt gemäss Anbieter die gemeinschaftliche Selbsthilfe und vermittelt über regionale Selbsthilfezentren Kontakte zu Gruppen. Auf der Website lassen sich Gruppen zu vielen Themen suchen.",
    topics: ["selbsthilfe"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Betroffene und Angehörige, die Austausch suchen",
    responsibility: "Nationale Dachorganisation der Selbsthilfe",
    access: "Suche auf der Website oder Kontakt zu einem regionalen Selbsthilfezentrum",
    contactWay: WEB,
    url: "https://www.selbsthilfeschweiz.ch",
  },
  {
    slug: "selbsthilfe-zuerich",
    organization: "Selbsthilfecenter Zürich",
    title: "Selbsthilfegruppen in der Region Zürich",
    summary: "Regionales Selbsthilfezentrum, das Kontakte zu Selbsthilfegruppen vermittelt und bei der Gründung unterstützt.",
    description: "Das Selbsthilfecenter Zürich vermittelt gemäss Anbieter Kontakte zu bestehenden Selbsthilfegruppen und unterstützt Menschen, die eine neue Gruppe gründen möchten.",
    topics: ["selbsthilfe"],
    cantons: ["ZH"],
    languages: ["de"],
    audience: "Betroffene und Angehörige in der Region Zürich",
    responsibility: "Regionales Selbsthilfezentrum",
    access: "Kontakt über die Website",
    contactWay: WEB,
    url: "https://www.selbsthilfezuerich.ch",
  },
  {
    slug: "dargebotene-hand-143",
    organization: "Die Dargebotene Hand",
    title: "Telefon 143 – Gespräch in schwierigen Momenten",
    summary: "Anonyme Gespräche am Telefon, per Chat oder E-Mail, wenn dich etwas belastet.",
    description:
      "Die Dargebotene Hand ist gemäss Anbieter unter der Nummer 143 rund um die Uhr erreichbar. Die Gespräche sind vertraulich und anonym. Zusätzlich gibt es Beratung per Chat und E-Mail.",
    topics: ["psyche"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Alle Menschen in belastenden Situationen",
    responsibility: "Schweizweiter Verband mit regionalen Stellen",
    access: "Direkt anrufen, chatten oder schreiben – ohne Anmeldung",
    costNote: "Kosten gemäss Anbieter (Anruf gemäss Anbieter kostenlos)",
    contactWay: "Telefon 143; Chat und E-Mail gemäss Website",
    url: "https://www.143.ch",
  },
  {
    slug: "pro-mente-sana",
    organization: "Pro Mente Sana",
    title: "Beratung zu psychischer Gesundheit",
    summary: "Informationen und Beratung für Menschen mit psychischen Belastungen und ihre Angehörigen.",
    description:
      "Pro Mente Sana setzt sich gemäss Anbieter für die Anliegen von Menschen mit psychischen Beeinträchtigungen ein. Angeboten werden Informationen sowie psychosoziale und rechtliche Beratung.",
    topics: ["psyche", "recht"],
    cantons: ["CH"],
    languages: ["de", "fr"],
    audience: "Menschen mit psychischen Belastungen, Angehörige und Fachpersonen",
    responsibility: "Schweizerische Stiftung für psychische Gesundheit",
    access: "Kontakt über die Website",
    contactWay: WEB,
    url: "https://www.promentesana.ch",
  },
  {
    slug: "fsp-psychotherapie-finden",
    organization: "Föderation der Schweizer Psychologinnen und Psychologen (FSP)",
    title: "Psychotherapeutin oder Psychotherapeuten finden",
    summary: "Verzeichnis von Psychologinnen und Psychologen, darunter Psychotherapeutinnen und Psychotherapeuten.",
    description:
      "Der Berufsverband FSP bietet gemäss Anbieter ein Verzeichnis, in dem du nach Region, Sprache und Schwerpunkt suchen kannst. Psychologische Psychotherapie kann auf ärztliche Anordnung über die Grundversicherung abgerechnet werden.",
    topics: ["psyche", "therapie"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen, die psychologische Unterstützung suchen",
    responsibility: "Berufsverband der Psychologinnen und Psychologen",
    access: "Suche im Verzeichnis, Kontakt direkt mit der Fachperson",
    contactWay: "Suche und Kontaktdaten der Fachpersonen auf der Website",
    url: "https://www.psychologie.ch",
  },
  {
    slug: "physioswiss",
    organization: "physioswiss",
    title: "Physiotherapeutin oder Physiotherapeuten finden",
    summary: "Verzeichnis des Schweizer Physiotherapie Verbands, auch mit Fachrichtungen wie Neurologie.",
    description:
      "physioswiss bietet gemäss Anbieter eine Suche nach Physiotherapeutinnen und Physiotherapeuten an. Physiotherapie wird bei ärztlicher Verordnung von der Grundversicherung übernommen.",
    topics: ["therapie"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen, die Physiotherapie suchen",
    responsibility: "Schweizer Physiotherapie Verband",
    access: "Suche im Verzeichnis; Therapie in der Regel mit ärztlicher Verordnung",
    contactWay: "Suche und Kontaktdaten der Praxen auf der Website",
    url: "https://www.physioswiss.ch",
  },
  {
    slug: "ergotherapie-verband",
    organization: "ErgotherapeutInnen-Verband Schweiz (EVS)",
    title: "Ergotherapeutin oder Ergotherapeuten finden",
    summary: "Verzeichnis des Berufsverbands – Ergotherapie unterstützt bei Alltag, Beruf und Energiemanagement.",
    description:
      "Der EVS bietet gemäss Anbieter eine Suche nach Ergotherapeutinnen und Ergotherapeuten an. Ergotherapie wird bei ärztlicher Verordnung von der Grundversicherung übernommen.",
    topics: ["therapie"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen, die Ergotherapie suchen",
    responsibility: "Berufsverband der Ergotherapeutinnen und Ergotherapeuten",
    access: "Suche im Verzeichnis; Therapie in der Regel mit ärztlicher Verordnung",
    contactWay: "Suche und Kontaktdaten der Praxen auf der Website",
    url: "https://www.ergotherapie.ch",
  },
  {
    slug: "logopaedie-verband",
    organization: "Deutschschweizer Logopädinnen- und Logopädenverband (DLV)",
    title: "Logopädin oder Logopäden finden",
    summary: "Verzeichnis des Berufsverbands – Logopädie unterstützt bei Sprech-, Stimm- und Schluckbeschwerden.",
    description: "Der DLV bietet gemäss Anbieter Informationen und eine Suche nach Logopädinnen und Logopäden in der Deutschschweiz an.",
    topics: ["therapie"],
    cantons: ["CH"],
    languages: ["de"],
    audience: "Menschen mit Sprech-, Stimm- oder Schluckbeschwerden",
    responsibility: "Berufsverband der Logopädinnen und Logopäden in der Deutschschweiz",
    access: "Suche im Verzeichnis; Therapie in der Regel mit ärztlicher Verordnung",
    contactWay: "Suche und Kontaktdaten auf der Website",
    url: "https://www.logopaedie.ch",
  },
  {
    slug: "sahb-hilfsmittelberatung",
    organization: "SAHB Hilfsmittelberatung",
    title: "Beratung zu Hilfsmitteln",
    summary: "Fachstelle für Hilfsmittel wie Rollstühle oder Gehhilfen – Beratung, Abgabe und Anpassung.",
    description:
      "Die SAHB berät gemäss Anbieter zu Hilfsmitteln für Mobilität und Alltag und arbeitet dabei unter anderem mit der Invalidenversicherung zusammen. Die Website nennt die regionalen Stellen.",
    topics: ["mobilitaet"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen, die Hilfsmittel für Mobilität und Alltag benötigen",
    responsibility: "Schweizerische Fachstelle für Hilfsmittelberatung",
    access: "Kontakt zur regionalen Stelle; Kostenübernahme je nach Versicherung",
    contactWay: WEB,
    url: "https://www.sahb.ch",
  },
  {
    slug: "hindernisfreie-architektur",
    organization: "Hindernisfreie Architektur – Die Schweizer Fachstelle",
    title: "Hindernisfrei bauen und wohnen",
    summary: "Fachstelle mit Informationen zum hindernisfreien Bauen und Anpassen von Wohnungen.",
    description:
      "Die Schweizer Fachstelle für hindernisfreie Architektur stellt gemäss Anbieter Informationen, Merkblätter und Kontakte zu regionalen Beratungsstellen bereit, etwa wenn eine Wohnung angepasst werden soll.",
    topics: ["mobilitaet"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit Mobilitätseinschränkung, Angehörige, Bauherrschaften",
    responsibility: "Schweizer Fachstelle für hindernisfreie Architektur",
    access: "Informationen auf der Website, Vermittlung regionaler Beratung",
    contactWay: WEB,
    url: "https://www.hindernisfreie-architektur.ch",
  },
  {
    slug: "pro-senectute",
    organization: "Pro Senectute",
    title: "Beratung und Unterstützung im Alter",
    summary: "Beratung und Dienstleistungen für ältere Menschen und ihre Angehörigen, regional organisiert.",
    description:
      "Pro Senectute bietet gemäss Anbieter Sozialberatung, Unterstützung im Alltag und weitere Dienstleistungen für Menschen im Pensionsalter an. Die Angebote unterscheiden sich je nach Kanton.",
    topics: ["beratung", "entlastung"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Ältere Menschen und ihre Angehörigen",
    responsibility: "Kantonale und regionale Pro-Senectute-Organisationen",
    access: "Kontakt zur kantonalen Organisation",
    contactWay: WEB,
    url: "https://www.prosenectute.ch",
  },
  {
    slug: "caritas-schweiz",
    organization: "Caritas Schweiz",
    title: "Sozial- und Schuldenberatung",
    summary: "Regionale Caritas-Stellen beraten bei finanziellen Schwierigkeiten und sozialen Fragen.",
    description:
      "Die regionalen Caritas-Organisationen bieten gemäss Anbieter Sozial- und Schuldenberatung sowie weitere Unterstützung für Menschen in schwierigen finanziellen Situationen an.",
    topics: ["finanzen", "beratung"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen in finanziell schwierigen Situationen",
    responsibility: "Regionale Caritas-Organisationen",
    access: "Kontakt zur regionalen Caritas-Stelle",
    contactWay: WEB,
    url: "https://www.caritas.ch",
  },
  {
    slug: "budgetberatung-schweiz",
    organization: "Budgetberatung Schweiz",
    title: "Budget planen",
    summary: "Vorlagen, Richtwerte und Beratungsstellen für die Budgetplanung im Haushalt.",
    description: "Budgetberatung Schweiz stellt gemäss Anbieter Budgetvorlagen und Merkblätter bereit und nennt regionale Beratungsstellen.",
    topics: ["finanzen"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Alle, die ihr Haushaltsbudget planen möchten",
    responsibility: "Dachverband der Budgetberatungsstellen",
    access: "Informationen auf der Website, Beratung bei regionalen Stellen",
    contactWay: WEB,
    url: "https://www.budgetberatung.ch",
  },
  {
    slug: "schuldenberatung-schweiz",
    organization: "Schuldenberatung Schweiz",
    title: "Schuldenberatung finden",
    summary: "Dachverband der Schuldenberatungsstellen mit Verzeichnis anerkannter Beratungsstellen.",
    description: "Schuldenberatung Schweiz bietet gemäss Anbieter Informationen zu Schulden und ein Verzeichnis gemeinnütziger Beratungsstellen in den Regionen.",
    topics: ["finanzen"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Menschen mit Schulden oder drohender Verschuldung",
    responsibility: "Dachverband gemeinnütziger Schuldenberatungsstellen",
    access: "Kontakt zur regionalen Beratungsstelle",
    contactWay: WEB,
    url: "https://www.schulden.ch",
  },
  {
    slug: "ombudsstelle-krankenversicherung",
    organization: "Ombudsstelle Krankenversicherung",
    title: "Vermittlung bei Konflikten mit der Krankenkasse",
    summary: "Neutrale Anlaufstelle bei Streitigkeiten mit der Krankenversicherung.",
    description:
      "Die Ombudsstelle Krankenversicherung vermittelt gemäss Anbieter bei Konflikten zwischen Versicherten und ihrer Krankenversicherung, etwa bei abgelehnten Leistungen.",
    topics: ["finanzen", "recht"],
    cantons: ["CH"],
    languages: ["de", "fr", "it"],
    audience: "Versicherte mit Fragen oder Konflikten zur Krankenversicherung",
    responsibility: "Unabhängige Ombudsstelle",
    access: "Anfrage über die Website",
    contactWay: WEB,
    url: "https://www.om-kv.ch",
  },
  {
    slug: "elternnotruf",
    organization: "Elternnotruf",
    title: "Beratung für Eltern",
    summary: "Beratung für Eltern und Bezugspersonen in belastenden Situationen mit Kindern und in der Familie.",
    description: "Der Elternnotruf berät gemäss Anbieter Eltern und Bezugspersonen bei Fragen und Krisen im Familienalltag – telefonisch und online.",
    topics: ["psyche", "entlastung"],
    cantons: ["CH"],
    languages: ["de"],
    audience: "Eltern und Bezugspersonen von Kindern und Jugendlichen",
    responsibility: "Gemeinnützige Beratungsorganisation",
    access: "Direkt anrufen oder online Kontakt aufnehmen",
    contactWay: WEB,
    url: "https://www.elternnotruf.ch",
  },
  {
    slug: "tox-info-suisse",
    organization: "Tox Info Suisse",
    title: "Notfallberatung bei Vergiftungen",
    summary: "Ärztliche Beratung bei Vergiftungen oder Verdacht auf Vergiftung, auch durch Medikamente – Telefon 145.",
    description:
      "Tox Info Suisse ist gemäss Anbieter unter der Nummer 145 rund um die Uhr erreichbar und berät bei Vergiftungen oder Verdacht darauf. Bei Bewusstlosigkeit oder Atemnot ruf direkt den Sanitätsnotruf 144 an.",
    topics: ["beratung"],
    cantons: ["CH"],
    languages: ["de", "fr", "it", "en"],
    audience: "Alle Menschen bei Verdacht auf Vergiftung",
    responsibility: "Offizielles Informationszentrum der Schweiz für Vergiftungen",
    access: "Direkt anrufen, ohne Anmeldung",
    costNote: "Kosten gemäss Anbieter (Notfallberatung gemäss Anbieter kostenlos)",
    contactWay: "Telefon 145",
    url: "https://www.toxinfo.ch",
  },
];

/* ─────────────────────────── Rechtstexte (Entwürfe) ─────────────────────────── */

const DRAFT_NOTE =
  "Entwurf – rechtliche Prüfung D01 ausstehend. Trägerschaft, Kontaktadressen und Dienstleister werden vor dem Pilotstart ergänzt. Dieser Text ist noch keine verbindliche Erklärung.";

const LEGAL_PAGES: { slug: string; title: string; textVersion: string; validFrom: string; body: string }[] = [
  {
    slug: "regeln",
    title: "Community-Regeln",
    textVersion: COMMUNITY_RULES_VERSION,
    validFrom: "2026-11-01",
    body: `Diese Regeln gelten für alle Beiträge, Antworten, Profile und Gespräche in der Community. Du bestätigst sie vor deinem ersten Beitrag. Wenn sich die Regeln ändern, zeigen wir dir die neue Fassung und bitten dich erneut um Bestätigung.

## Worum es hier geht
Die Community ist ein geschützter Ort für den Austausch unter Erwachsenen mit MS. Wir wollen, dass sich alle sicher fühlen – auch an Tagen mit wenig Energie.

## Was willkommen ist
- Eigene Erfahrungen teilen, auch mit Behandlungen, Therapien und dem Alltag
- Fragen stellen, Mut machen, zuhören
- Unterschiedliche Meinungen, solange sie respektvoll geäussert werden
- Hinweise auf geprüfte Informationen und Hilfsangebote

## Was nicht erlaubt ist
- Belästigung, Beleidigung, Drohungen und Diskriminierung
- Doxxing: persönliche Daten anderer veröffentlichen, etwa Namen, Adressen, Arbeitgeber oder Fotos
- Betrug, Spendenaufrufe unter falschen Angaben und Spam
- Werbung für Produkte, Dienstleistungen oder Studien ohne vorherige Freigabe durch das Team
- Gefährliche individuelle Therapieanweisungen, etwa «Setz dein Medikament ab» oder konkrete Dosierungsempfehlungen für andere
- Inhalte, die zu Selbstverletzung oder Gewalt auffordern

## Erfahrungen sind keine Behandlungspläne
Du darfst erzählen, was dir geholfen hat. Bitte formuliere es als eigene Erfahrung und nicht als Empfehlung für andere. Für Entscheidungen zur Behandlung sind die behandelnden Fachpersonen zuständig.

## Privatsphäre
Teile nur, was du teilen möchtest. Gib keine Informationen über andere Personen weiter, ohne deren Einverständnis. Screenshots aus Gesprächen gehören nicht in die Community.

## Melden und Blockieren
Wenn dich etwas stört oder beunruhigt, kannst du Beiträge, Antworten, Profile, Nachrichten und Gruppen melden. Du kannst andere Mitglieder jederzeit blockieren. Meldende bleiben gegenüber der gemeldeten Person anonym.

## Moderation
Die Moderation ist täglich von 9 bis 18 Uhr im Dienst. Sie berücksichtigt den Zusammenhang eines Beitrags und kann Inhalte ausblenden, verwarnen oder das Schreiben zeitweise sperren. Dauerhafte Sperren brauchen eine zweite Freigabe. Gegen Entscheide kannst du innerhalb von 30 Tagen Einspruch erheben; eine andere Person prüft ihn.

## In akuten Krisen
Die Community ist kein Notfalldienst. Bei akuter Gefahr ruf den Sanitätsnotruf 144 an. Weitere Hilfewege findest du auf der Seite «Sicherheit und akute Hilfe».`,
  },
  {
    slug: "datenschutz",
    title: "Datenschutzinformation",
    textVersion: PRIVACY_VERSION,
    validFrom: "2026-11-01",
    body: `${DRAFT_NOTE}

## Das Wichtigste in Kürze
- Dein Tagebuch ist nur für dich sichtbar. Es gibt keine Freigabe an Kontakte, Moderation, Redaktion oder Fachpersonen.
- In der Community bist du mit einem Pseudonym unterwegs. Deine E-Mail-Adresse ist nie sichtbar.
- Wir verkaufen keine Daten, zeigen keine Werbung und verwenden keine Werbe-Tracker oder Session-Replays.
- Du kannst deine Daten jederzeit exportieren und dein Konto löschen.

## Bitte beachte
Schon die Mitgliedschaft auf einer Plattform für Menschen mit MS lässt Rückschlüsse auf deine Gesundheit zu. Wir behandeln deshalb auch Kontodaten mit besonderer Sorgfalt.

## Verantwortliche Stelle
[Name und Adresse der Trägerschaft – vor Pilotstart festzulegen]
Kontakt für Datenschutzanliegen: über das Kontaktformular, Kategorie «Datenschutz und meine Rechte», oder per E-Mail an die Datenschutzkontaktstelle [Adresse folgt].

## Welche Daten wir bearbeiten und wozu
- Konto: E-Mail-Adresse, Passwort (nur als sicherer Hash), Anmeldezeiten – um dir einen sicheren Zugang zu ermöglichen.
- Community-Profil: Pseudonym, freiwillige Interessen und optional dein Kanton – damit andere Mitglieder dich in der Community erkennen.
- Beiträge, Antworten und Nachrichten – damit der Austausch funktioniert.
- Gesundheitsbereich (nur nach ausdrücklicher Aktivierung): Check-ins, Symptome, Fatigue und Notizen – ausschliesslich für dich.
- Meldungen und Moderationsfälle – um die Community zu schützen.
- Kontaktformular: dein Anliegen und optional eine Antwortadresse – um dein Anliegen zu bearbeiten.
- Technische Protokolle ohne Inhalte – für Sicherheit und Betrieb.

## Wer Daten erhält
Mitarbeitende sehen nur, was ihre Aufgabe erfordert. Die Moderation sieht gemeldete Inhalte, aber kein Tagebuch. Für den Betrieb setzen wir Dienstleister ein, etwa für Hosting, Datenbank, Objektablage und E-Mail-Versand. Sie bearbeiten Daten nur in unserem Auftrag.
[Liste der Dienstleister mit Sitz und Datenstandort – vor Pilotstart zu ergänzen]

## In welchen Ländern
Ziel ist eine primäre Datenhaltung einschliesslich Backups in der Schweiz. Ob Daten in andere Länder bekanntgegeben werden, etwa durch Fernzugriffe von Dienstleistern, wird vor dem Pilotstart geprüft und hier offengelegt.

## Wie lange wir Daten aufbewahren
Die folgenden Fristen sind vorgeschlagene betriebliche Obergrenzen und werden vor dem Pilotstart geprüft.
- Unbestätigte Konten: 7 Tage
- Konto und Profil: bis zur Löschung; nach 24 Monaten Inaktivität erhältst du zuerst eine Nachricht und hast 30 Tage Zeit zu reagieren
- Check-ins und Tagebuch: bis du sie löschst oder die Einwilligung widerrufst; danach sofort gesperrt und innert 30 Tagen gelöscht
- Beiträge und Nachrichten: bis zur Löschung des Inhalts oder Kontos
- Einwilligungsnachweise: während der Nutzung und vorgeschlagen 3 Jahre danach
- Meldungen und Belege: 180 Tage nach Abschluss des Falls
- Sicherheits- und Auditprotokolle: 180 Tage, ohne Inhalte
- Exporte: höchstens 24 Stunden ab Bereitstellung
- Backups: rollierend höchstens 35 Tage

## Deine Rechte
Du kannst Auskunft über deine Daten verlangen, falsche Daten berichtigen lassen, deine Daten exportieren und löschen. Vieles davon kannst du direkt unter «Daten und Konto» erledigen. Für weitere Anliegen nutze das Kontaktformular. Du kannst dich ausserdem an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden.

## Einwilligungen
Den Gesundheitsbereich aktivierst du mit einer gesonderten, freiwilligen Entscheidung. Du kannst sie jederzeit widerrufen. Ohne Gesundheitsbereich stehen dir alle anderen Bereiche offen.

## Sicherheit
Freitexte wie Tagebuchnotizen und Nachrichten werden verschlüsselt gespeichert. Mitarbeitende melden sich mit einem zweiten Faktor an. Privilegierte Zugriffe werden protokolliert.`,
  },
  {
    slug: "bedingungen",
    title: "Nutzungsbedingungen",
    textVersion: TERMS_VERSION,
    validFrom: "2026-11-01",
    body: `${DRAFT_NOTE}

## Wer die Plattform nutzen kann
Die Plattform richtet sich an Erwachsene ab 18 Jahren, die selbst mit MS leben, sowie an Interessierte, die die öffentlichen Inhalte lesen. Wir verlangen keinen Diagnosenachweis.

## Was die Plattform bietet
- freiwillige, private Alltagsdokumentation
- moderierten Austausch in der Community und in Gesprächen nach gegenseitiger Zustimmung
- redaktionell geprüftes Wissen und ein Verzeichnis von Schweizer Hilfsangeboten

## Was die Plattform nicht ist
- kein Notfalldienst und keine Überwachung rund um die Uhr
- keine medizinische Beratung, Diagnose oder Therapieempfehlung
- keine Vermittlung von Behandlungen oder Terminen
- keine Garantie, dass andere Mitglieder antworten

## Dein Konto
Bitte schütze dein Passwort und melde dich auf fremden Geräten ab. Ein Konto ist persönlich und darf nicht geteilt werden.

## Inhalte, die du teilst
Du bist für deine Beiträge verantwortlich. Es gelten die Community-Regeln. Du behältst die Rechte an deinen Texten und erlaubst uns, sie innerhalb der Community anzuzeigen, solange du sie nicht löschst.

## Moderation und Massnahmen
Bei Regelverstössen können Inhalte ausgeblendet, Verwarnungen ausgesprochen oder Schreibrechte zeitweise eingeschränkt werden. Du erhältst einen begründeten Entscheid und kannst innerhalb von 30 Tagen Einspruch erheben. Auch bei einer Sperre bleiben Auskunft, Export, Löschung und Einspruch möglich.

## Verfügbarkeit
Wir bemühen uns um einen zuverlässigen Betrieb. Bei Störungen können einzelne Funktionen vorübergehend eingeschränkt sein; die Sicherheitsseite bleibt nach Möglichkeit erreichbar.

## Konto löschen
Du kannst dein Konto jederzeit löschen. Die Folgen und Fristen werden dir vor der Bestätigung angezeigt.

## Änderungen
Wenn sich diese Bedingungen wesentlich ändern, informieren wir dich und zeigen die neue Fassung mit Gültigkeitsdatum an.`,
  },
  {
    slug: "impressum",
    title: "Impressum",
    textVersion: "impressum-2026-11-v1",
    validFrom: "2026-11-01",
    body: `${DRAFT_NOTE}

## Betreiberin
[Name der Trägerschaft]
[Rechtsform]
[Strasse und Hausnummer]
[Postleitzahl und Ort], Schweiz

## Kontakt
Bitte nutze das Kontaktformular. Es ist kein Notfallkanal – bei akuter Gefahr ruf den Sanitätsnotruf 144 an.

## Verantwortlich für den Inhalt
- Produktverantwortung: [Name folgt]
- Medizinische Redaktionsleitung: [Name folgt]
- Moderationsleitung: [Name folgt]
- Datenschutzkontaktstelle: [Name folgt]

## Hinweis zu Inhalten
Die Wissensartikel enthalten allgemeine Informationen und ersetzen keine ärztliche oder therapeutische Beratung. Beiträge in der Community geben die persönliche Sicht der Mitglieder wieder und sind nicht fachlich geprüft.

## Externe Links
Links zu externen Websites sind als solche gekennzeichnet. Für deren Inhalte sind die jeweiligen Anbieter verantwortlich. Beim Öffnen werden keine Profil- oder Gesundheitsdaten übertragen.`,
  },
  {
    slug: "barrierefreiheit",
    title: "Erklärung zur Barrierefreiheit",
    textVersion: "barrierefreiheit-2026-11-v1",
    validFrom: "2026-11-01",
    body: `Diese Plattform wird für Menschen mit Fatigue, Seh- und motorischen Einschränkungen entwickelt. Barrierefreiheit ist deshalb kein Zusatz, sondern Grundlage.

## Unser Ziel
Wir streben die Konformität mit den Web Content Accessibility Guidelines (WCAG) 2.2 auf Stufe AA für alle Ansichten an, einschliesslich der Verwaltung. Eine verbindliche Konformitätsaussage machen wir erst nach einer dokumentierten Prüfung des gesamten Angebots.

## Stand
Die Plattform befindet sich im Aufbau. Eine vollständige Prüfung mit automatischen Tests, Tastatur, Screenreadern (VoiceOver, NVDA, TalkBack), 200 Prozent Textgrösse und 400 Prozent Zoom ist vor dem Pilotstart vorgesehen. Die Ergebnisse veröffentlichen wir hier.

## Was wir bereits umsetzen
- Bedienung vollständig per Tastatur mit sichtbarem Fokus
- Kontraste von mindestens 4,5 zu 1 für normalen Text
- Darstellung ab 320 Pixel Breite ohne seitliches Scrollen
- grosse Schaltflächen von mindestens 44 mal 44 Pixel für Hauptaktionen
- einfache Ansicht, Schriftvergrösserung und reduzierte Bewegung unter «Anzeige und Bedienung» – auch ohne Konto
- Status nie nur über Farbe, sondern immer auch als Text
- keine Zeitlimits, keine automatisch startenden Medien, keine Endlos-Feeds

## Bekannte Einschränkungen
Einzelne Bereiche wurden noch nicht vollständig mit Screenreadern geprüft. Dekorative Animationen werden bei reduzierter Bewegung und in der einfachen Ansicht ausgeschaltet.

## Barriere melden
Wenn dir eine Barriere auffällt oder du Inhalte in einer anderen Form brauchst, schreib uns über das Kontaktformular mit der Kategorie «Barriere melden». Beschreibe, wo das Problem auftritt und welches Gerät oder Hilfsmittel du nutzt. Wir melden uns, wenn du eine Antwortadresse angibst.`,
  },
];

/* ─────────────────────────── Sicherheitskontakte (S49) ─────────────────────────── */

/**
 * Nur allgemein bekannte, offizielle Schweizer Nummern. PRD 10 verlangt eine fachliche
 * Verifikation vor dem Launch – im Demo-Seed ausdrücklich als ausstehend gekennzeichnet.
 * Prüfung vor Produktivbetrieb erforderlich.
 */
const SAFETY_VERIFIER = "Demo – fachliche Prüfung ausstehend";
const SAFETY_CONTACTS = [
  { sort: 10, name: "Sanitätsnotruf 144", phone: "144", url: null, availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Bei akuter Lebensgefahr, schweren Verletzungen oder plötzlichen starken Beschwerden wie Lähmungen oder Sprachstörungen." },
  { sort: 20, name: "Euronotruf 112", phone: "112", url: null, availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Allgemeine europäische Notrufnummer. Sie wird an die zuständige Notrufzentrale weitergeleitet." },
  { sort: 30, name: "Polizeinotruf 117", phone: "117", url: null, availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Wenn du oder andere bedroht werden oder eine Straftat geschieht." },
  { sort: 40, name: "Die Dargebotene Hand 143", phone: "143", url: "https://www.143.ch", availability: "Rund um die Uhr, auch per Chat und E-Mail", region: "Ganze Schweiz", description: "Anonymes Gespräch, wenn dich etwas belastet, du in einer Krise bist oder an Suizid denkst." },
  { sort: 50, name: "Tox Info Suisse 145", phone: "145", url: "https://www.toxinfo.ch", availability: "Rund um die Uhr", region: "Ganze Schweiz", description: "Bei Vergiftungen oder Verdacht auf Vergiftung, auch durch Medikamente. Bei Bewusstlosigkeit direkt 144 anrufen." },
];

/* ─────────────────────────── Ablauf ─────────────────────────── */

export async function seedContent(ctx: SeedContext): Promise<void> {
  const { db, staff } = ctx;

  // Themen für Hilfe (Katalog) und Wissen
  for (const [i, [slug, name]] of HELP_TOPICS.entries()) {
    await db.insert(s.helpTopics).values({ slug, name, sort: i }).onConflictDoUpdate({ target: s.helpTopics.slug, set: { name, sort: i } });
  }
  const topicIds = new Map<string, string>();
  for (const [i, t] of KNOWLEDGE_TOPICS.entries()) {
    const [row] = await db
      .insert(s.knowledgeTopics)
      .values({ ...t, sort: i })
      .onConflictDoUpdate({ target: s.knowledgeTopics.slug, set: { name: t.name, description: t.description, sort: i } })
      .returning({ id: s.knowledgeTopics.id });
    topicIds.set(t.slug, row.id);
  }

  // Artikel: publiziert, mit Fremdprüfung (Demo) und nächstem Prüftermin in 12 Monaten (CON03)
  for (const [i, a] of ARTICLES.entries()) {
    const topicId = topicIds.get(a.topic);
    if (!topicId) throw new Error(`Unbekanntes Thema ${a.topic}`);
    const reviewedAt = daysAgo(3 + (i % 20));
    const publishedAt = new Date(reviewedAt.getTime() + DAY / 2);
    const reviewDueAt = addMonths(reviewedAt, 12);
    const [existing] = await db.select({ id: s.articles.id, pv: s.articles.publishedVersionId }).from(s.articles).where(eq(s.articles.slug, a.slug));
    let versionId: string;
    if (!existing) {
      const [article] = await db.insert(s.articles).values({ slug: a.slug, topicId }).returning({ id: s.articles.id });
      const [v] = await db
        .insert(s.articleVersions)
        .values({
          articleId: article.id,
          versionNo: 1,
          title: a.title,
          summary: a.summary,
          body: a.body,
          authorId: staff.editor,
          authorDisplay: "Redaktion MS Plattform",
          status: "published",
          isMedical: a.medical,
          readingMinutes: a.minutes,
          reviewDueAt,
          publishedAt,
        })
        .returning({ id: s.articleVersions.id });
      versionId = v.id;
      await db.update(s.articles).set({ publishedVersionId: v.id }).where(eq(s.articles.id, article.id));
    } else {
      // Seed erneut ausgeführt: Text der Seed-Version aktualisieren, Prüftermin auffrischen.
      const [v] = await db
        .select({ id: s.articleVersions.id })
        .from(s.articleVersions)
        .where(and(eq(s.articleVersions.articleId, existing.id), eq(s.articleVersions.versionNo, 1)));
      versionId = v.id;
      await db.update(s.articles).set({ topicId }).where(eq(s.articles.id, existing.id));
      await db
        .update(s.articleVersions)
        .set({ title: a.title, summary: a.summary, body: a.body, isMedical: a.medical, readingMinutes: a.minutes })
        .where(eq(s.articleVersions.id, v.id));
      // Nur die Seed-Version wieder publizieren, wenn keine neuere Version publiziert ist.
      if (!existing.pv || existing.pv === v.id) {
        await db
          .update(s.articleVersions)
          .set({ status: "published", reviewDueAt, publishedAt, withdrawnAt: null, withdrawReason: null })
          .where(eq(s.articleVersions.id, v.id));
        await db.update(s.articles).set({ publishedVersionId: v.id }).where(eq(s.articles.id, existing.id));
      }
      await db.delete(s.sourceReferences).where(eq(s.sourceReferences.versionId, v.id));
    }
    await db.insert(s.sourceReferences).values(
      a.sources.map((src, j) => ({
        versionId,
        title: src.title,
        publisher: src.publisher,
        url: src.url,
        publishedOn: "publishedOn" in src && src.publishedOn ? `${src.publishedOn}, ${RETRIEVED}` : RETRIEVED,
        rightsNote: LINK_ONLY,
        sort: j,
      })),
    );
    const [review] = await db.select({ id: s.editorialReviews.id }).from(s.editorialReviews).where(eq(s.editorialReviews.versionId, versionId));
    if (review) {
      await db.update(s.editorialReviews).set({ specialty: a.specialty, nextReviewDueAt: reviewDueAt, createdAt: reviewedAt }).where(eq(s.editorialReviews.id, review.id));
    } else {
      // Vieraugenprinzip: Autor (Redaktion) ≠ Prüfperson (medizinische Prüfung), DB-Trigger prüft zusätzlich.
      await db.insert(s.editorialReviews).values({
        versionId,
        reviewerId: staff.reviewer,
        reviewerDisplay: "Medizinische Redaktion (Demo-Prüfung)",
        specialty: a.specialty,
        decision: "approved",
        comment: "Demo-Prüfung für die Testumgebung. Vor Produktivbetrieb durch die benannte Prüfperson ersetzen.",
        nextReviewDueAt: reviewDueAt,
        createdAt: reviewedAt,
      });
    }
  }

  // Hilfsangebote: geprüft (Demo) und publiziert, nächste Prüfung spätestens nach sechs Monaten (CON05)
  for (const [i, o] of OFFERS.entries()) {
    const reviewedAt = daysAgo(2 + (i % 25));
    const nextReviewAt = addMonths(reviewedAt, 6);
    const values = {
      slug: o.slug,
      organization: o.organization,
      title: o.title,
      summary: o.summary,
      description: o.description,
      topicSlugs: o.topics,
      cantons: o.cantons,
      languages: o.languages,
      audience: o.audience,
      responsibility: o.responsibility,
      access: o.access,
      costNote: o.costNote ?? "Kosten gemäss Anbieter",
      contactWay: o.contactWay,
      url: o.url,
      status: "published" as const,
      reviewedAt,
      nextReviewAt,
    };
    const { slug: _slug, ...update } = values;
    void _slug;
    const [row] = await db
      .insert(s.supportOffers)
      .values(values)
      .onConflictDoUpdate({ target: s.supportOffers.slug, set: update })
      .returning({ id: s.supportOffers.id });
    const [rec] = await db
      .select({ id: s.verificationRecords.id })
      .from(s.verificationRecords)
      .where(and(eq(s.verificationRecords.targetType, "offer"), eq(s.verificationRecords.targetId, row.id)));
    if (!rec) {
      await db.insert(s.verificationRecords).values({
        targetType: "offer",
        targetId: row.id,
        verifierId: staff.editor,
        method: "website",
        verifiedAt: reviewedAt,
        nextDueAt: nextReviewAt,
        note: "Demo: Abgleich mit der offiziellen Website. Vor Produktivbetrieb beim Anbieter bestätigen.",
      });
    }
  }

  // Sicherheitskontakte (SAF06) – Prüfung vor Produktivbetrieb erforderlich
  const safetyNames = SAFETY_CONTACTS.map((c) => c.name);
  const existingSafety = await db.select({ id: s.safetyContacts.id, name: s.safetyContacts.name }).from(s.safetyContacts).where(inArray(s.safetyContacts.name, safetyNames));
  for (const c of SAFETY_CONTACTS) {
    const values = { ...c, active: true, verifiedAt: now, verifiedBy: SAFETY_VERIFIER, nextDueAt: new Date(now.getTime() + 30 * DAY) };
    const found = existingSafety.find((e) => e.name === c.name);
    let id = found?.id;
    if (id) await db.update(s.safetyContacts).set(values).where(eq(s.safetyContacts.id, id));
    else id = (await db.insert(s.safetyContacts).values(values).returning({ id: s.safetyContacts.id }))[0].id;
    const [rec] = await db
      .select({ id: s.verificationRecords.id })
      .from(s.verificationRecords)
      .where(and(eq(s.verificationRecords.targetType, "safety_contact"), eq(s.verificationRecords.targetId, id)));
    if (!rec) {
      await db.insert(s.verificationRecords).values({
        targetType: "safety_contact",
        targetId: id,
        verifierId: staff.editor,
        method: "website",
        verifiedAt: now,
        nextDueAt: new Date(now.getTime() + 30 * DAY),
        note: "Demo-Eintrag. Prüfung vor Produktivbetrieb durch Krisenfachpersonen erforderlich (PRD 10).",
      });
    }
  }

  // Rechtstexte (S50)
  for (const p of LEGAL_PAGES) {
    await db
      .insert(s.pages)
      .values(p)
      .onConflictDoUpdate({ target: s.pages.slug, set: { title: p.title, body: p.body, textVersion: p.textVersion, validFrom: p.validFrom } });
  }

  // Mein Moment: eine aktive Version mit der Standardkonfiguration (HOM02)
  const [rule] = await db.select({ id: s.momentRules.id }).from(s.momentRules).limit(1);
  if (!rule) {
    await db.insert(s.momentRules).values({
      versionLabel: "Standard 2026-11",
      active: true,
      config: DEFAULT_MOMENT_CONFIG,
      createdBy: staff.editor,
      publishedAt: now,
    });
  }

  console.log(`Inhalte: ${ARTICLES.length} Artikel, ${OFFERS.length} Angebote, ${SAFETY_CONTACTS.length} Sicherheitskontakte, ${LEGAL_PAGES.length} Rechtstexte.`);
}
