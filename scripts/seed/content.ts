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
