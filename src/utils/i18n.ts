import type { Ability, CardState } from "../game/types";

export type SupportedLanguage = 'fr' | 'en' | 'de' | 'it' | 'es';

export interface CardLocalizedContent {
    title: string;
    subtitle?: string;
    gameText?: string;
    loreText?: string;
}

export function getCardText(
    card: CardState,
    lang: SupportedLanguage = 'fr'
): CardLocalizedContent {
    const primary = card.i18n?.[lang];
    const fallback = card.i18n?.['en'];

    return {
        title: primary?.title || fallback?.title || '',
        subtitle: primary?.subtitle || fallback?.subtitle,
        gameText: primary?.gameText || fallback?.gameText,
        loreText: primary?.loreText || fallback?.loreText,
    };
}

/** Découpe un gametext en clauses (phrases / lignes), sans vides. */
function splitGameTextClauses(gameText: string): string[] {
    return gameText
        .replace(/\r/g, '')
        .split(/\n+|(?<=[.!?…])\s+(?=[A-ZÀ-Ÿ**])/)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

function normalizeClauseForMatch(text: string): string {
    return text
        .replace(/\*\*/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[’']/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Aligne `ability.text` (EN parseur) sur une ou plusieurs phrases du gametext EN
 * (ex. « spot a minion. That minion is fierce… »), puis reprend le même
 * intervalle dans la langue demandée.
 */
function matchingLocalizedClause(
    abilityText: string,
    source: CardState,
    lang: SupportedLanguage
): string | undefined {
    const enFull = source.i18n?.en?.gameText?.trim();
    const localizedFull =
        source.i18n?.[lang]?.gameText?.trim() ||
        (lang !== 'en' ? source.i18n?.en?.gameText?.trim() : undefined);
    if (!enFull || !localizedFull) return undefined;

    const needle = normalizeClauseForMatch(abilityText).replace(/\.+$/, '');
    if (!needle) return undefined;

    const enClauses = splitGameTextClauses(enFull);
    const locClauses = splitGameTextClauses(localizedFull);
    if (enClauses.length === 0 || locClauses.length === 0) return undefined;

    // Préférer le plus long empan exact (plusieurs phrases = condition + effet).
    let best: { start: number; end: number; len: number } | null = null;
    for (let start = 0; start < enClauses.length; start++) {
        let combined = '';
        for (let end = start; end < enClauses.length; end++) {
            combined = combined
                ? `${combined} ${enClauses[end]}`
                : enClauses[end]!;
            const norm = normalizeClauseForMatch(combined).replace(/\.+$/, '');
            if (norm === needle || needle === norm) {
                const len = end - start + 1;
                if (!best || len > best.len) {
                    best = { start, end, len };
                }
            }
        }
    }

    if (!best) {
        // Repli : une seule phrase qui contient tout le needle (pas l’inverse).
        const index = enClauses.findIndex((clause) => {
            const norm = normalizeClauseForMatch(clause).replace(/\.+$/, '');
            return norm === needle || norm.includes(needle);
        });
        if (index < 0) return undefined;
        best = { start: index, end: index, len: 1 };
    }

    const { start, end } = best;
    if (end < locClauses.length) {
        return locClauses.slice(start, end + 1).join(' ');
    }
    return enClauses.slice(start, end + 1).join(' ');
}

/**
 * Clause affichée dans un toaster (site / réponse / when-played…).
 * Priorité : textFr collé à l’ability → phrase alignée du gametext localisé
 * → text EN parseur → gametext entier.
 */
export function getAbilityToastClause(
    ability: Ability | undefined | null,
    source: CardState | undefined | null,
    lang: SupportedLanguage = 'fr'
): string | undefined {
    // textFr = collage FR parseur : uniquement si on affiche en français.
    if (lang === 'fr') {
        const textFr = ability?.textFr?.trim();
        if (textFr) return textFr;
    }

    const textEn = ability?.text?.trim();
    if (textEn && source) {
        const matched = matchingLocalizedClause(textEn, source, lang);
        if (matched) return matched;
    }

    if (textEn) return textEn;

    if (source) {
        return getCardText(source, lang).gameText?.trim() || undefined;
    }
    return undefined;
}