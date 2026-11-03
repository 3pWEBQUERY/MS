/** Wissensthemen und Quellenverzeichnis. Teil des Startbestands (CON08), siehe scripts/seed/content/run.ts. */
import type { Src } from "./shared";

/* ─────────────────────────── Wissensthemen ─────────────────────────── */

export const KNOWLEDGE_TOPICS = [
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

export const SRC = {
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
