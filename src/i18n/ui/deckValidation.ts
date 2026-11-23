import type { DeckIssue } from '../../decks/types';
import type { SupportedLanguage } from '../languages';
import { localizeGameTerms } from '../terms';

export type DeckWhereKey =
    | 'ringBearer'
    | 'oneRing'
    | 'starting'
    | 'fpDraw'
    | 'shadowDraw'
    | 'adventure';

type DeckValidationMessages = {
    where: Record<DeckWhereKey, string>;
    name: string;
    ringBearer: string;
    oneRing: string;
    unknownCard: (id: string, where: string) => string;
    xList: (title: string, id: string, where: string) => string;
    startingType: (title: string) => string;
    startingCost: (cost: number, max: number) => string;
    fpSite: (id: string) => string;
    fpRing: (id: string) => string;
    fpKind: (title: string) => string;
    shadowSite: (id: string) => string;
    shadowRing: (id: string) => string;
    shadowKind: (title: string) => string;
    balance: (
        fp: number,
        fpDraw: number,
        starting: number,
        shadow: number
    ) => string;
    size: (n: number, min: number) => string;
    copies: (title: string, count: number, max: number) => string;
    siteCount: (n: number) => string;
    siteDup: (id: string) => string;
    siteType: (id: string) => string;
    siteSet: (title: string, id: string) => string;
    siteTwilight: (count: number, tw: number, max: number) => string;
};

const fr: DeckValidationMessages = {
    where: {
        ringBearer: 'Porteur',
        oneRing: 'Anneau',
        starting: 'compagnie de départ',
        fpDraw: 'pioche Peuples Libres',
        shadowDraw: 'pioche Ombre',
        adventure: "paquet d'aventure",
    },
    name: 'Le deck doit avoir un nom.',
    ringBearer:
        'Porteur invalide : choisissez Frodon ou un personnage pouvant porter l’Anneau.',
    oneRing: 'L’Anneau Unique doit être une carte de type Anneau.',
    unknownCard: (id, where) => `Carte introuvable : ${id} (${where}).`,
    xList: (title, id, where) =>
        `${title} (${id}) est sur la liste X (${where}).`,
    startingType: (title) =>
        `${title} n’est pas un compagnon (compagnie de départ).`,
    startingCost: (cost, max) =>
        `Coût de la compagnie de départ : ${cost} (max ${max}).`,
    fpSite: (id) => `Site interdit dans la pioche : ${id}.`,
    fpRing: (id) => `Anneau interdit dans la pioche : ${id}.`,
    fpKind: (title) =>
        `${title} est marquée Ombre (pioche Peuples Libres).`,
    shadowSite: (id) => `Site interdit dans la pioche : ${id}.`,
    shadowRing: (id) => `Anneau interdit dans la pioche : ${id}.`,
    shadowKind: (title) =>
        `${title} est marquée Peuples Libres (pioche Ombre).`,
    balance: (fp, fpDraw, starting, shadow) =>
        `Peuples Libres (${fp} = pioche ${fpDraw} + départ ${starting}) ≠ Ombre (${shadow}).`,
    size: (n, min) =>
        `Pioche trop petite : ${n} cartes (min ${min}, départ inclus).`,
    copies: (title, count, max) =>
        `Trop de copies de « ${title} » : ${count} (max ${max}).`,
    siteCount: (n) =>
        `Le paquet d’aventure doit avoir 9 sites (actuellement ${n}).`,
    siteDup: (id) => `Site en double : ${id}.`,
    siteType: (id) => `${id} n’est pas un site.`,
    siteSet: (title, id) =>
        `${title} (${id}) : sites sets 11–18 uniquement.`,
    siteTwilight: (count, tw, max) =>
        `${count} sites à crépuscule ${tw} (max ${max}).`,
};

const en: DeckValidationMessages = {
    where: {
        ringBearer: 'Ring-bearer',
        oneRing: 'Ring',
        starting: 'starting fellowship',
        fpDraw: 'Free Peoples draw deck',
        shadowDraw: 'Shadow draw deck',
        adventure: 'adventure deck',
    },
    name: 'The deck must have a name.',
    ringBearer:
        'Invalid Ring-bearer: choose Frodo or a character who can bear the Ring.',
    oneRing: 'The One Ring must be a Ring-type card.',
    unknownCard: (id, where) => `Card not found: ${id} (${where}).`,
    xList: (title, id, where) =>
        `${title} (${id}) is on the X-list (${where}).`,
    startingType: (title) =>
        `${title} is not a companion (starting fellowship).`,
    startingCost: (cost, max) =>
        `Starting fellowship cost: ${cost} (max ${max}).`,
    fpSite: (id) => `Site not allowed in the draw deck: ${id}.`,
    fpRing: (id) => `Ring not allowed in the draw deck: ${id}.`,
    fpKind: (title) =>
        `${title} is marked Shadow (Free Peoples draw deck).`,
    shadowSite: (id) => `Site not allowed in the draw deck: ${id}.`,
    shadowRing: (id) => `Ring not allowed in the draw deck: ${id}.`,
    shadowKind: (title) =>
        `${title} is marked Free Peoples (Shadow draw deck).`,
    balance: (fp, fpDraw, starting, shadow) =>
        `Free Peoples (${fp} = draw ${fpDraw} + starting ${starting}) ≠ Shadow (${shadow}).`,
    size: (n, min) =>
        `Draw deck too small: ${n} cards (min ${min}, starting included).`,
    copies: (title, count, max) =>
        `Too many copies of “${title}”: ${count} (max ${max}).`,
    siteCount: (n) =>
        `The adventure deck must have 9 sites (currently ${n}).`,
    siteDup: (id) => `Duplicate site: ${id}.`,
    siteType: (id) => `${id} is not a site.`,
    siteSet: (title, id) =>
        `${title} (${id}): only site sets 11–18.`,
    siteTwilight: (count, tw, max) =>
        `${count} sites at Twilight ${tw} (max ${max}).`,
};

const de: DeckValidationMessages = {
    where: {
        ringBearer: 'Ringträger',
        oneRing: 'Ring',
        starting: 'Startgemeinschaft',
        fpDraw: 'Nachziehstapel Freie Völker',
        shadowDraw: 'Nachziehstapel Schatten',
        adventure: 'Abenteuerdeck',
    },
    name: 'Das Deck braucht einen Namen.',
    ringBearer:
        'Ungültiger Ringträger: Wähle Frodo oder einen Charakter, der den Ring tragen kann.',
    oneRing: 'Der Eine Ring muss eine Ring-Karte sein.',
    unknownCard: (id, where) => `Karte nicht gefunden: ${id} (${where}).`,
    xList: (title, id, where) =>
        `${title} (${id}) steht auf der X-Liste (${where}).`,
    startingType: (title) =>
        `${title} ist kein Gefährte (Startgemeinschaft).`,
    startingCost: (cost, max) =>
        `Kosten der Startgemeinschaft: ${cost} (max. ${max}).`,
    fpSite: (id) => `Ort im Nachziehstapel nicht erlaubt: ${id}.`,
    fpRing: (id) => `Ring im Nachziehstapel nicht erlaubt: ${id}.`,
    fpKind: (title) =>
        `${title} ist als Schatten markiert (Nachziehstapel Freie Völker).`,
    shadowSite: (id) => `Ort im Nachziehstapel nicht erlaubt: ${id}.`,
    shadowRing: (id) => `Ring im Nachziehstapel nicht erlaubt: ${id}.`,
    shadowKind: (title) =>
        `${title} ist als Freie Völker markiert (Nachziehstapel Schatten).`,
    balance: (fp, fpDraw, starting, shadow) =>
        `Freie Völker (${fp} = Nachzieh ${fpDraw} + Start ${starting}) ≠ Schatten (${shadow}).`,
    size: (n, min) =>
        `Nachziehstapel zu klein: ${n} Karten (min. ${min}, Start inklusive).`,
    copies: (title, count, max) =>
        `Zu viele Kopien von „${title}“: ${count} (max. ${max}).`,
    siteCount: (n) =>
        `Das Abenteuerdeck braucht 9 Orte (aktuell ${n}).`,
    siteDup: (id) => `Doppelter Ort: ${id}.`,
    siteType: (id) => `${id} ist kein Ort.`,
    siteSet: (title, id) =>
        `${title} (${id}): nur Ort-Sets 11–18.`,
    siteTwilight: (count, tw, max) =>
        `${count} Orte mit Einfluss ${tw} (max. ${max}).`,
};

const it: DeckValidationMessages = {
    where: {
        ringBearer: 'Portatore',
        oneRing: 'Anello',
        starting: 'compagnia iniziale',
        fpDraw: 'mazzo Popoli Liberi',
        shadowDraw: 'mazzo Ombra',
        adventure: 'mazzo d’avventura',
    },
    name: 'Il mazzo deve avere un nome.',
    ringBearer:
        'Portatore non valido: scegli Frodo o un personaggio che può portare l’Anello.',
    oneRing: 'L’Unico Anello deve essere una carta di tipo Anello.',
    unknownCard: (id, where) => `Carta non trovata: ${id} (${where}).`,
    xList: (title, id, where) =>
        `${title} (${id}) è nella lista X (${where}).`,
    startingType: (title) =>
        `${title} non è un compagno (compagnia iniziale).`,
    startingCost: (cost, max) =>
        `Costo della compagnia iniziale: ${cost} (max ${max}).`,
    fpSite: (id) => `Sito non ammesso nel mazzo: ${id}.`,
    fpRing: (id) => `Anello non ammesso nel mazzo: ${id}.`,
    fpKind: (title) =>
        `${title} è marcata Ombra (mazzo Popoli Liberi).`,
    shadowSite: (id) => `Sito non ammesso nel mazzo: ${id}.`,
    shadowRing: (id) => `Anello non ammesso nel mazzo: ${id}.`,
    shadowKind: (title) =>
        `${title} è marcata Popoli Liberi (mazzo Ombra).`,
    balance: (fp, fpDraw, starting, shadow) =>
        `Popoli Liberi (${fp} = mazzo ${fpDraw} + partenza ${starting}) ≠ Ombra (${shadow}).`,
    size: (n, min) =>
        `Mazzo troppo piccolo: ${n} carte (min ${min}, partenza inclusa).`,
    copies: (title, count, max) =>
        `Troppe copie di « ${title} »: ${count} (max ${max}).`,
    siteCount: (n) =>
        `Il mazzo d’avventura deve avere 9 siti (attualmente ${n}).`,
    siteDup: (id) => `Sito duplicato: ${id}.`,
    siteType: (id) => `${id} non è un sito.`,
    siteSet: (title, id) =>
        `${title} (${id}): solo set di siti 11–18.`,
    siteTwilight: (count, tw, max) =>
        `${count} siti a crepuscolo ${tw} (max ${max}).`,
};

const es: DeckValidationMessages = {
    where: {
        ringBearer: 'Portador',
        oneRing: 'Anillo',
        starting: 'compañía inicial',
        fpDraw: 'mazo Pueblos Libres',
        shadowDraw: 'mazo Sombra',
        adventure: 'mazo de aventura',
    },
    name: 'El mazo debe tener un nombre.',
    ringBearer:
        'Portador no válido: elige a Frodo o un personaje que pueda llevar el Anillo.',
    oneRing: 'El Anillo Único debe ser una carta de tipo Anillo.',
    unknownCard: (id, where) => `Carta no encontrada: ${id} (${where}).`,
    xList: (title, id, where) =>
        `${title} (${id}) está en la lista X (${where}).`,
    startingType: (title) =>
        `${title} no es un compañero (compañía inicial).`,
    startingCost: (cost, max) =>
        `Coste de la compañía inicial: ${cost} (máx. ${max}).`,
    fpSite: (id) => `Sitio no permitido en el mazo: ${id}.`,
    fpRing: (id) => `Anillo no permitido en el mazo: ${id}.`,
    fpKind: (title) =>
        `${title} está marcada Sombra (mazo Pueblos Libres).`,
    shadowSite: (id) => `Sitio no permitido en el mazo: ${id}.`,
    shadowRing: (id) => `Anillo no permitido en el mazo: ${id}.`,
    shadowKind: (title) =>
        `${title} está marcada Pueblos Libres (mazo Sombra).`,
    balance: (fp, fpDraw, starting, shadow) =>
        `Pueblos Libres (${fp} = mazo ${fpDraw} + inicio ${starting}) ≠ Sombra (${shadow}).`,
    size: (n, min) =>
        `Mazo demasiado pequeño: ${n} cartas (mín. ${min}, inicio incluido).`,
    copies: (title, count, max) =>
        `Demasiadas copias de « ${title} »: ${count} (máx. ${max}).`,
    siteCount: (n) =>
        `El mazo de aventura debe tener 9 sitios (ahora ${n}).`,
    siteDup: (id) => `Sitio duplicado: ${id}.`,
    siteType: (id) => `${id} no es un sitio.`,
    siteSet: (title, id) =>
        `${title} (${id}): solo sets de sitios 11–18.`,
    siteTwilight: (count, tw, max) =>
        `${count} sitios a crepúsculo ${tw} (máx. ${max}).`,
};

const CATALOG: Record<SupportedLanguage, DeckValidationMessages> = {
    fr,
    en,
    de,
    it,
    es,
};

function str(p: DeckIssue['params'], key: string): string {
    const v = p?.[key];
    return v == null ? '' : String(v);
}

function num(p: DeckIssue['params'], key: string): number {
    const v = p?.[key];
    return typeof v === 'number' ? v : Number(v) || 0;
}

/** Formate une issue de validation selon la langue d’interface. */
export function formatDeckIssue(
    lang: SupportedLanguage,
    issue: DeckIssue
): string {
    const t = CATALOG[lang] ?? fr;
    const p = issue.params || {};
    const whereKey = str(p, 'where') as DeckWhereKey;
    const whereLabel = t.where[whereKey] || str(p, 'where');

    switch (issue.code) {
        case 'NAME':
            return t.name;
        case 'RING_BEARER':
            return t.ringBearer;
        case 'ONE_RING':
            return t.oneRing;
        case 'UNKNOWN_CARD':
            return t.unknownCard(str(p, 'id'), whereLabel);
        case 'X_LIST':
            return t.xList(str(p, 'title'), str(p, 'id'), whereLabel);
        case 'STARTING_TYPE':
            return t.startingType(str(p, 'title'));
        case 'STARTING_COST':
            return t.startingCost(num(p, 'cost'), num(p, 'max'));
        case 'FP_SITE':
            return t.fpSite(str(p, 'id'));
        case 'FP_RING':
            return t.fpRing(str(p, 'id'));
        case 'FP_KIND':
            return t.fpKind(str(p, 'title'));
        case 'SHADOW_SITE':
            return t.shadowSite(str(p, 'id'));
        case 'SHADOW_RING':
            return t.shadowRing(str(p, 'id'));
        case 'SHADOW_KIND':
            return t.shadowKind(str(p, 'title'));
        case 'BALANCE':
            return t.balance(
                num(p, 'fp'),
                num(p, 'fpDraw'),
                num(p, 'starting'),
                num(p, 'shadow')
            );
        case 'SIZE':
            return t.size(num(p, 'n'), num(p, 'min'));
        case 'COPIES':
            return t.copies(str(p, 'title'), num(p, 'count'), num(p, 'max'));
        case 'SITE_COUNT':
            return t.siteCount(num(p, 'n'));
        case 'SITE_DUP':
            return t.siteDup(str(p, 'id'));
        case 'SITE_TYPE':
            return t.siteType(str(p, 'id'));
        case 'SITE_SET':
            return t.siteSet(str(p, 'title'), str(p, 'id'));
        case 'SITE_TWILIGHT':
            return t.siteTwilight(
                num(p, 'count'),
                num(p, 'tw'),
                num(p, 'max')
            );
        default:
            return localizeGameTerms(issue.message, lang);
    }
}
