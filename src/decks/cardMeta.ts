import { CARDS_DATABASE, getCardById } from '../game/cardsData';
import type { CardState } from '../game/types';
import { getCardChrome } from '../i18n/cardChrome';
import type { SupportedLanguage } from '../i18n/languages';
import { getKeywordLabel } from '../i18n/keywords';
import { DECK_BUILDER_MESSAGES } from '../i18n/ui/deckBuilder';
import { isLegalRingBearer, isOneRing } from './validateDeck';
import { isStandardSiteSet } from './formatRules';

/** Sites JSON : type/kind « SITE » hors union CardType stricte. */
export function isSiteCard(card: CardState): boolean {
    const raw = card as CardState & { type?: string; kind?: string };
    return raw.type === 'SITE' || raw.kind === 'SITE';
}

export function displayTitle(card: CardState | undefined, id?: string): string {
    if (!card) return id || '?';
    const siteName = (card as CardState & { name?: string }).name;
    return (
        card.i18n?.fr?.title ||
        card.i18n?.en?.title ||
        card.title ||
        siteName ||
        card.id ||
        id ||
        '?'
    );
}

export function displaySubtitle(card: CardState | undefined): string {
    if (!card) return '';
    return card.i18n?.fr?.subtitle || card.i18n?.en?.subtitle || card.subtitle || '';
}

/** Titre complet journal / listes : « Aragorn, Poussé par le besoin ». */
export function displayFullName(card: CardState | undefined, id?: string): string {
    const title = displayTitle(card, id);
    const sub = displaySubtitle(card);
    return sub ? `${title}, ${sub}` : title;
}

/** Id catalogue pour lookup (hover, base), pas l’instance plateau. */
export function catalogCardId(card: CardState | undefined): string {
    if (!card) return '';
    return String(card.printedId || card.id || '');
}

export type CatalogFilterKey =
    | 'camp'
    | 'type'
    | 'culture'
    | 'race'
    | 'subtype'
    | 'keyword';

export type CatalogFilter = {
    id: string;
    key: CatalogFilterKey;
    value: string;
    label: string;
};

/** Camp = famille de cartes pour le catalogue (pas une abréviation UI). */
export type CatalogCamp =
    | 'FREE_PEOPLE'
    | 'SHADOW'
    | 'SITE'
    | 'RING'
    | 'RING_BEARER';

export const CATALOG_CAMP_OPTIONS: { value: CatalogCamp; label: string }[] = [
    { value: 'FREE_PEOPLE', label: 'Peuples Libres' },
    { value: 'SHADOW', label: 'Ombre' },
    { value: 'SITE', label: "Paquet d'aventure" },
    { value: 'RING_BEARER', label: 'Porteurs' },
    { value: 'RING', label: 'Anneaux' },
];

export function labelForFilterValue(
    key: CatalogFilterKey,
    value: string,
    lang: SupportedLanguage = 'fr'
): string {
    const chrome = getCardChrome(lang);
    const db = DECK_BUILDER_MESSAGES[lang];
    if (key === 'camp') {
        return db.camp[value as CatalogCamp] || value;
    }
    if (key === 'type') {
        return chrome.type(value) || value;
    }
    if (key === 'culture') {
        return chrome.culture(value) || value;
    }
    if (key === 'race') {
        return chrome.race(value) || value;
    }
    if (key === 'subtype') {
        return chrome.subtype(value) || value;
    }
    if (key === 'keyword') {
        return getKeywordLabel(value, lang);
    }
    return value;
}

export function filterDimensionLabel(
    key: CatalogFilterKey,
    lang: SupportedLanguage = 'fr'
): string {
    return DECK_BUILDER_MESSAGES[lang].filterDim[key];
}

function matchesCamp(card: CardState, camp: CatalogCamp): boolean {
    if (camp === 'SITE') {
        return isSiteCard(card) && isStandardSiteSet(Number(card.set) || 0);
    }
    if (camp === 'RING') return isOneRing(card);
    if (camp === 'RING_BEARER') return isLegalRingBearer(card);
    if (camp === 'FREE_PEOPLE') {
        if (isSiteCard(card) || card.type === 'RING') return false;
        return card.kind !== 'SHADOW';
    }
    if (camp === 'SHADOW') {
        if (isSiteCard(card) || card.type === 'RING') return false;
        return card.kind !== 'FREE_PEOPLE';
    }
    return true;
}

export function catalogCards(opts: {
    query: string;
    filters: CatalogFilter[];
}): CardState[] {
    const q = opts.query.trim().toLowerCase();
    return CARDS_DATABASE.filter((card) => {
        for (const f of opts.filters) {
            if (f.key === 'camp') {
                if (!matchesCamp(card, f.value as CatalogCamp)) return false;
            } else if (f.key === 'type') {
                if (f.value === 'SITE') {
                    if (!isSiteCard(card)) return false;
                } else if (card.type !== f.value) {
                    return false;
                }
            } else if (f.key === 'culture') {
                if (card.culture !== f.value) return false;
            } else if (f.key === 'race') {
                if (card.race !== f.value) return false;
            } else if (f.key === 'subtype') {
                if (card.subtype !== f.value) return false;
            } else if (f.key === 'keyword') {
                if (!card.keywords?.includes(f.value as never)) return false;
            }
        }
        if (!q) return true;
        const title = displayTitle(card).toLowerCase();
        const sub = displaySubtitle(card).toLowerCase();
        return (
            title.includes(q) ||
            sub.includes(q) ||
            card.id.toLowerCase().includes(q)
        );
    }).sort((a, b) => displayTitle(a).localeCompare(displayTitle(b), 'fr'));
}

/** Valeurs distinctes présentes dans la base (pour peupler les listes). */
export function collectFilterOptions(
    key: CatalogFilterKey,
    lang: SupportedLanguage = 'fr'
): string[] {
    const set = new Set<string>();
    for (const card of CARDS_DATABASE) {
        if (key === 'camp') continue;
        if (key === 'type') {
            if (isSiteCard(card)) set.add('SITE');
            else if (card.type) set.add(card.type);
        } else if (key === 'culture' && card.culture) {
            set.add(card.culture);
        } else if (key === 'race' && card.race) {
            set.add(card.race);
        } else if (key === 'subtype' && card.subtype) {
            set.add(card.subtype);
        } else if (key === 'keyword') {
            for (const kw of card.keywords || []) set.add(kw);
        }
    }
    return [...set].sort((a, b) =>
        labelForFilterValue(key, a, lang).localeCompare(
            labelForFilterValue(key, b, lang),
            lang
        )
    );
}

export function countIds(ids: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const id of ids) {
        map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
}

export function cardOrThrow(id: string): CardState | undefined {
    return getCardById(id);
}

export type AddTarget =
    | 'freePeople'
    | 'shadow'
    | 'siteIds'
    | 'startingCompanionIds'
    | 'ringBearerId'
    | 'oneRingId';

export function addTargetLabel(target: AddTarget): string {
    switch (target) {
        case 'freePeople':
            return 'Pioche Peuples Libres';
        case 'shadow':
            return 'Pioche Ombre';
        case 'siteIds':
            return "Paquet d'aventure";
        case 'startingCompanionIds':
            return 'Compagnie de départ';
        case 'ringBearerId':
            return 'Porteur';
        case 'oneRingId':
            return 'Anneau Unique';
    }
}

/** Camp catalogue suggéré quand on choisit une zone d’ajout. */
export function campForAddTarget(target: AddTarget): CatalogCamp {
    switch (target) {
        case 'shadow':
            return 'SHADOW';
        case 'siteIds':
            return 'SITE';
        case 'ringBearerId':
            return 'RING_BEARER';
        case 'oneRingId':
            return 'RING';
        case 'freePeople':
        case 'startingCompanionIds':
            return 'FREE_PEOPLE';
    }
}
